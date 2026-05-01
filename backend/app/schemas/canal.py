"""Schemas de Canales"""
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class CanalOcupacionResponse(BaseModel):
    """Respuesta de una ocupación de canal"""
    id: int
    club_id: int
    canal_numero: int
    usuario_id: int
    en_vuelo: bool
    created_at: Optional[datetime] = None
    nombre_usuario: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CanalUsuario(BaseModel):
    """Usuario en un canal"""
    usuario_id: int
    nombre: str
    en_vuelo: bool


class CanalEstado(BaseModel):
    """Estado completo de un canal"""
    canal_numero: int
    usuarios: list[CanalUsuario]
    en_vuelo: bool  # True si alguien está volando
    piloto_volando: Optional[str] = None  # Nombre del piloto en vuelo


class CanalesPanel(BaseModel):
    """Estado completo del panel de canales"""
    canales: list[CanalEstado]
