"""Esquemas para Club"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UsuarioBasicoResponse(BaseModel):
    """Response básico de Usuario"""
    id: int
    email: str
    nombre_completo: str

    class Config:
        from_attributes = True


class ClubCreate(BaseModel):
    """Crear nuevo club"""
    nombre: str = Field(..., min_length=3, max_length=100)
    slug: str = Field(..., min_length=3, max_length=50)
    descripcion: Optional[str] = Field(None, max_length=500)


class ClubUpdate(BaseModel):
    """Actualizar club"""
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    logo_url: Optional[str] = None
    color_primario: Optional[str] = None
    color_secundario: Optional[str] = None
    color_acento: Optional[str] = None
    pais: Optional[str] = None
    region: Optional[str] = None
    email_contacto: Optional[str] = None
    telefono: Optional[str] = None
    sitio_web: Optional[str] = None


class ClubResponse(BaseModel):
    """Respuesta de club"""
    id: int
    nombre: str
    slug: str
    descripcion: Optional[str] = None
    logo_url: Optional[str] = None
    color_primario: Optional[str] = None
    color_secundario: Optional[str] = None
    color_acento: Optional[str] = None
    pais: Optional[str] = None
    region: Optional[str] = None
    email_contacto: Optional[str] = None
    telefono: Optional[str] = None
    sitio_web: Optional[str] = None
    fecha_creacion: datetime

    class Config:
        from_attributes = True


class MiembroClubCreate(BaseModel):
    """Crear miembro del club"""
    usuario_id: int
    rol: str = "miembro"


class MiembroRolUpdate(BaseModel):
    """Actualizar rol de miembro"""
    rol: str = Field(..., min_length=3, max_length=50)


class MiembroClubResponse(BaseModel):
    """Respuesta de miembro del club"""
    id: int
    usuario_id: int
    club_id: int
    rol: str
    estado: str
    fecha_aprobacion: Optional[datetime] = None
    usuario: Optional[UsuarioBasicoResponse] = None

    class Config:
        from_attributes = True


class InvitacionClubResponse(BaseModel):
    """Respuesta de invitación al club"""
    email: str
    rol: str
    estado: str
    fecha_creacion: datetime
    fecha_vencimiento: datetime

    class Config:
        from_attributes = True
