"""Esquemas para Evento"""
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


class EventoCreate(BaseModel):
    """Crear nuevo evento"""
    nombre: str = Field(..., min_length=5, max_length=200)
    descripcion: str = Field(..., min_length=10, max_length=10000)
    tipo: Optional[str] = "social"
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    ubicacion: Optional[str] = None
    aforo_maximo: Optional[int] = None
    requisitos: Optional[dict] = None
    imagen_url: Optional[str] = None
    permite_comentarios: Optional[bool] = True


class EventoUpdate(BaseModel):
    """Actualizar evento"""
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    tipo: Optional[str] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    ubicacion: Optional[str] = None
    estado: Optional[str] = None
    aforo_maximo: Optional[int] = None
    requisitos: Optional[dict] = None
    imagen_url: Optional[str] = None
    permite_comentarios: Optional[bool] = None


class EventoResponse(BaseModel):
    """Respuesta de evento"""
    id: int
    club_id: int
    nombre: str
    descripcion: str
    tipo: Optional[str] = None
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    ubicacion: Optional[str] = None
    estado: Optional[str] = None
    aforo_maximo: Optional[int] = None
    imagen_url: Optional[str] = None
    inscritos_count: int = 0

    model_config = ConfigDict(from_attributes=True)
    ubicacion: Optional[str] = None
    contacto_responsable_id: Optional[int] = None
    estado: str
    aforo_maximo: Optional[int] = None
    requisitos: Optional[dict] = None
    imagen_url: Optional[str] = None
    permite_comentarios: bool
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
