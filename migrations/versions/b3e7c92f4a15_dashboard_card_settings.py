"""Per-branch admin dashboard card visibility

Stores only the cards a branch has switched off, so a branch with no rows
still sees the whole dashboard.

Revision ID: b3e7c92f4a15
Revises: d4f8a1c7b9e2
Create Date: 2026-09-26 14:32:10.514820

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b3e7c92f4a15'
down_revision = 'd4f8a1c7b9e2'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'dashboard_card_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('card_key', sa.String(length=40), nullable=False),
        sa.Column('is_visible', sa.Boolean(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ['branch_id'],
            ['branches.id'],
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('branch_id', 'card_key',
                            name='uq_dashboard_card_branch_key'),
    )
    op.create_index(
        op.f('ix_dashboard_card_settings_branch_id'),
        'dashboard_card_settings',
        ['branch_id'],
        unique=False,
    )


def downgrade():
    op.drop_index(
        op.f('ix_dashboard_card_settings_branch_id'),
        table_name='dashboard_card_settings',
    )
    op.drop_table('dashboard_card_settings')
