from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict

class SocioBase(BaseModel):
    """Esquema base para datos de socio"""
    nombre: str
    email: EmailStr
    telefono: Optional[str] = None
    fecha_nacimiento: Optional[datetime] = None
    direccion: Optional[str] = None
    especialidades: Optional[List[str]] = []
    estado: Optional[str] = "activo"

class SocioCreate(SocioBase):
    """Esquema para crear un nuevo socio"""
    club_id: int
    usuario_id: int

class SocioUpdate(BaseModel):
    """Esquema para actualizar datos de socio"""
    nombre: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    fecha_nacimiento: Optional[datetime] = None
    direccion: Optional[str] = None
    especialidades: Optional[List[str]] = None
    estado: Optional[str] = None

class SocioResponse(SocioBase):
    """Esquema para respuesta de datos de socio"""
    id: int
    club_id: int
    usuario_id: int
    fecha_alta: Optional[datetime] = None
    foto_carnet_fecha_subida: Optional[datetime] = None
    tiene_foto: bool = False

    model_config = ConfigDict(from_attributes=True)
