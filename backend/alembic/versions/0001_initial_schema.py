"""esquema inicial (baseline desde los modelos)

Esta migración baseline crea el esquema completo a partir de Base.metadata
(todos los modelos están importados por env.py antes de ejecutar las migraciones).
Usa create_all con checkfirst=True, por lo que es idempotente: sobre una base de
datos que ya tenga las tablas (p.ej. una SQLite de desarrollo existente) no falla
y basta con `alembic stamp 0001_initial` para marcarla como migrada.

A partir de aquí, las nuevas migraciones se generan con:
    alembic revision --autogenerate -m "descripcion"

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-10
"""
from alembic import op

from app.database.db import Base

# revision identifiers, used by Alembic.
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
