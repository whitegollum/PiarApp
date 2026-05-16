"""Schemas de Alertas"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class SeveridadAlertaEnum(str, Enum):
    WARNING = "warning"
    DANGER = "danger"
    CRITICAL = "critical"


class EstadoAlertaEnum(str, Enum):
    ACTIVA = "activa"
    RESUELTA = "resuelta"
    IGNORADA = "ignorada"


class UsuarioAlertaInfo(BaseModel):
    """Info básica del usuario para mostrar en alertas"""
    id: int
    nombre: Optional[str] = None
    email: str
    
    class Config:
        from_attributes = True


class AlertaResponse(BaseModel):
    """Respuesta de una alerta individual"""
    id: int
    club_id: int
    usuario_id: int
    tipo: str
    subtipo: Optional[str] = None
    severidad: str
    titulo: str
    descripcion: Optional[str] = None
    fecha_referencia: Optional[datetime] = None
    estado: str
    notificado_usuario: bool
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None
    usuario: Optional[UsuarioAlertaInfo] = None
    
    class Config:
        from_attributes = True


class AlertaListResponse(BaseModel):
    """Lista de alertas"""
    alertas: List[AlertaResponse]
    total: int


class AlertaCountResponse(BaseModel):
    """Contadores de alertas por severidad"""
    total: int
    warning: int
    danger: int
    critical: int


class AlertaResolverRequest(BaseModel):
    """Request para resolver/ignorar una alerta"""
    accion: str  # "resolver" o "ignorar"


class AlertasConfigUpdate(BaseModel):
    """Actualizar configuración de alertas del club"""
    alertas_documentacion_enabled: bool
    alertas_doc_ausente_enabled: bool = True
    dias_aviso_previo: Optional[int] = 30
    dias_critico: Optional[int] = 60


class AlertasConfigResponse(BaseModel):
    """Respuesta de configuración de alertas"""
    alertas_documentacion_enabled: bool
    alertas_doc_ausente_enabled: bool
    dias_aviso_previo: int
    dias_critico: int
