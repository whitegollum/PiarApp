"""
Ejecutar migración: añadir columna rtsp_url a clubes
"""
import sqlite3
import sys
from pathlib import Path

db_path = Path(__file__).parent.parent / "data" / "piar.db"

try:
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Verificar si la columna ya existe
    cursor.execute("PRAGMA table_info(clubes)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'rtsp_url' in columns:
        print("✓ La columna rtsp_url ya existe en la tabla clubes")
    else:
        # Añadir la columna
        cursor.execute("ALTER TABLE clubes ADD COLUMN rtsp_url VARCHAR(500)")
        conn.commit()
        print("✓ Columna rtsp_url añadida exitosamente a la tabla clubes")
    
    conn.close()
    
except Exception as e:
    print(f"❌ Error al ejecutar la migración: {str(e)}")
    sys.exit(1)
