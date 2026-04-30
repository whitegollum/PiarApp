"""Schemas Pydantic para Tareas Comunitarias"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# --- Tareas ---

class TareaComunitariaCreate(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    puntos: int = 0
    categoria: Optional[str] = None
    prioridad: str = "media"
    fecha_limite: Optional[datetime] = None
    max_participantes: Optional[int] = None


class TareaComunitariaUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    puntos: Optional[int] = None
    categoria: Optional[str] = None
    prioridad: Optional[str] = None
    fecha_limite: Optional[datetime] = None
    max_participantes: Optional[int] = None
    estado: Optional[str] = None


class ParticipanteTareaResponse(BaseModel):
    id: int
    tarea_id: int
    usuario_id: int
    fecha_inscripcion: Optional[datetime] = None
    puntos_otorgados: bool = False
    nombre_usuario: Optional[str] = None

    class Config:
        from_attributes = True


class TareaComunitariaResponse(BaseModel):
    id: int
    club_id: int
    titulo: str
    descripcion: Optional[str] = None
    puntos: int
    categoria: Optional[str] = None
    prioridad: str
    fecha_limite: Optional[datetime] = None
    max_participantes: Optional[int] = None
    estado: str
    motivo_rechazo: Optional[str] = None
    creador_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    participantes: List[ParticipanteTareaResponse] = []
    num_participantes: int = 0

    class Config:
        from_attributes = True


# --- Puntuaciones y Ranking ---

class PuntuacionUsuarioResponse(BaseModel):
    id: int
    club_id: int
    usuario_id: int
    tarea_id: int
    puntos: int
    fecha: Optional[datetime] = None

    class Config:
        from_attributes = True


class RankingEntry(BaseModel):
    usuario_id: int
    nombre: str
    puntos_totales: int
    posicion: int


# --- Periodos y Premios ---

class PeriodoPremiosCreate(BaseModel):
    nombre: str
    fecha_inicio: datetime
    fecha_fin: datetime
    tipo: str = "mensual"


class PeriodoPremiosResponse(BaseModel):
    id: int
    club_id: int
    nombre: str
    fecha_inicio: datetime
    fecha_fin: datetime
    tipo: str
    estado: str
    created_at: Optional[datetime] = None
    premios: List["PremioResponse"] = []

    class Config:
        from_attributes = True


class PremioCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    posicion: int


class PremioResponse(BaseModel):
    id: int
    periodo_id: int
    club_id: int
    nombre: str
    descripcion: Optional[str] = None
    posicion: int
    usuario_id: Optional[int] = None
    nombre_usuario: Optional[str] = None
    confirmado: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Resolve forward reference in PeriodoPremiosResponse
PeriodoPremiosResponse.model_rebuild()


# --- Rechazo ---

class RechazoTareaRequest(BaseModel):
    motivo: str
