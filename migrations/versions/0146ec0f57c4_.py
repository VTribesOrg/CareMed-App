"""empty message

Revision ID: 0146ec0f57c4
Revises: 923398239d75, add_collection_notes_to_rental_invoice
Create Date: 2026-11-14 22:01:25.257862

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0146ec0f57c4'
down_revision = ('923398239d75', 'add_collection_notes_to_rental_invoice')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
