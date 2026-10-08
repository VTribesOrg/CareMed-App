"""Add contact_number and address to users

Revision ID: 7c1d9a2b4e55
Revises: f85a9e78bf66
Create Date: 2026-10-09

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7c1d9a2b4e55'
down_revision = 'f85a9e78bf66'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('contact_number', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('address', sa.String(length=255), nullable=True))


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('address')
        batch_op.drop_column('contact_number')
