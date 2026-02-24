from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.schemas.auth import UsuarioResponse

class ContrasenaBase(BaseModel):
    codigo: str
    descripcion: Optional[str] = None

class ContrasenaCreate(ContrasenaBase):
    pass

class ContrasenaResponse(ContrasenaBase):
    id: int
    club_id: int
    fecha_creacion: datetime
    creado_por: UsuarioResponse
    activa: bool

    model_config = ConfigDict(from_attributes=True)

class ContrasenaHistory(BaseModel):
    """Schema para listar el historial de contraseñas (solo admin)"""
    id: int
    codigo: str
    fecha_creacion: datetime
    creado_por: UsuarioResponse
    activa: bool

    model_config = ConfigDict(from_attributes=True)
