from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
import logging

from app.config import settings
from app.database.db import engine, Base, init_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Importar modelos para que SQLAlchemy los registre
from app.models import usuario, club, socio, miembro_club, evento, noticia, votacion, invitacion, token_google, asistencia, comentario, instalacion, documentacion_reglamentaria, system_config, producto, alerta, tareas_comunitarias, canal, invitado
from app.agent import models as agent_models  # noqa: F401

# Crear tablas en la base de datos
Base.metadata.create_all(bind=engine)

# Aplicar migraciones de columnas faltantes (safe: no falla si ya existen)
def _apply_pending_column_migrations():
    """Añade columnas nuevas a tablas existentes si aún no existen."""
    from sqlalchemy import text, inspect as sa_inspect
    inspector = sa_inspect(engine)
    with engine.begin() as conn:
        # reset_token / reset_token_expires en usuarios (2026-05-04)
        if "usuarios" in inspector.get_table_names():
            existing_cols = {c["name"] for c in inspector.get_columns("usuarios")}
            if "reset_token" not in existing_cols:
                conn.execute(text("ALTER TABLE usuarios ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL"))
                logger.info("Migración aplicada: usuarios.reset_token")
            if "reset_token_expires" not in existing_cols:
                conn.execute(text("ALTER TABLE usuarios ADD COLUMN reset_token_expires DATETIME DEFAULT NULL"))
                logger.info("Migración aplicada: usuarios.reset_token_expires")
            # Índice: SQLite no soporta IF NOT EXISTS en CREATE INDEX, ignorar error si ya existe
            try:
                conn.execute(text("CREATE INDEX idx_usuarios_reset_token ON usuarios(reset_token)"))
            except Exception:
                pass

        # token_qr en clubes (2026-05-15)
        if "clubes" in inspector.get_table_names():
            existing_cols = {c["name"] for c in inspector.get_columns("clubes")}
            if "token_qr" not in existing_cols:
                conn.execute(text("ALTER TABLE clubes ADD COLUMN token_qr VARCHAR(36) DEFAULT NULL"))
                logger.info("Migración aplicada: clubes.token_qr")
                try:
                    conn.execute(text("CREATE UNIQUE INDEX idx_clubes_token_qr ON clubes(token_qr)"))
                except Exception:
                    pass

        # aliexpress_banner_url / aliexpress_redirect_enabled en system_config
        if "system_config" in inspector.get_table_names():
            existing_cols = {c["name"] for c in inspector.get_columns("system_config")}
            if "aliexpress_banner_url" not in existing_cols:
                conn.execute(text("ALTER TABLE system_config ADD COLUMN aliexpress_banner_url VARCHAR(500) DEFAULT NULL"))
                logger.info("Migración aplicada: system_config.aliexpress_banner_url")
            if "aliexpress_redirect_enabled" not in existing_cols:
                conn.execute(text("ALTER TABLE system_config ADD COLUMN aliexpress_redirect_enabled BOOLEAN DEFAULT 1"))
                logger.info("Migración aplicada: system_config.aliexpress_redirect_enabled")

try:
    _apply_pending_column_migrations()
except Exception as _mig_err:
    logger.error(f"Error aplicando migraciones de columnas: {_mig_err}")

# Inicializar datos necesarios
init_db()


# Lifespan events para iniciar/detener el scheduler
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestionar ciclo de vida de la aplicación"""
    # Startup: Iniciar scheduler
    logger.info("🚀 Iniciando aplicación...")
    
    try:
        from app.services.scheduler_service import SchedulerService
        SchedulerService.start()
        logger.info("✅ Scheduler de tareas programadas iniciado")
    except Exception as e:
        logger.error(f"❌ Error al iniciar scheduler: {e}")
    
    yield
    
    # Shutdown: Detener scheduler
    logger.info("🛑 Deteniendo aplicación...")
    
    try:
        from app.services.scheduler_service import SchedulerService
        SchedulerService.shutdown()
        logger.info("✅ Scheduler detenido correctamente")
    except Exception as e:
        logger.error(f"❌ Error al detener scheduler: {e}")


# Crear aplicación FastAPI
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="API de Gestión de Clubs de Aeromodelismo",
    debug=settings.debug,
    lifespan=lifespan
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Importar rutas
from app.routes import auth, clubes, socios, noticias, eventos, votaciones, instalaciones, documentacion, productos, dashboard, alertas, admin, tareas_comunitarias, canales, afiliacion, uploads, invitados
from app.agent.router import router as agent_chat_router
from app.agent.admin_router import router as agent_admin_router

# Incluir routers
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticación"])
app.include_router(clubes.router, prefix="/api/clubes", tags=["Clubes"])
app.include_router(socios.router, prefix="/api/socios", tags=["Socios"])
app.include_router(noticias.router, prefix="/api", tags=["Noticias"])
app.include_router(eventos.router, prefix="/api", tags=["Eventos"])
app.include_router(votaciones.router, prefix="/api/votaciones", tags=["Votaciones"])
app.include_router(instalaciones.router, prefix="/api", tags=["Instalaciones"]) # Updated prefix to match internal route definitions
app.include_router(documentacion.router, prefix="/api/documentacion", tags=["Documentación"])
app.include_router(productos.router, prefix="/api", tags=["Productos"])
app.include_router(admin.router, prefix="/api/admin", tags=["Administración"])
app.include_router(agent_chat_router, prefix="/api", tags=["Chat"])
app.include_router(agent_admin_router, prefix="/api/admin", tags=["Agent Admin"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(alertas.router, prefix="/api", tags=["Alertas"])
app.include_router(tareas_comunitarias.router, prefix="/api/clubes", tags=["Tareas Comunitarias"])
app.include_router(canales.router, prefix="/api/clubes", tags=["Canales"])
app.include_router(invitados.router, prefix="/api", tags=["Invitados"])
app.include_router(afiliacion.router)  # SIN prefix /api — sirve HTML público
app.include_router(uploads.router, prefix="/api", tags=["Uploads"])

# Servir archivos subidos como estáticos
_uploads_path = os.path.abspath(settings.upload_folder)
os.makedirs(_uploads_path, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_uploads_path), name="uploads")


@app.get("/")
async def root():
    """Endpoint raíz de la API"""
    return {
        "message": "Bienvenido a PiarAPP - Gestión de Clubs de Aeromodelismo",
        "version": settings.app_version,
        "docs": "/docs"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": settings.app_name}


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    """Handle Pydantic validation errors with detailed information"""
    body = await request.body()
    logger.error(f"Validation error on {request.url}")
    logger.error(f"Errors: {exc.errors()}")
    logger.error(f"Body: {body}")
    
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "body": str(body)
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Global exception handler"""
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
