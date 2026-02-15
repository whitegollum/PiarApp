"""Esquemas para Noticia"""
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime
from app.schemas.club import UsuarioBasicoResponse


class NoticiaCreate(BaseModel):
    """Crear nueva noticia"""
    titulo: str = Field(..., min_length=5, max_length=200)
    contenido: str = Field(..., min_length=10, max_length=10000)
    categoria: Optional[str] = "general"
    imagen_url: Optional[str] = None
    visible_para: Optional[str] = "socios"
    permite_comentarios: Optional[bool] = True


class NoticiaUpdate(BaseModel):
    """Actualizar noticia"""
    titulo: Optional[str] = None
    contenido: Optional[str] = None
    categoria: Optional[str] = None
    imagen_url: Optional[str] = None
    estado: Optional[str] = None
    visible_para: Optional[str] = None
    permite_comentarios: Optional[bool] = None


class NoticiaResponse(BaseModel):
    """Respuesta de noticia"""
    id: int
    club_id: int
    titulo: str
    contenido: str
    categoria: Optional[str] = None
    imagen_url: Optional[str] = None
    autor_id: int
    autor: Optional[UsuarioBasicoResponse] = None
    estado: str
    visible_para: str
    permite_comentarios: bool
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
