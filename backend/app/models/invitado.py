"""Modelo de Sesiones de Invitados - Acceso por QR sin autenticación"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.db import Base


class InvitadoSesion(Base):
    """Sesión temporal de un invitado que accede mediante QR"""

    __tablename__ = "invitado_sesiones"

    token = Column(String(36), primary_key=True)  # UUID
    club_id = Column(Integer, ForeignKey("clubes.id"), nullable=False, index=True)
    nombre = Column(String(100), nullable=False)  # "Cerdo Curioso" o "Cerdo {nombre_usuario}"
    canal_numero = Column(Integer, nullable=True)  # Canal actual, null si no está en ninguno
    en_vuelo = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    last_active = Column(DateTime, server_default=func.now())

    club = relationship("Club", foreign_keys=[club_id])
