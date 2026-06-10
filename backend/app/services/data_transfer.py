"""Export/import lógico de la base de datos (agnóstico al motor).

Reemplaza el antiguo backup por copia del fichero `.db` de SQLite, que era
incompatible con PostgreSQL. Aquí los datos se serializan tabla a tabla en JSON
usando los metadatos de SQLAlchemy (`Base.metadata.sorted_tables`, en orden
seguro de claves foráneas), de modo que el mismo formato sirve para:

- Backup/restore desde el panel de administración.
- Backups automáticos del scheduler.
- Migración inicial de datos SQLite -> PostgreSQL.

En PostgreSQL, tras importar IDs explícitos se reinician las secuencias de las
claves primarias serial (paso que en SQLite no es necesario).
"""
import base64
import datetime as dt
import json
import logging
from pathlib import Path
from typing import Any

from sqlalchemy import Date, DateTime, LargeBinary, Time, select, text
from sqlalchemy.orm import Session

from app.config import settings
from app.database.db import Base

# Importar TODOS los modelos para poblar Base.metadata
from app.models import (  # noqa: F401
    usuario, club, socio, miembro_club, evento, noticia, votacion, invitacion,
    token_google, asistencia, comentario, instalacion, documentacion_reglamentaria,
    system_config, producto, alerta, tareas_comunitarias, canal, invitado,
)
from app.agent import models as agent_models  # noqa: F401

logger = logging.getLogger(__name__)

EXPORT_VERSION = 1
BACKUP_EXT = ".json"
BACKUP_PREFIX = "piar_backup_"
SAFETY_PREFIX = "piar_before_restore_"


# ----------------------------------------------------------------------------
# Directorio de backups
# ----------------------------------------------------------------------------
def get_backups_dir() -> Path:
    d = Path(settings.backup_folder)
    d.mkdir(parents=True, exist_ok=True)
    return d


def list_backup_files() -> list[Path]:
    """Backups de usuario (excluye los de seguridad pre-restore)."""
    d = get_backups_dir()
    return sorted(
        d.glob(f"{BACKUP_PREFIX}*{BACKUP_EXT}"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )


# ----------------------------------------------------------------------------
# Serialización
# ----------------------------------------------------------------------------
def _serialize_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (dt.datetime, dt.date, dt.time)):
        return value.isoformat()
    if isinstance(value, bytes):
        return {"__bytes__": base64.b64encode(value).decode("ascii")}
    # int, float, str, bool, dict, list (columnas JSON) -> ya son JSON-safe
    return value


def _deserialize_row(table, row: dict) -> dict:
    out: dict[str, Any] = {}
    for col in table.columns:
        if col.name not in row:
            continue
        val = row[col.name]
        if val is None:
            out[col.name] = None
        elif isinstance(col.type, DateTime):
            out[col.name] = dt.datetime.fromisoformat(val) if isinstance(val, str) else val
        elif isinstance(col.type, Date):
            out[col.name] = dt.date.fromisoformat(val) if isinstance(val, str) else val
        elif isinstance(col.type, Time):
            out[col.name] = dt.time.fromisoformat(val) if isinstance(val, str) else val
        elif isinstance(col.type, LargeBinary):
            if isinstance(val, dict) and "__bytes__" in val:
                out[col.name] = base64.b64decode(val["__bytes__"])
            else:
                out[col.name] = val
        else:
            out[col.name] = val
    return out


# ----------------------------------------------------------------------------
# Export
# ----------------------------------------------------------------------------
def export_to_dict(db: Session) -> dict:
    """Serializar todas las tablas a un dict JSON-safe."""
    tables = {}
    total_rows = 0
    for table in Base.metadata.sorted_tables:
        rows = []
        for row in db.execute(select(table)).mappings():
            rows.append({k: _serialize_value(v) for k, v in row.items()})
        tables[table.name] = rows
        total_rows += len(rows)
    return {
        "version": EXPORT_VERSION,
        "exported_at": dt.datetime.utcnow().isoformat(),
        "dialect": db.bind.dialect.name if db.bind is not None else None,
        "total_rows": total_rows,
        "tables": tables,
    }


