from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.database.db import Base


class Votacion(Base):
    """Sistema de votaciones - específico por club"""
    
    __tablename__ = "votaciones"
    
    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubes.id"), index=True, nullable=False)
    
    titulo = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=True)
    
    tipo = Column(String(20), default="simple")  # simple (si/no), multiple
    
    creador_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    
    # Fechas
    fecha_inicio = Column(DateTime, nullable=False)
    fecha_fin = Column(DateTime, nullable=False)
    
    # Estado y visibilidad
    estado = Column(String(20), default="abierta")  # abierta, cerrada
    visible = Column(Boolean, default=True)
    anonima = Column(Boolean, default=False)
    
    # Auditoría
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_cierre = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<Votacion {self.titulo}>"
