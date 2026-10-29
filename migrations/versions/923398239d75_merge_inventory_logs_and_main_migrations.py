"""merge inventory logs and main migrations

Revision ID: 923398239d75
Revises: 7c1d9a2b4e55, add_customer_name_to_inventory_logs
Create Date: 2026-10-29 19:10:29.312127

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '923398239d75'
down_revision = ('7c1d9a2b4e55', 'add_customer_name_to_inventory_logs')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
