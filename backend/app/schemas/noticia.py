"""Esquemas para Noticia"""
from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional
from datetime import datetime
from app.schemas.club import UsuarioBasicoResponse


class NoticiaCreate(BaseModel):
    """Crear nueva noticia"""
    titulo: str = Field(..., min_length=5, max_length=200)
    contenido: str = Field(..., min_length=10, max_length=10000)
    categoria: Optional[str] = Field(default="general")
    imagen_url: Optional[str] = Field(default=None)
    visible_para: str = Field(default="socios")
    permite_comentarios: bool = Field(default=True)
    
    @field_validator('imagen_url', 'categoria', mode='before')
    @classmethod
    def empty_string_to_none(cls, v):
        """Convert empty string to None"""
        if v == "" or v is None:
            return None
        return v


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
