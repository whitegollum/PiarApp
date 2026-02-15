"""Esquemas para Usuario"""
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional
from datetime import datetime


class UsuarioResponse(BaseModel):
    """Respuesta de usuario"""
    id: int
    email: EmailStr
    nombre_completo: str
    google_id: Optional[str] = None
    fecha_creacion: datetime
    ultimo_login: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UsuarioDetalleResponse(UsuarioResponse):
    """Respuesta detallada de usuario con clubes"""
    clubes: Optional[list] = None

    model_config = ConfigDict(from_attributes=True)
