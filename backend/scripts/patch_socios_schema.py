import sqlite3

DB_PATH = "/app/data/piar.db"

COLUMNS = [
    ("club_id", "INTEGER"),
    ("usuario_id", "INTEGER"),
    ("nombre", "VARCHAR(255)"),
    ("email", "VARCHAR(255)"),
    ("telefono", "VARCHAR(20)"),
    ("fecha_nacimiento", "DATETIME"),
    ("direccion", "TEXT"),
    ("especialidades", "TEXT"),
    ("foto_carnet_blob", "BLOB"),
    ("foto_carnet_mime", "VARCHAR(100)"),
    ("foto_carnet_fecha_subida", "DATETIME"),
    ("estado", "VARCHAR(20) DEFAULT 'activo'"),
    ("fecha_alta", "DATETIME"),
    ("fecha_creacion", "DATETIME"),
    ("fecha_actualizacion", "DATETIME"),
]


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(socios)")
        existing = {row[1] for row in cur.fetchall()}

        for name, coltype in COLUMNS:
            if name not in existing:
                cur.execute(f"ALTER TABLE socios ADD COLUMN {name} {coltype}")

        conn.commit()
        print("OK")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
