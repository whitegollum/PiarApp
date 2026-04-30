"""
Script para migrar el esquema de la base de datos al estado actual
sin perder datos existentes.

Uso:
    python scripts/migrate_schema.py [--dry-run] [--force]

Opciones:
    --dry-run: Muestra los cambios que se aplicarían sin ejecutarlos
    --force: Aplica las migraciones sin pedir confirmación
"""

import sys
import os
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Tuple
import argparse

# Fix para Windows: configurar stdout/stderr para UTF-8
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Agregar el directorio raíz al path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text, inspect, Column, MetaData
from sqlalchemy.engine import Engine
from app.config import settings
from app.database.db import Base

# Importar TODOS los modelos para que estén registrados en Base
from app.models.usuario import Usuario
from app.models.club import Club
from app.models.miembro_club import MiembroClub
from app.models.invitacion import Invitacion
from app.models.noticia import Noticia
from app.models.evento import Evento
from app.models.asistencia import AsistenciaEvento
from app.models.comentario import Comentario
from app.models.instalacion import ContrasenaInstalacion
from app.models.documentacion_reglamentaria import DocumentacionReglamentaria
from app.models.system_config import SystemConfig
from app.models.producto import ProductoAfiliacion
from app.models.socio import Socio
from app.models.votacion import Votacion
from app.models.token_google import TokenGoogle
from app.models.alerta import Alerta
from app.models.tareas_comunitarias import TareaComunitaria, ParticipanteTarea, PuntuacionUsuario, PeriodoPremios, Premio


