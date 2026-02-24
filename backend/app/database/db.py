from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Crear engine
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {}
)

# Crear session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para modelos
Base = declarative_base()


def get_db():
    """Dependency para obtener sesión de BD en rutas"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Inicializar base de datos con datos por defecto"""
    if engine.dialect.name != "sqlite":
        return

    with engine.begin() as connection:
        result = connection.execute(text("PRAGMA table_info(clubes)"))
        existing = {row[1] for row in result}

        columnas = [
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

        for nombre, tipo in columnas:
            if nombre not in existing:
                connection.execute(text(f"ALTER TABLE clubes ADD COLUMN {nombre} {tipo}"))
