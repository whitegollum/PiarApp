from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
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
from app.models import usuario, club, socio, miembro_club, evento, noticia, votacion, invitacion, token_google, asistencia, comentario, instalacion, documentacion_reglamentaria, system_config, producto, alerta, tareas_comunitarias

# Crear tablas en la base de datos
Base.metadata.create_all(bind=engine)

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
from app.routes import auth, clubes, socios, noticias, eventos, votaciones, instalaciones, documentacion, productos, chat, dashboard, alertas, admin, tareas_comunitarias

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
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(alertas.router, prefix="/api", tags=["Alertas"])
app.include_router(tareas_comunitarias.router, prefix="/api/clubes", tags=["Tareas Comunitarias"])


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
