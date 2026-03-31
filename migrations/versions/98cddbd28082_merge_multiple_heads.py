"""merge multiple heads

Revision ID: 98cddbd28082
Revises: 706d06f8742e, a136888cea05
Create Date: 2026-03-30 13:13:22.139259

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '98cddbd28082'
down_revision = ('706d06f8742e', 'a136888cea05')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
