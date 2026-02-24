import sqlite3

DB_PATH = "/app/data/piar.db"

COLUMNS = [
    ("logo_url", "TEXT"),
    ("color_primario", "VARCHAR(7) DEFAULT '#FF6B35'"),
    ("color_secundario", "VARCHAR(7) DEFAULT '#004E89'"),
    ("color_acento", "VARCHAR(7) DEFAULT '#F77F00'"),
    ("favicon_url", "TEXT"),
    ("pais", "VARCHAR(100)"),
    ("region", "VARCHAR(100)"),
    ("latitud", "FLOAT"),
    ("longitud", "FLOAT"),
    ("email_contacto", "VARCHAR(255)"),
    ("telefono", "VARCHAR(20)"),
    ("sitio_web", "VARCHAR(255)"),
    ("redes_sociales", "TEXT"),
    ("zona_horaria", "VARCHAR(50) DEFAULT 'Europe/Madrid'"),
    ("idioma_por_defecto", "VARCHAR(10) DEFAULT 'es'"),
    ("estado", "VARCHAR(20) DEFAULT 'inactivo'"),
    ("settings", "TEXT"),
]


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(clubes)")
        existing = {row[1] for row in cur.fetchall()}

        for name, coltype in COLUMNS:
            if name not in existing:
                cur.execute(f"ALTER TABLE clubes ADD COLUMN {name} {coltype}")

        conn.commit()
        print("OK")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
