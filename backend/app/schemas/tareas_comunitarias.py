"""Schemas Pydantic para Tareas Comunitarias"""
from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Literal
from datetime import datetime


# --- Tareas ---

class TareaComunitariaCreate(BaseModel):
    titulo: str = Field(..., min_length=3, max_length=200)
    descripcion: Optional[str] = Field(None, max_length=2000)
    puntos: int = Field(0, ge=0, description="Puntos que otorga la tarea (≥ 0)")
    categoria: Optional[str] = Field(None, max_length=100)
    prioridad: Literal["alta", "media", "baja"] = "media"
    fecha_limite: Optional[datetime] = None
    max_participantes: Optional[int] = Field(None, gt=0, description="Plazas máximas (> 0)")


class TareaComunitariaUpdate(BaseModel):
    titulo: Optional[str] = Field(None, min_length=3, max_length=200)
    descripcion: Optional[str] = Field(None, max_length=2000)
    puntos: Optional[int] = Field(None, ge=0)
    categoria: Optional[str] = Field(None, max_length=100)
    prioridad: Optional[Literal["alta", "media", "baja"]] = None
    fecha_limite: Optional[datetime] = None
    max_participantes: Optional[int] = Field(None, gt=0)
    estado: Optional[Literal["abierta", "en_progreso", "completada", "rechazada", "expirada"]] = None


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
    nombre: str = Field(..., min_length=3, max_length=100)
    fecha_inicio: datetime
    fecha_fin: datetime
    tipo: Literal["mensual", "trimestral", "semestral", "anual"] = "mensual"

    @model_validator(mode="after")
    def validar_rango_fechas(self):
        if self.fecha_fin <= self.fecha_inicio:
            raise ValueError("fecha_fin debe ser posterior a fecha_inicio")
        return self


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
    nombre: str = Field(..., min_length=3, max_length=100)
    descripcion: Optional[str] = Field(None, max_length=500)
    posicion: int = Field(..., gt=0, description="Posición del premio (1 = primero)")


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
    motivo: str = Field(..., min_length=3, max_length=500)
