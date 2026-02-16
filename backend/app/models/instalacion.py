from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.db import Base

class ContrasenaInstalacion(Base):
    """Historial de contraseñas de las instalaciones del club"""
    
    __tablename__ = "contrasena_instalaciones"
    
    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubes.id"), index=True, nullable=False)
    
    codigo = Column(String(100), nullable=False)
    descripcion = Column(String(255), nullable=True) # Por si hay varias puertas o notas
    
    # Auditoría
    creado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    
    # Estado (para saber cuál es la activa actual)
    activa = Column(Boolean, default=True)

    # Relaciones
    club = relationship("Club", foreign_keys=[club_id])
    creado_por = relationship("Usuario", foreign_keys=[creado_por_id])
