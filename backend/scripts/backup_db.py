"""
Script para crear backup de la base de datos antes de migraciones

Uso:
    python scripts/backup_db.py [--output RUTA]
"""

import sys
import os
from pathlib import Path
from datetime import datetime
import shutil
import argparse

# Agregar el directorio raíz al path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings


def create_backup(output_path: Path = None) -> bool:
    """Crear backup de la base de datos"""
    
    # Obtener ruta de la BD desde settings
    db_url = settings.database_url
    
    # Extraer ruta del archivo para SQLite
    if db_url.startswith("sqlite:///"):
        db_path = db_url.replace("sqlite:///", "")
        db_path = Path(db_path)
        
        if not db_path.exists():
            print(f"❌ Error: No se encuentra la base de datos en {db_path}")
            return False
        
        # Generar nombre de backup con timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if output_path is None:
            backup_name = f"{db_path.stem}_backup_{timestamp}{db_path.suffix}"
            output_path = db_path.parent / backup_name
        
        # Crear backup
        try:
            shutil.copy2(db_path, output_path)
            file_size = output_path.stat().st_size / 1024  # KB
            print(f"✅ Backup creado exitosamente:")
            print(f"   Archivo: {output_path}")
            print(f"   Tamaño: {file_size:.2f} KB")
            print(f"   Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            return True
        except Exception as e:
            print(f"❌ Error al crear backup: {e}")
            return False
    
    else:
        print("⚠️  Este script solo soporta backups de SQLite automáticamente.")
        print(f"   Tu base de datos usa: {db_url.split(':')[0]}")
        print("\n   Para PostgreSQL/MySQL, usa las herramientas nativas:")
        print("   - PostgreSQL: pg_dump")
        print("   - MySQL: mysqldump")
        return False


def list_backups():
    """Listar backups existentes"""
    db_url = settings.database_url
    
    if db_url.startswith("sqlite:///"):
        db_path = Path(db_url.replace("sqlite:///", ""))
        backup_pattern = f"{db_path.stem}_backup_*{db_path.suffix}"
        
        backups = sorted(db_path.parent.glob(backup_pattern), key=lambda x: x.stat().st_mtime, reverse=True)
        
        if not backups:
            print("No se encontraron backups previos.")
            return
        
        print(f"\n📋 Backups disponibles ({len(backups)}):")
        print("-" * 70)
        
        for backup in backups[:10]:  # Mostrar últimos 10
            stat = backup.stat()
            size_kb = stat.st_size / 1024
            mtime = datetime.fromtimestamp(stat.st_mtime)
            print(f"  {backup.name}")
            print(f"    Tamaño: {size_kb:.2f} KB | Fecha: {mtime.strftime('%Y-%m-%d %H:%M:%S')}")
        
        if len(backups) > 10:
            print(f"\n  ... y {len(backups) - 10} más")


def main():
    """Función principal"""
    parser = argparse.ArgumentParser(
        description="Crear backup de la base de datos"
    )
    parser.add_argument(
        '--output', '-o',
        type=str,
        help='Ruta donde guardar el backup'
    )
    parser.add_argument(
        '--list',
        action='store_true',
        help='Listar backups existentes'
    )
    
    args = parser.parse_args()
    
    if args.list:
        list_backups()
        return 0
    
    print("🔄 Creando backup de la base de datos...")
    
    output_path = Path(args.output) if args.output else None
    success = create_backup(output_path)
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
