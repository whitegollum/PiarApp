#!/usr/bin/env python
"""Migración única de datos SQLite -> PostgreSQL.

Reutiliza el export/import lógico de app.services.data_transfer, de modo que el
formato es idéntico al de los backups del panel de administración.

Uso típico (en el entorno ya configurado para PostgreSQL, es decir, con
DATABASE_URL apuntando a Postgres):

    cd backend
    DATABASE_URL="postgresql+psycopg2://user:pass@localhost:5432/piar" \
        python scripts/migrate_sqlite_to_postgres.py --source sqlite:///./data/piar.db

Pasos que realiza:
  1. Aplica las migraciones de Alembic al destino (crea el esquema + alembic_version).
  2. Exporta todos los datos del origen (SQLite).
  3. Importa en el destino (vaciando antes) y reinicia las secuencias de Postgres.
  4. Muestra el conteo de filas por tabla (origen vs destino) para validar.
"""
import argparse
import os
import sys

# Permitir ejecutar desde backend/ con `python scripts/...`
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database.db import Base
from app.database.migrations import run_migrations
from app.services import data_transfer


def _make_engine(url: str):
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False})
    return create_engine(url, pool_pre_ping=True)


def _row_counts(session: Session) -> dict:
    counts = {}
    for table in Base.metadata.sorted_tables:
        counts[table.name] = session.execute(
            select(func.count()).select_from(table)
        ).scalar_one()
    return counts


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrar datos SQLite -> PostgreSQL")
    parser.add_argument(
        "--source",
        default="sqlite:///./data/piar.db",
        help="URL de la base de datos origen (SQLite)",
    )
    parser.add_argument(
        "--target",
        default=settings.database_url,
        help="URL de la base de datos destino (por defecto, DATABASE_URL de la app)",
    )
    parser.add_argument(
        "--no-wipe",
        action="store_true",
        help="No vaciar las tablas destino antes de importar",
    )
    args = parser.parse_args()

    source_url = args.source
    target_url = args.target

    print(f"Origen  : {source_url}")
    print(f"Destino : {target_url}")

    if source_url == target_url:
        print("ERROR: origen y destino son la misma base de datos.", file=sys.stderr)
        return 1
    if target_url.startswith("sqlite"):
        print("AVISO: el destino es SQLite (no PostgreSQL). Continúo de todos modos.")

    # 1. Asegurar esquema en destino (Alembic). run_migrations usa settings.database_url,
    #    por lo que el destino debe coincidir con DATABASE_URL del entorno.
    if target_url == settings.database_url:
        print("\n[1/4] Aplicando migraciones de Alembic al destino...")
        run_migrations()
    else:
        print("\n[1/4] Asegurando esquema en destino (create_all)...")
        target_engine_tmp = _make_engine(target_url)
        Base.metadata.create_all(bind=target_engine_tmp)
        target_engine_tmp.dispose()

    # 2. Exportar desde el origen
    print("[2/4] Exportando datos del origen...")
    source_engine = _make_engine(source_url)
    with Session(source_engine) as src:
        payload = data_transfer.export_to_dict(src)
        source_counts = _row_counts(src)
    source_engine.dispose()
    print(f"      {payload['total_rows']} filas exportadas.")

    # 3. Importar en el destino
    print("[3/4] Importando datos en el destino...")
    target_engine = _make_engine(target_url)
    with Session(target_engine) as tgt:
        data_transfer.import_from_dict(tgt, payload, wipe=not args.no_wipe)
        target_counts = _row_counts(tgt)
    target_engine.dispose()

    # 4. Validar
    print("[4/4] Validación de conteos (tabla: origen -> destino):")
    ok = True
    for table in Base.metadata.sorted_tables:
        s = source_counts.get(table.name, 0)
        t = target_counts.get(table.name, 0)
        marca = "OK" if s == t else "DIFERENCIA"
        if s != t:
            ok = False
        if s or t:
            print(f"   - {table.name}: {s} -> {t}  [{marca}]")

    print("\n[OK] Migración completada." if ok else "\n[AVISO] Migración completada CON DIFERENCIAS. Revisa el detalle.")
    return 0 if ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
