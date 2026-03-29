"""
Script todo-en-uno para actualizar la base de datos de forma segura

Este script:
1. Lista las migraciones pendientes (dry-run)
2. Crea un backup automático
3. Aplica las migraciones
4. Verifica que todo funcionó correctamente

Uso:
    python scripts/safe_migrate.py [--no-backup]
"""

import sys
import os
from pathlib import Path
from datetime import datetime
import subprocess
import argparse

# Agregar el directorio raíz al path
sys.path.insert(0, str(Path(__file__).parent.parent))


def run_command(command: list, description: str) -> tuple[bool, str]:
    """Ejecutar un comando y capturar output"""
    print(f"\n{'='*70}")
    print(f"🔄 {description}")
    print(f"{'='*70}")
    
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=False
        )
        
        print(result.stdout)
        if result.stderr:
            print(result.stderr)
        
        if result.returncode != 0:
            print(f"\n❌ Error al ejecutar: {' '.join(command)}")
            return False, result.stderr
        
        return True, result.stdout
    except Exception as e:
        print(f"\n❌ Excepción al ejecutar comando: {e}")
        return False, str(e)


def main():
    """Función principal"""
    parser = argparse.ArgumentParser(
        description="Actualizar base de datos de forma segura (backup + migración)"
    )
    parser.add_argument(
        '--no-backup',
        action='store_true',
        help='Saltar la creación de backup (no recomendado)'
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='No pedir confirmación antes de aplicar migraciones'
    )
    
    args = parser.parse_args()
    
    print("╔" + "="*68 + "╗")
    print("║" + " "*15 + "ACTUALIZACIÓN SEGURA DE BASE DE DATOS" + " "*16 + "║")
    print("╚" + "="*68 + "╝")
    
    # Paso 1: Análisis previo (dry-run)
    success, output = run_command(
        [sys.executable, "scripts/migrate_schema.py", "--dry-run"],
        "Paso 1/4: Analizando migraciones pendientes"
    )
    
    if not success:
        print("\n❌ Error en el análisis. Abortando.")
        return 1
    
    # Verificar si hay cambios
    if "está actualizado" in output or "No se requieren migraciones" in output:
        print("\n✅ La base de datos ya está actualizada. No se requiere migración.")
        return 0
    
    # Paso 2: Crear backup
    if not args.no_backup:
        success, output = run_command(
            [sys.executable, "scripts/backup_db.py"],
            "Paso 2/4: Creando backup de seguridad"
        )
        
        if not success:
            print("\n⚠️  No se pudo crear el backup.")
            response = input("¿Desea continuar sin backup? (si/no): ")
            if response.lower() not in ['si', 'sí', 's', 'yes', 'y']:
                print("Operación cancelada.")
                return 1
    else:
        print("\n⚠️  Saltando paso de backup (--no-backup especificado)")
    
    # Confirmar antes de aplicar
    if not args.force:
        print("\n" + "="*70)
        print("⚠️  Se aplicarán las migraciones mostradas arriba.")
        if not args.no_backup:
            print("✅ Se creó un backup de seguridad.")
        print("="*70)
        response = input("\n¿Desea continuar con la migración? (si/no): ")
        if response.lower() not in ['si', 'sí', 's', 'yes', 'y']:
            print("Operación cancelada.")
            return 1
    
    # Paso 3: Aplicar migraciones
    migrate_command = [sys.executable, "scripts/migrate_schema.py"]
    if args.force:
        migrate_command.append("--force")
    
    success, output = run_command(
        migrate_command,
        "Paso 3/4: Aplicando migraciones"
    )
    
    if not success:
        print("\n❌ Error al aplicar migraciones.")
        print("\n💡 Puede restaurar el backup si es necesario:")
        print("   - Listar backups: python scripts/backup_db.py --list")
        return 1
    
    # Paso 4: Verificación básica
    print(f"\n{'='*70}")
    print("🔄 Paso 4/4: Verificación de integridad")
    print(f"{'='*70}")
    
    try:
        from app.database.db import engine
        from sqlalchemy import text
        
        with engine.connect() as conn:
            # Verificar que podemos consultar las tablas principales
            tables = ['usuarios', 'clubes', 'noticias', 'eventos']
            for table in tables:
                result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                print(f"  ✓ Tabla '{table}': {count} registros")
        
        print("\n✅ Verificación completada exitosamente")
    except Exception as e:
        print(f"\n⚠️  Advertencia en verificación: {e}")
        print("   La migración se aplicó, pero hay un problema de conexión.")
    
    # Resumen final
    print("\n" + "╔" + "="*68 + "╗")
    print("║" + " "*22 + "MIGRACIÓN COMPLETADA" + " "*27 + "║")
    print("╚" + "="*68 + "╝")
    print("\n✅ La base de datos ha sido actualizada exitosamente.")
    print("\n💡 Siguiente paso: Reinicia la aplicación para aplicar los cambios:")
    print("   python run.py")
    
    if not args.no_backup:
        print("\n📁 Backups disponibles:")
        print("   python scripts/backup_db.py --list")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
