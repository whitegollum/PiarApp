"""Modelo de Alertas - Sistema genérico de alertas para el club"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.db import Base
import enum


class TipoAlerta(str, enum.Enum):
    """Tipos de alerta disponibles"""
    DOCUMENTO_AUSENTE = "documento_ausente"
    DOCUMENTO_POR_VENCER = "documento_por_vencer"
    DOCUMENTO_VENCIDO = "documento_vencido"
    CUOTA_PENDIENTE = "cuota_pendiente"
    EVENTO_PROXIMO = "evento_proximo"


class SubtipoAlerta(str, enum.Enum):
    """Subtipos de alerta (categoría específica)"""
    CARNET_PILOTO = "carnet_piloto"
    SEGURO_RC = "seguro_rc"
    CUOTA_MENSUAL = "cuota_mensual"
    CUOTA_ANUAL = "cuota_anual"


class SeveridadAlerta(str, enum.Enum):
    """Niveles de severidad"""
    WARNING = "warning"      # Amarillo - 30 días antes
    DANGER = "danger"        # Rojo - Ya venció (0-60 días)
    CRITICAL = "critical"    # Morado - +60 días vencido


class EstadoAlerta(str, enum.Enum):
    """Estados posibles"""
    ACTIVA = "activa"
    RESUELTA = "resuelta"
    IGNORADA = "ignorada"


class Alerta(Base):
    """Modelo de Alerta - Sistema genérico para notificaciones"""
    
    __tablename__ = "alertas"
    
    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubes.id"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    
    # Tipo y categoría
    tipo = Column(String(50), nullable=False, index=True)
    subtipo = Column(String(50), nullable=True)
    severidad = Column(String(20), nullable=False, default="warning")
    
    # Información
    titulo = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=True)
    fecha_referencia = Column(DateTime, nullable=True)
    
    # Estado
    estado = Column(String(20), nullable=False, default="activa")
    
    # Tracking notificaciones
    notificado_admin = Column(Boolean, default=False)
    fecha_notificacion_admin = Column(DateTime, nullable=True)
    notificado_usuario = Column(Boolean, default=False)
    fecha_notificacion_usuario = Column(DateTime, nullable=True)
    ultimo_email_enviado = Column(DateTime, nullable=True)
    
    # Auditoría
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, onupdate=func.now())
    fecha_resolucion = Column(DateTime, nullable=True)
    resuelto_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    
    # Relaciones
    club = relationship("Club", foreign_keys=[club_id])
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    resuelto_por = relationship("Usuario", foreign_keys=[resuelto_por_id])
    
    def __repr__(self):
        return f"<Alerta {self.id} tipo={self.tipo} severidad={self.severidad}>"
