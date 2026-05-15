"""Schemas de Invitados - Acceso por QR"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.schemas.canal import CanalesPanel


class InvitadoUnirseRequest(BaseModel):
    token_qr: str
    nombre: Optional[str] = None
    token_existente: Optional[str] = None  # UUID guardado en localStorage del dispositivo


class InvitadoSesionResponse(BaseModel):
    token: str
    club_id: int
    nombre: str
    canal_numero: Optional[int] = None
    en_vuelo: bool


class CanalesPanelInvitado(CanalesPanel):
    """Panel de canales enriquecido con el estado del invitado actual"""
    mi_canal: Optional[int] = None
    en_vuelo: bool = False
    mi_nombre: str = ""


class InvitadoCambiarNombreRequest(BaseModel):
    nombre: Optional[str] = None


class QRInvitadoResponse(BaseModel):
    token_qr: str
    url: str
