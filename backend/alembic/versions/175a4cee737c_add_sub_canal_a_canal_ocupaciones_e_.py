"""add sub_canal a canal_ocupaciones e invitado_sesiones

Revision ID: 175a4cee737c
Revises: 0001_initial
Create Date: 2026-09-07 18:03:59.168975

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '175a4cee737c'
down_revision = '0001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('canal_ocupaciones', schema=None) as batch_op:
        batch_op.add_column(sa.Column('sub_canal', sa.String(length=10), nullable=True))

    with op.batch_alter_table('invitado_sesiones', schema=None) as batch_op:
        batch_op.add_column(sa.Column('sub_canal', sa.String(length=10), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('invitado_sesiones', schema=None) as batch_op:
        batch_op.drop_column('sub_canal')

    with op.batch_alter_table('canal_ocupaciones', schema=None) as batch_op:
        batch_op.drop_column('sub_canal')
