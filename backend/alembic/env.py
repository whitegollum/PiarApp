"""Entorno de Alembic para PiarAPP.

- La URL se obtiene de app.config.settings (variable DATABASE_URL), de modo que
  las mismas migraciones sirven para SQLite (desarrollo) y PostgreSQL (producción).
- render_as_batch se activa con SQLite para que los ALTER autogenerados funcionen
  (SQLite no soporta ALTER TABLE completo y Alembic lo emula con batch mode).
"""
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

from app.config import settings
from app.database.db import Base

# Importar TODOS los modelos para poblar Base.metadata (necesario para autogenerate)
from app.models import (  # noqa: F401
    usuario, club, socio, miembro_club, evento, noticia, votacion, invitacion,
    token_google, asistencia, comentario, instalacion, documentacion_reglamentaria,
    system_config, producto, alerta, tareas_comunitarias, canal, invitado,
)
from app.agent import models as agent_models  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Forzar la URL real de la aplicación
config.set_main_option("sqlalchemy.url", settings.database_url)

target_metadata = Base.metadata


def _is_sqlite(url: str) -> bool:
    return url.startswith("sqlite")


def run_migrations_offline() -> None:
    url = settings.database_url
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=_is_sqlite(url),
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        is_sqlite = connection.dialect.name == "sqlite"
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=is_sqlite,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
