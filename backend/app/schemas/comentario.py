from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.schemas.auth import UsuarioResponse

class ComentarioBase(BaseModel):
    contenido: str

class ComentarioCreate(ComentarioBase):
    pass

class ComentarioUpdate(ComentarioBase):
    pass

class ComentarioResponse(ComentarioBase):
    id: int
    autor_id: int
    noticia_id: int
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None
    autor: UsuarioResponse

    model_config = ConfigDict(from_attributes=True)
