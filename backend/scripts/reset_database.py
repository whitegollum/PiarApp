#!/usr/bin/env python3
"""
Script para limpiar completamente la base de datos.
ADVERTENCIA: Este script eliminará TODOS los datos de la base de datos.
"""

import sys
import os
from pathlib import Path

# Agregar el directorio backend al path para imports
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text, inspect
from app.config import settings
from app.database.db import Base

# Asegurar que el directorio data existe
data_dir = backend_dir / "data"
data_dir.mkdir(exist_ok=True)

# Construir ruta absoluta de la base de datos
if "sqlite" in settings.database_url:
    # Extraer path relativo y convertir a absoluto
    db_path = settings.database_url.replace("sqlite:///", "")
    if not Path(db_path).is_absolute():
        db_path = str(backend_dir / db_path.lstrip("./"))
    DATABASE_URL = f"sqlite:///{db_path}"
else:
    DATABASE_URL = settings.database_url

# Importar todos los modelos para que estén registrados
from app.models import (
    Usuario, Club, MiembroClub, Invitacion, Noticia, 
    Evento, AsistenciaEvento, Comentario, ContrasenaInstalacion,
    DocumentacionReglamentaria, SystemConfig
)
from app.models.token_google import TokenGoogle
from app.models.votacion import Votacion
from app.models.socio import Socio


def reset_database(confirm: bool = False):
    """
    Elimina todos los datos de la base de datos.
    
    Args:
        confirm: Si es True, no pedirá confirmación al usuario
    """
    # Advertencia
    if not confirm:
        print("⚠️  ADVERTENCIA: Esta operación eliminará TODOS los datos de la base de datos.")
        print(f"   Base de datos: {DATABASE_URL}")
        respuesta = input("\n¿Estás seguro de que deseas continuar? (escribe 'SI' para confirmar): ")
        
        if respuesta != "SI":
            print("❌ Operación cancelada.")
            return False
    
    print("\n🔄 Iniciando limpieza de base de datos...")
    
    try:
        # Crear engine
        engine = create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
        )
        
        with engine.begin() as connection:
            # Para SQLite: desactivar foreign keys temporalmente
            if engine.dialect.name == "sqlite":
                connection.execute(text("PRAGMA foreign_keys = OFF"))
                print("✓ Foreign keys desactivadas")
            
            # Obtener inspector para listar tablas
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            
            print(f"\n📋 Tablas encontradas: {len(tables)}")
            
            # Eliminar datos de cada tabla
            for table_name in tables:
                try:
                    # Eliminar todos los registros
                    connection.execute(text(f"DELETE FROM {table_name}"))
                    print(f"✓ Limpiada tabla: {table_name}")
                except Exception as e:
                    print(f"⚠️  Error al limpiar tabla {table_name}: {e}")
            
            # Resetear autoincrement (solo SQLite) - hacerlo al final
            if engine.dialect.name == "sqlite":
                try:
                    connection.execute(text("DELETE FROM sqlite_sequence"))
                    print("\n✓ Contadores de autoincrement reseteados")
                except Exception:
                    # sqlite_sequence no existe si no hay datos, ignorar
                    pass
            
            # Reactivar foreign keys
            if engine.dialect.name == "sqlite":
                connection.execute(text("PRAGMA foreign_keys = ON"))
                print("\n✓ Foreign keys reactivadas")
        
        print("\n✅ Base de datos limpiada exitosamente.")
        print("💡 Nota: La estructura de las tablas se mantiene intacta.")
        return True
        
    except Exception as e:
        print(f"\n❌ Error durante la limpieza: {e}")
        return False


def recreate_database():
    """
    Elimina y recrea completamente la base de datos.
    """
    print("\n⚠️  ADVERTENCIA: Esta operación eliminará y recreará TODA la base de datos.")
    print(f"   Base de datos: {DATABASE_URL}")
    respuesta = input("\n¿Estás seguro de que deseas continuar? (escribe 'RECREAR' para confirmar): ")
    
    if respuesta != "RECREAR":
        print("❌ Operación cancelada.")
        return False
    
    print("\n🔄 Iniciando recreación de base de datos...")
    
    try:
        # Crear engine
        engine = create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
        )
        
        # Eliminar todas las tablas
        print("🗑️  Eliminando tablas existentes...")
        Base.metadata.drop_all(bind=engine)
        print("✓ Tablas eliminadas")
        
        # Recrear todas las tablas
        print("\n🔨 Creando tablas nuevas...")
        Base.metadata.create_all(bind=engine)
        print("✓ Tablas creadas")
        
        print("\n✅ Base de datos recreada exitosamente.")
        return True
        
    except Exception as e:
        print(f"\n❌ Error durante la recreación: {e}")
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Herramienta para limpiar o recrear la base de datos"
    )
    parser.add_argument(
        "accion",
        choices=["limpiar", "recrear"],
        help="Acción a realizar: 'limpiar' (elimina datos) o 'recrear' (elimina y recrea tablas)"
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="No pedir confirmación (usar con precaución)"
    )
    
    args = parser.parse_args()
    
    if args.accion == "limpiar":
        reset_database(confirm=args.yes)
    elif args.accion == "recrear":
        recreate_database()
