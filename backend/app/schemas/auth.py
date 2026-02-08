"""Esquemas Pydantic para autenticación y usuarios"""
from pydantic import BaseModel, EmailStr, Field
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
    
    class Config:
        populate_by_name = True  # Permite usar ambos nombres de campos


class UsuarioCreateDesdeInvitacion(UsuarioBase):
    """Schema para crear usuario desde invitación"""
    password: str = Field(..., min_length=8, alias="password")
    invitacion_token: str
    
    class Config:
        populate_by_name = True  # Permite usar ambos nombres de campos


class UsuarioResponse(UsuarioBase):
    """Response schema para Usuario"""
    id: int
    email_verificado: bool
    activo: bool
    google_id: Optional[str] = None
    google_photo_url: Optional[str] = None
    fecha_creacion: datetime
    ultimo_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    """Request para login con email/contraseña"""
    email: EmailStr
    password: str = Field(..., alias="password")
    
    class Config:
        populate_by_name = True  # Permite usar ambos nombres


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


class InvitacionResponse(BaseModel):
    """Response de invitación"""
    id: int
    club_id: int
    email: str
    rol: str
    estado: str
    token: str
    fecha_vencimiento: datetime
    
    class Config:
        from_attributes = True


class ClubBasicoResponse(BaseModel):
    """Response básico de Club"""
    id: int
    nombre: str
    slug: str
    logo_url: Optional[str] = None
    color_primario: str
    
    class Config:
        from_attributes = True


class MiembroClubResponse(BaseModel):
    """Response de MiembroClub"""
    club: ClubBasicoResponse
    rol: str
    estado: str
    
    class Config:
        from_attributes = True
