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
    """Usuario (socio o invitado) en un canal"""
    usuario_id: int  # 0 para invitados
    nombre: str
    en_vuelo: bool
    es_invitado: bool = False
    sub_canal: Optional[str] = None


class OcuparCanalRequest(BaseModel):
    """Body opcional al ocupar un canal (subfrecuencia, p.ej. 'O4-5'/'O4-6')"""
    sub_canal: Optional[str] = None


class CanalEstado(BaseModel):
    """Estado completo de un canal"""
    canal_numero: int
    usuarios: list[CanalUsuario]
    en_vuelo: bool  # True si alguien está volando
    piloto_volando: Optional[str] = None  # Nombre del piloto en vuelo


class CanalesPanel(BaseModel):
    """Estado completo del panel de canales"""
    canales: list[CanalEstado]
