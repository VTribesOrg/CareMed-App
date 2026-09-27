"""Add per-branch Messenger ordering link

Revision ID: d4f8a1c7b9e2
Revises: 986af29a58ae
Create Date: 2026-09-26 10:12:44.318072

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd4f8a1c7b9e2'
down_revision = '986af29a58ae'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('branches', schema=None) as batch_op:
        batch_op.add_column(sa.Column('messenger_url', sa.String(length=255), nullable=True))
        batch_op.create_index(batch_op.f('ix_branches_messenger_url'), ['messenger_url'], unique=False)


def downgrade():
    with op.batch_alter_table('branches', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_branches_messenger_url'))
        batch_op.drop_column('messenger_url')
