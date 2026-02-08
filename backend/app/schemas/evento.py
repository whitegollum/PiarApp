"""Esquemas para Evento"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class EventoCreate(BaseModel):
    """Crear nuevo evento"""
    titulo: str = Field(..., min_length=5, max_length=200)
    descripcion: str = Field(..., min_length=10, max_length=10000)
    fecha_inicio: datetime
    fecha_fin: datetime
    ubicacion: Optional[str] = None


class EventoUpdate(BaseModel):
    """Actualizar evento"""
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    ubicacion: Optional[str] = None


class EventoResponse(BaseModel):
    """Respuesta de evento"""
    id: int
    club_id: int
    titulo: str
    descripcion: str
    fecha_inicio: datetime
    fecha_fin: datetime
    ubicacion: Optional[str] = None
    organizador_id: int
    fecha_creacion: datetime

    class Config:
        from_attributes = True
