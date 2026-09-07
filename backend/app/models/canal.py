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
    # Subfrecuencia dentro del canal para sistemas con dos frecuencias físicas
    # no interferentes en el mismo canal canónico (p.ej. DJI O4 FCC: O4-5/O4-6
    # en el canal 5). None para el resto de ocupaciones (exclusividad normal).
    sub_canal = Column(String(10), nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    en_vuelo = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relaciones
    club = relationship("Club", foreign_keys=[club_id])
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
