"""Modelo de Canales - Coordinación de frecuencias entre pilotos"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.db import Base


class CanalOcupacion(Base):
    """Ocupación de un canal por un usuario"""

    __tablename__ = "canal_ocupaciones"

    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubes.id"), nullable=False, index=True)
    canal_numero = Column(Integer, nullable=False)  # 1-8
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    en_vuelo = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relaciones
    club = relationship("Club", foreign_keys=[club_id])
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
