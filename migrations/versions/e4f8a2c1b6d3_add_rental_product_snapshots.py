"""Add rental product snapshots and allow permanent product deletion

Revision ID: e4f8a2c1b6d3
Revises: 0146ec0f57c4
Create Date: 2026-11-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'e4f8a2c1b6d3'
down_revision = '0146ec0f57c4'
branch_labels = None
depends_on = None


def _recreate_rental_product_fk(ondelete):
    """Drop the existing rental.product_id foreign key (whatever MySQL named it)
    and recreate it with the requested ON DELETE behavior."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    for fk in inspector.get_foreign_keys('rental'):
        if 'product_id' in (fk.get('column_names') or []):
            op.drop_constraint(fk['name'], 'rental', type_='foreignkey')
            op.create_foreign_key(
                None, 'rental', 'product',
                ['product_id'], ['id'],
                ondelete=ondelete,
            )
            break


def upgrade():
    # --- Product snapshot columns on Rental (order history survives product deletion) ---
    op.add_column('rental', sa.Column('product_name', sa.String(length=100), nullable=True))
    op.add_column('rental', sa.Column('product_type', sa.String(length=100), nullable=True))
    op.add_column('rental', sa.Column('product_asset_tag', sa.String(length=20), nullable=True))
    op.add_column('rental', sa.Column('product_condition', sa.String(length=50), nullable=True))
    op.add_column('rental', sa.Column('product_description', sa.Text(), nullable=True))
    op.add_column('rental', sa.Column('product_image', sa.String(length=255), nullable=True))
    op.add_column('rental', sa.Column('product_category', sa.String(length=50), nullable=True))

    # Allow rental rows to keep their history when the referenced product is removed.
    op.alter_column('rental', 'product_id',
               existing_type=sa.Integer(),
               nullable=True)
    _recreate_rental_product_fk('SET NULL')


def downgrade():
    # Restore the foreign key without ON DELETE SET NULL (best effort).
    try:
        _recreate_rental_product_fk(None)
    except Exception:
        pass

    op.alter_column('rental', 'product_id',
               existing_type=sa.Integer(),
               nullable=False)

    op.drop_column('rental', 'product_category')
    op.drop_column('rental', 'product_image')
    op.drop_column('rental', 'product_description')
    op.drop_column('rental', 'product_condition')
    op.drop_column('rental', 'product_asset_tag')
    op.drop_column('rental', 'product_type')
    op.drop_column('rental', 'product_name')