class DatabaseMigrator:
    """Gestor de migraciones de esquema de base de datos"""
    
    def __init__(self, engine: Engine, dry_run: bool = False):
        self.engine = engine
        self.dry_run = dry_run
        self.inspector = inspect(engine)
        self.changes: List[str] = []
        self.is_sqlite = engine.dialect.name == "sqlite"
        
    def log(self, message: str, level: str = "INFO"):
        """Registrar mensaje"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
    
    def get_existing_tables(self) -> List[str]:
        """Obtener lista de tablas existentes en la BD"""
        return self.inspector.get_table_names()
    
    def get_existing_columns(self, table_name: str) -> Dict[str, Dict]:
        """Obtener columnas existentes de una tabla"""
        columns = {}
        for col in self.inspector.get_columns(table_name):
            columns[col['name']] = {
                'type': str(col['type']),
                'nullable': col.get('nullable', True),
                'default': col.get('default', None)
            }
        return columns
    
    def get_model_columns(self, table_name: str) -> Dict[str, Column]:
        """Obtener columnas esperadas de los modelos SQLAlchemy"""
        metadata = Base.metadata
        if table_name not in metadata.tables:
            return {}
        
        table = metadata.tables[table_name]
        return {col.name: col for col in table.columns}
    
    def compare_column_type(self, existing_type: str, model_col: Column) -> bool:
        """Comparar si los tipos de columna son compatibles"""
        existing_normalized = existing_type.upper().replace(' ', '')
        model_type = str(model_col.type).upper().replace(' ', '')
        
        # Normalizar tipos comunes de SQLite
        type_mappings = {
            'VARCHAR': 'TEXT',
            'INTEGER': 'INT',
            'REAL': 'FLOAT',
            'BOOLEAN': 'INT'
        }
        
        for old, new in type_mappings.items():
            existing_normalized = existing_normalized.replace(old, new)
            model_type = model_type.replace(old, new)
        
        # Remover longitudes para comparación básica
        existing_base = existing_normalized.split('(')[0]
        model_base = model_type.split('(')[0]
        
        return existing_base == model_base
    
    def create_migration_tracking_table(self):
        """Crear tabla para rastrear migraciones aplicadas"""
        with self.engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    migration_name TEXT NOT NULL,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    description TEXT
                )
            """))
        self.log("Tabla de migraciones creada/verificada")
    
    def record_migration(self, migration_name: str, description: str = ""):
        """Registrar una migración aplicada"""
        if self.dry_run:
            return
        
        with self.engine.begin() as conn:
            conn.execute(
                text("INSERT INTO schema_migrations (migration_name, description) VALUES (:name, :desc)"),
                {"name": migration_name, "desc": description}
            )
    
    def analyze_schema_differences(self) -> Dict[str, List[str]]:
        """Analizar diferencias entre esquema actual y modelos"""
        differences = {
            'missing_tables': [],
            'missing_columns': [],
            'type_mismatches': []
        }
        
        existing_tables = set(self.get_existing_tables())
        model_tables = set(Base.metadata.tables.keys())
        
        # Tablas faltantes
        for table_name in model_tables:
            if table_name not in existing_tables:
                differences['missing_tables'].append(table_name)
                self.log(f"Tabla faltante: {table_name}", "WARNING")
                continue
            
            # Columnas faltantes
            existing_cols = self.get_existing_columns(table_name)
            model_cols = self.get_model_columns(table_name)
            
            for col_name, col_obj in model_cols.items():
                if col_name not in existing_cols:
                    differences['missing_columns'].append((table_name, col_name, col_obj))
                    self.log(f"Columna faltante: {table_name}.{col_name}", "WARNING")
                else:
                    # Verificar tipos (advertencia solamente)
                    if not self.compare_column_type(existing_cols[col_name]['type'], col_obj):
                        differences['type_mismatches'].append(
                            (table_name, col_name, existing_cols[col_name]['type'], str(col_obj.type))
                        )
                        self.log(
                            f"Posible incompatibilidad de tipo en {table_name}.{col_name}: "
                            f"{existing_cols[col_name]['type']} vs {col_obj.type}",
                            "WARNING"
                        )
        
        return differences
    
    def generate_sql_for_missing_table(self, table_name: str) -> List[str]:
        """Generar SQL para crear una tabla faltante"""
        metadata = Base.metadata
        table = metadata.tables[table_name]
        
        # Para SQLite, usar el método create de SQLAlchemy
        if self.is_sqlite:
            return [f"-- Se creará la tabla {table_name} usando SQLAlchemy"]
        
        return []
    
    def generate_sql_for_missing_column(self, table_name: str, col_name: str, col_obj: Column) -> str:
        """Generar SQL para agregar una columna faltante"""
        col_type = str(col_obj.type)
        nullable = "NULL" if col_obj.nullable else "NOT NULL"
        
        # Manejar valores por defecto
        default_clause = ""
        if col_obj.default is not None:
            if hasattr(col_obj.default, 'arg'):
                default_value = col_obj.default.arg
                if isinstance(default_value, str):
                    default_clause = f" DEFAULT '{default_value}'"
                elif isinstance(default_value, bool):
                    default_clause = f" DEFAULT {1 if default_value else 0}"
                else:
                    default_clause = f" DEFAULT {default_value}"
        
        # SQLite tiene limitaciones con NOT NULL en ALTER TABLE
        if self.is_sqlite and not col_obj.nullable and not default_clause:
            self.log(
                f"Advertencia: SQLite no permite NOT NULL sin default en ALTER TABLE. "
                f"Se agregará {col_name} como NULL",
                "WARNING"
            )
            nullable = "NULL"
        
        return f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}{default_clause}"
    
    def apply_migrations(self, differences: Dict[str, List]):
        """Aplicar migraciones necesarias"""
        migration_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        with self.engine.begin() as conn:
            # Crear tablas faltantes
            if differences['missing_tables']:
                self.log(f"Creando {len(differences['missing_tables'])} tabla(s) faltante(s)...")
                for table_name in differences['missing_tables']:
                    if self.dry_run:
                        self.log(f"[DRY-RUN] Crearía tabla: {table_name}")
                    else:
                        table = Base.metadata.tables[table_name]
                        table.create(conn)
                        self.log(f"Tabla creada: {table_name}", "SUCCESS")
                        self.changes.append(f"Tabla creada: {table_name}")
            
            # Agregar columnas faltantes
            if differences['missing_columns']:
                self.log(f"Agregando {len(differences['missing_columns'])} columna(s) faltante(s)...")
                for table_name, col_name, col_obj in differences['missing_columns']:
                    sql = self.generate_sql_for_missing_column(table_name, col_name, col_obj)
                    
                    if self.dry_run:
                        self.log(f"[DRY-RUN] {sql}")
                    else:
                        try:
                            conn.execute(text(sql))
                            self.log(f"Columna agregada: {table_name}.{col_name}", "SUCCESS")
                            self.changes.append(f"Columna agregada: {table_name}.{col_name}")
                        except Exception as e:
                            self.log(f"Error al agregar {table_name}.{col_name}: {e}", "ERROR")
            
            # Aplicar migraciones SQL pendientes desde archivos
            self.apply_sql_migrations(conn)
        
        # Registrar migración
        if not self.dry_run and self.changes:
            migration_name = f"auto_migration_{migration_timestamp}"
            description = "; ".join(self.changes[:5])  # Primeros 5 cambios
            if len(self.changes) > 5:
                description += f" ... y {len(self.changes) - 5} cambios más"
            self.record_migration(migration_name, description)
    
    def apply_sql_migrations(self, conn):
        """Aplicar archivos de migración SQL pendientes"""
        migrations_dir = Path(__file__).parent.parent / "migrations"
        if not migrations_dir.exists():
            return
        
        # Obtener migraciones ya aplicadas
        result = conn.execute(text(
            "SELECT migration_name FROM schema_migrations WHERE migration_name LIKE '%.sql'"
        ))
        applied = {row[0] for row in result}
        
        # Buscar archivos SQL pendientes
        sql_files = sorted(migrations_dir.glob("*.sql"))
        
        for sql_file in sql_files:
            migration_name = sql_file.name
            
            if migration_name in applied:
                continue
            
            self.log(f"Aplicando migración SQL: {migration_name}")
            
            with open(sql_file, 'r', encoding='utf-8') as f:
                sql_content = f.read()
            
            # Dividir por sentencias (simplificado)
            statements = [s.strip() for s in sql_content.split(';') if s.strip()]
            
            had_errors = False
            for statement in statements:
                # Ignorar comentarios
                if statement.startswith('--'):
                    continue
                    
                if self.dry_run:
                    self.log(f"[DRY-RUN] {statement[:80]}...")
                else:
                    try:
                        conn.execute(text(statement))
                        self.log(f"Ejecutado: {statement[:50]}...", "SUCCESS")
                    except Exception as e:
                        error_msg = str(e).lower()
                        # Ignorar errores de "ya existe" - son esperados en re-ejecuciones
                        if 'already exists' in error_msg or 'duplicate column' in error_msg:
                            self.log(f"OK (ya existe): {statement[:50]}...", "INFO")
                        else:
                            self.log(f"Error: {e}", "ERROR")
                            had_errors = True
            
            if not self.dry_run and not had_errors:
                self.record_migration(migration_name, f"Migración SQL desde archivo {migration_name}")
                self.changes.append(f"Migración SQL aplicada: {migration_name}")
    
    def run(self):
        """Ejecutar proceso completo de migración"""
        self.log("=== Iniciando análisis de esquema de base de datos ===")
        self.log(f"Motor: {self.engine.dialect.name}")
        self.log(f"URL: {self.engine.url}")
        
        # Crear tabla de tracking
        self.create_migration_tracking_table()
        
        # Analizar diferencias
        self.log("\n=== Analizando diferencias de esquema ===")
        differences = self.analyze_schema_differences()
        
        # Resumen
        total_changes = (
            len(differences['missing_tables']) +
            len(differences['missing_columns']) +
            len(differences['type_mismatches'])
        )
        
        self.log(f"\n=== Resumen ===")
        self.log(f"Tablas faltantes: {len(differences['missing_tables'])}")
        self.log(f"Columnas faltantes: {len(differences['missing_columns'])}")
        self.log(f"Posibles incompatibilidades de tipo: {len(differences['type_mismatches'])}")
        
        if total_changes == 0:
            self.log("\n✓ El esquema está actualizado. No se requieren migraciones.", "SUCCESS")
            return True
        
        # Aplicar migraciones
        if self.dry_run:
            self.log("\n=== Modo DRY-RUN: No se aplicarán cambios ===", "INFO")
        else:
            self.log("\n=== Aplicando migraciones ===")
        
        self.apply_migrations(differences)
        
        if self.dry_run:
            self.log("\n=== Fin del análisis (modo DRY-RUN) ===", "INFO")
        else:
            self.log(f"\n✓ Migraciones completadas: {len(self.changes)} cambios aplicados", "SUCCESS")
        
        return True


def main():
    """Función principal"""
    parser = argparse.ArgumentParser(
        description="Migrar esquema de base de datos sin perder datos"
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Mostrar cambios sin aplicarlos'
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Aplicar sin pedir confirmación'
    )
    
    args = parser.parse_args()
    
    # Crear engine
    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {}
    )
    
    # Confirmar si no es dry-run ni force
    if not args.dry_run and not args.force:
        print("\n⚠️  ADVERTENCIA: Este script modificará el esquema de la base de datos.")
        print("Se recomienda hacer un backup antes de continuar.")
        response = input("\n¿Desea continuar? (si/no): ")
        if response.lower() not in ['si', 'sí', 's', 'yes', 'y']:
            print("Operación cancelada.")
            return
    
    # Ejecutar migración
    migrator = DatabaseMigrator(engine, dry_run=args.dry_run)
    success = migrator.run()
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
