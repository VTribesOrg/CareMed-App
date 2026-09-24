"""add multi-branch isolation (branches table + branch_id columns)

Revision ID: b7f1c2d9e4a1
Revises: 84cb0ad52ee2
Create Date: 2026-09-22 21:00:00.000000

This migration introduces the multi-branch / multi-tenant layer:

* Creates the ``branches`` table holding each location's identity, contact
  details and per-branch branding/content.
* Adds a nullable ``branch_id`` foreign key (to ``branches.id``) on every
  operational table so records can be isolated per branch.

All columns are nullable so the migration is backwards compatible: existing
rows simply have ``branch_id = NULL`` until they are assigned to a branch.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = 'b7f1c2d9e4a1'
down_revision = '84cb0ad52ee2'
branch_labels = None
depends_on = None


# Every table that becomes branch-aware.
BRANCH_SCOPED_TABLES = [
    "users",
    "customer",
    "product",
    "purchase",
    "transaction",
    "payments",
    "customer_deposit",
    "rental",
    "rental_invoice",
    "inventory_logs",
    "expenses",
]


def upgrade():
    # MySQL performs non-transactional DDL, so a failed run can leave the
    # schema partially migrated. Every step below is guarded by an inspector
    # check to make the migration safe to re-run after a partial failure.
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())

    # ── 1. Create the branches table (if missing) ───────────────────────
    if "branches" not in existing_tables:
        op.create_table(
            "branches",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("branch_name", sa.String(length=120), nullable=False),
            sa.Column("location_code", sa.String(length=40), nullable=False),
            sa.Column("address", sa.Text(), nullable=True),
            sa.Column("contact_number", sa.String(length=50), nullable=True),
            sa.Column("email", sa.String(length=120), nullable=True),
            sa.Column("theme_color", sa.String(length=20), nullable=False,
                      server_default="#002347"),
            sa.Column("accent_color", sa.String(length=20), nullable=False,
                      server_default="#52B788"),
            sa.Column("brand_name", sa.String(length=120), nullable=True),
            sa.Column("brand_logo", sa.String(length=255), nullable=True),
            sa.Column("tagline", sa.String(length=255), nullable=True),
            sa.Column("hero_title", sa.String(length=255), nullable=True),
            sa.Column("hero_subtitle", sa.Text(), nullable=True),
            sa.Column("announcement", sa.Text(), nullable=True),
            sa.Column("footer_text", sa.String(length=255), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        existing_tables.add("branches")

    branch_indexes = {ix["name"] for ix in inspector.get_indexes("branches")}
    if "ix_branches_location_code" not in branch_indexes:
        op.create_index("ix_branches_location_code", "branches", ["location_code"], unique=True)
    if "ix_branches_is_active" not in branch_indexes:
        op.create_index("ix_branches_is_active", "branches", ["is_active"], unique=False)

    # ── 2. Add branch_id to every operational table (if missing) ────────
    for table in BRANCH_SCOPED_TABLES:
        if table not in existing_tables:
            continue

        column_map = {c["name"]: c for c in inspector.get_columns(table)}
        if "branch_id" not in column_map:
            op.add_column(table, sa.Column("branch_id", sa.Integer(), nullable=True))
        elif not column_map["branch_id"]["nullable"]:
            # A pre-existing NOT NULL branch_id would make the FK below fail
            # with MySQL errno 150 (ON DELETE SET NULL needs a nullable column)
            # and would contradict the model, which declares branch_id nullable.
            op.alter_column(
                table, "branch_id", existing_type=sa.Integer(), nullable=True
            )

        indexes = {ix["name"] for ix in inspector.get_indexes(table)}
        if f"ix_{table}_branch_id" not in indexes:
            op.create_index(f"ix_{table}_branch_id", table, ["branch_id"], unique=False)

        fks = {fk["name"] for fk in inspector.get_foreign_keys(table)}
        if f"fk_{table}_branch_id_branches" not in fks:
            # Any pre-existing branch_id value that does not reference a real
            # branch would block FK creation (MySQL errno 1452). Clear those
            # orphans so the constraint can be attached safely.
            op.execute(
                sa.text(
                    f"UPDATE `{table}` SET branch_id = NULL "
                    f"WHERE branch_id IS NOT NULL "
                    f"AND branch_id NOT IN (SELECT id FROM branches)"
                )
            )
            op.create_foreign_key(
                f"fk_{table}_branch_id_branches",
                table,
                "branches",
                ["branch_id"],
                ["id"],
                ondelete="SET NULL",
            )


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())

    # ── 1. Drop branch_id from every operational table ──────────────────
    for table in BRANCH_SCOPED_TABLES:
        if table not in existing_tables:
            continue

        columns = {c["name"] for c in inspector.get_columns(table)}
        if "branch_id" not in columns:
            continue

        fks = {fk["name"] for fk in inspector.get_foreign_keys(table)}
        if f"fk_{table}_branch_id_branches" in fks:
            op.drop_constraint(f"fk_{table}_branch_id_branches", table, type_="foreignkey")

        indexes = {ix["name"] for ix in inspector.get_indexes(table)}
        if f"ix_{table}_branch_id" in indexes:
            op.drop_index(f"ix_{table}_branch_id", table_name=table)

        op.drop_column(table, "branch_id")

    # ── 2. Drop the branches table ──────────────────────────────────────
    if "branches" in existing_tables:
        branch_indexes = {ix["name"] for ix in inspector.get_indexes("branches")}
        if "ix_branches_is_active" in branch_indexes:
            op.drop_index("ix_branches_is_active", table_name="branches")
        if "ix_branches_location_code" in branch_indexes:
            op.drop_index("ix_branches_location_code", table_name="branches")
        op.drop_table("branches")
