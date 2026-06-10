"""Ejecución programática de migraciones Alembic.

Se invoca al arrancar la aplicación para garantizar que el esquema está al día
tanto en desarrollo (SQLite) como en producción (PostgreSQL), sin depender de
pasos manuales ni de comandos específicos del contenedor.
"""
import logging
from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory

from app.database.db import engine

logger = logging.getLogger(__name__)

# .../backend/app/database/migrations.py -> parents[2] == .../backend
BACKEND_DIR = Path(__file__).resolve().parents[2]
ALEMBIC_INI = BACKEND_DIR / "alembic.ini"
ALEMBIC_DIR = BACKEND_DIR / "alembic"


def get_alembic_config() -> Config:
    cfg = Config(str(ALEMBIC_INI))
    cfg.set_main_option("script_location", str(ALEMBIC_DIR))
    # La URL real la resuelve env.py desde app.config.settings
    return cfg


def run_migrations() -> None:
    """Aplicar todas las migraciones pendientes (alembic upgrade head)."""
    cfg = get_alembic_config()
    command.upgrade(cfg, "head")
    logger.info("✅ Migraciones de base de datos aplicadas (alembic upgrade head)")


def get_migration_state() -> dict:
    """Devolver la revisión actual de la BD y la cabeza (head) del repositorio."""
    cfg = get_alembic_config()
    script = ScriptDirectory.from_config(cfg)
    head = script.get_current_head()
    with engine.connect() as connection:
        current = MigrationContext.configure(connection).get_current_revision()
    return {
        "current": current,
        "head": head,
        "up_to_date": current == head,
    }
