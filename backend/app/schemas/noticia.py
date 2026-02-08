"""Esquemas para Noticia"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class NoticiaCreate(BaseModel):
    """Crear nueva noticia"""
    titulo: str = Field(..., min_length=5, max_length=200)
    contenido: str = Field(..., min_length=10, max_length=10000)


class NoticiaUpdate(BaseModel):
    """Actualizar noticia"""
    titulo: Optional[str] = None
    contenido: Optional[str] = None


class NoticiaResponse(BaseModel):
    """Respuesta de noticia"""
    id: int
    club_id: int
    titulo: str
    contenido: str
    autor_id: int
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None

    class Config:
        from_attributes = True
