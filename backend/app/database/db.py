from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Crear engine con ajustes según el motor
_db_url = settings.database_url
if _db_url.startswith("sqlite"):
    # SQLite necesita check_same_thread=False para FastAPI (varios hilos)
    engine = create_engine(_db_url, connect_args={"check_same_thread": False})
else:
    # PostgreSQL (u otros): pool_pre_ping evita conexiones muertas tras
    # reinicios del servidor de BD; pool_recycle recicla conexiones largas.
    engine = create_engine(_db_url, pool_pre_ping=True, pool_recycle=1800)

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