def create_backup_file(db: Session, prefix: str = BACKUP_PREFIX) -> Path:
    """Generar un fichero de backup JSON y devolver su ruta."""
    payload = export_to_dict(db)
    timestamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    path = get_backups_dir() / f"{prefix}{timestamp}{BACKUP_EXT}"
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    return path


# ----------------------------------------------------------------------------
# Import
# ----------------------------------------------------------------------------
def validate_payload(payload: Any) -> dict:
    """Validar y normalizar el payload importado. Devuelve siempre {'tables': {...}}."""
    if not isinstance(payload, dict):
        raise ValueError("El backup no tiene un formato válido (se esperaba un objeto JSON)")
    tables = payload.get("tables", payload)
    if not isinstance(tables, dict):
        raise ValueError("El backup no contiene la sección 'tables'")
    return payload


def import_from_dict(db: Session, payload: dict, wipe: bool = True) -> dict[str, int]:
    """Importar datos. Si wipe=True vacía las tablas antes de insertar.

    Conserva los IDs originales y, en PostgreSQL, reinicia las secuencias.
    """
    payload = validate_payload(payload)
    data = payload.get("tables", payload)
    sorted_tables = Base.metadata.sorted_tables
    counts: dict[str, int] = {}
    is_postgres = db.bind is not None and db.bind.dialect.name == "postgresql"

    # En PostgreSQL desactivamos la comprobación de FKs/triggers durante la carga
    # masiva: los datos pueden provenir de SQLite (que no fuerza claves foráneas) y
    # contener referencias huérfanas. Replicamos los datos tal cual, igual que
    # pg_restore. SET LOCAL se revierte automáticamente al hacer commit, por lo que
    # es seguro con conexiones reutilizadas del pool. Requiere rol superusuario.
    if is_postgres:
        db.execute(text("SET LOCAL session_replication_role = replica"))

    if wipe:
        for table in reversed(sorted_tables):
            db.execute(table.delete())

    for table in sorted_tables:
        rows = data.get(table.name) or []
        if rows:
            cleaned = [_deserialize_row(table, r) for r in rows]
            db.execute(table.insert(), cleaned)
        counts[table.name] = len(rows)

    db.commit()

    if db.bind is not None and db.bind.dialect.name == "postgresql":
        _reset_postgres_sequences(db, sorted_tables)

    return counts


def restore_from_file(db: Session, path: Path, wipe: bool = True) -> dict[str, int]:
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    return import_from_dict(db, payload, wipe=wipe)


def _reset_postgres_sequences(db: Session, tables) -> None:
    """Reiniciar las secuencias serial tras importar IDs explícitos."""
    for table in tables:
        pk_cols = list(table.primary_key.columns)
        if len(pk_cols) != 1:
            continue
        pk = pk_cols[0].name
        seq = db.execute(
            text("SELECT pg_get_serial_sequence(:t, :c)"),
            {"t": table.name, "c": pk},
        ).scalar()
        if not seq:
            continue
        db.execute(
            text(
                f'SELECT setval(:seq, '
                f'COALESCE((SELECT MAX("{pk}") FROM "{table.name}"), 1), '
                f'(SELECT MAX("{pk}") FROM "{table.name}") IS NOT NULL)'
            ),
            {"seq": seq},
        )
    db.commit()


def cleanup_old_backups(max_files: int) -> int:
    """Eliminar backups antiguos conservando solo los `max_files` más recientes."""
    removed = 0
    for old in list_backup_files()[max_files:]:
        try:
            old.unlink()
            removed += 1
        except OSError as e:
            logger.error(f"No se pudo eliminar backup antiguo {old.name}: {e}")
    return removed
