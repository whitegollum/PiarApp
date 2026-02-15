from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.db import Base

class AsistenciaEvento(Base):
    """Registro de asistencia a eventos (RSVP)"""
    
    __tablename__ = "asistencias_eventos"
    
    id = Column(Integer, primary_key=True, index=True)
    evento_id = Column(Integer, ForeignKey("eventos.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    
    # Estado: 'inscrito', 'lista_espera', 'cancelado' (por el usuario), 'rechazado' (por admin)
    estado = Column(String(20), default="inscrito", nullable=False)
    
    fecha_registro = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, onupdate=func.now())
    
    # Relaciones
    evento = relationship("Evento", backref="asistencias")
    usuario = relationship("Usuario", backref="asistencias_eventos")
    
    # Un usuario solo puede tener un registro por evento
    __table_args__ = (
        UniqueConstraint('evento_id', 'usuario_id', name='uq_asistencia_evento_usuario'),
    )

    def __repr__(self):
        return f"<Asistencia {self.usuario_id} -> {self.evento_id} ({self.estado})>"
