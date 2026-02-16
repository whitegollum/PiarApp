from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os

from app.config import settings
from app.database.db import engine, Base, init_db

# Importar modelos para que SQLAlchemy los registre
from app.models import usuario, club, socio, miembro_club, evento, noticia, votacion, invitacion, token_google, asistencia, comentario, instalacion, documentacion_reglamentaria

# Crear tablas en la base de datos
Base.metadata.create_all(bind=engine)

# Inicializar datos necesarios
init_db()

# Crear aplicación FastAPI
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="API de Gestión de Clubs de Aeromodelismo",
    debug=settings.debug
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
from app.routes import auth, clubes, socios, noticias, eventos, votaciones, instalaciones, documentacion, productos

# Incluir routers
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticación"])
app.include_router(clubes.router, prefix="/api/clubes", tags=["Clubes"])
app.include_router(socios.router, prefix="/api/socios", tags=["Socios"])
app.include_router(noticias.router, prefix="/api", tags=["Noticias"])
app.include_router(eventos.router, prefix="/api", tags=["Eventos"])
app.include_router(votaciones.router, prefix="/api/votaciones", tags=["Votaciones"])
app.include_router(instalaciones.router, prefix="/api", tags=["Instalaciones"]) # Updated prefix to match internal route definitions
app.include_router(documentacion.router, prefix="/api/documentacion", tags=["Documentación"])
app.include_router(productos.router, prefix="/api/productos", tags=["Productos"])


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


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Global exception handler"""
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
