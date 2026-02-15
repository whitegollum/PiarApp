from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from app.schemas.auth import UsuarioResponse

class AsistenciaBase(BaseModel):
    estado: str = "inscrito" # inscrito, lista_espera, cancelado

class AsistenciaCreate(AsistenciaBase):
    pass

class AsistenciaUpdate(AsistenciaBase):
    pass

class AsistenciaResponse(AsistenciaBase):
    id: int
    evento_id: int
    usuario_id: int
    fecha_registro: datetime
    usuario: Optional[UsuarioResponse] = None

    class Config:
        from_attributes = True
