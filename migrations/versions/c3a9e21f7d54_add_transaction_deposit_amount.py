"""add missing transaction.deposit_amount column

Revision ID: c3a9e21f7d54
Revises: b7f1c2d9e4a1
Create Date: 2026-09-23 00:05:00.000000

The ``deposit_amount`` column is declared on the ``Transaction`` model and
was part of the earlier ``84cb0ad52ee2`` migration, but is absent from some
databases (the revision was stamped without the DDL running). This migration
reconciles the drift idempotently: if the column is already present it does
nothing.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = 'c3a9e21f7d54'
down_revision = 'b7f1c2d9e4a1'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)

    if "transaction" not in set(inspector.get_table_names()):
        return

    columns = {c["name"] for c in inspector.get_columns("transaction")}
    if "deposit_amount" not in columns:
        # server_default backfills existing rows and satisfies the model's
        # non-nullable declaration.
        op.add_column(
            "transaction",
            sa.Column(
                "deposit_amount",
                sa.Numeric(precision=10, scale=2),
                nullable=False,
                server_default="0.00",
            ),
        )


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)

    if "transaction" not in set(inspector.get_table_names()):
        return

    columns = {c["name"] for c in inspector.get_columns("transaction")}
    if "deposit_amount" in columns:
        op.drop_column("transaction", "deposit_amount")