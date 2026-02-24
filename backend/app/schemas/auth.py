"""Esquemas Pydantic para autenticación y usuarios"""
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional
from datetime import datetime


class TokenResponse(BaseModel):
    """Response con tokens de acceso y refresco"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # segundos


class TokenData(BaseModel):
    """Data dentro de un JWT token"""
    user_id: int
    email: str
    club_id: Optional[int] = None


class UsuarioBase(BaseModel):
    """Base schema para Usuario"""
    email: EmailStr
    nombre_completo: str


class UsuarioCreate(UsuarioBase):
    """Schema para crear usuario con contraseña"""
    password: str = Field(..., min_length=8, alias="password")
    
    model_config = ConfigDict(populate_by_name=True)


class UsuarioCreateDesdeInvitacion(UsuarioBase):
    """Schema para crear usuario desde invitación"""
    password: str = Field(..., min_length=8, alias="password")
    invitacion_token: str
    
    model_config = ConfigDict(populate_by_name=True)


class UsuarioResponse(UsuarioBase):
    """Response schema para Usuario"""
    id: int
    email_verificado: bool
    activo: bool
    es_superadmin: bool = False
    google_id: Optional[str] = None
    google_photo_url: Optional[str] = None
    fecha_creacion: datetime
    ultimo_login: Optional[datetime] = None
    
    # Preferencias
    notifications_enabled: bool = True
    email_digest: str = "weekly"
    dark_mode: bool = False
    language: str = "es"
    
    model_config = ConfigDict(from_attributes=True)


class UsuarioUpdate(BaseModel):
    """Schema para actualizar perfil/preferencias del usuario"""
    nombre_completo: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    email_digest: Optional[str] = None
    dark_mode: Optional[bool] = None
    language: Optional[str] = None


class LoginRequest(BaseModel):
    """Request para login con email/contraseña"""
    email: EmailStr
    password: str = Field(..., alias="password")
    
    model_config = ConfigDict(populate_by_name=True)


class GoogleLoginRequest(BaseModel):
    """Request para Google OAuth login"""
    google_token: str
    google_id: Optional[str] = None


class InvitacionAceptarRequest(BaseModel):
    """Request para aceptar invitación a club"""
    pass  # El token viene en la URL


class RefreshTokenRequest(BaseModel):
    """Request para refrescar token"""
    refresh_token: str


class ClubBasicoResponse(BaseModel):
    """Response básico de Club"""
    id: int
    nombre: str
    slug: str
    logo_url: Optional[str] = None
    color_primario: str
    
    model_config = ConfigDict(from_attributes=True)


class InvitacionResponse(BaseModel):
    """Response de invitación"""
    id: int
    club_id: int
    club: Optional[ClubBasicoResponse] = None
    email: str
    rol: str
    estado: str
    token: str
    fecha_vencimiento: datetime
    
    model_config = ConfigDict(from_attributes=True)


class InvitacionPublicaResponse(BaseModel):
    """Response de invitación publica para pantalla de aceptacion"""
    email: EmailStr
    club_id: int
    club_name: str
    fecha_vencimiento: datetime


class MiembroClubResponse(BaseModel):
    """Response de MiembroClub"""
    club: ClubBasicoResponse
    rol: str
    estado: str
    
    model_config = ConfigDict(from_attributes=True)
