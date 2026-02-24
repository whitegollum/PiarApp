from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class DocumentacionResponse(BaseModel):
    id: int
    usuario_id: int

    rc_numero: Optional[str] = None
    rc_fecha_emision: Optional[datetime] = None
    rc_fecha_vencimiento: Optional[datetime] = None
    rc_archivo_nombre: Optional[str] = None
    rc_archivo_mime: Optional[str] = None
    rc_tiene_archivo: bool

    carnet_numero: Optional[str] = None
    carnet_fecha_emision: Optional[datetime] = None
    carnet_fecha_vencimiento: Optional[datetime] = None
    carnet_archivo_nombre: Optional[str] = None
    carnet_archivo_mime: Optional[str] = None
    carnet_tiene_archivo: bool

    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
