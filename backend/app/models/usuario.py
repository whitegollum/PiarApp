from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.database.db import Base


class Usuario(Base):
    """Modelo global de Usuario - válido para todos los clubes"""
    
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    nombre_completo = Column(String(255), nullable=False)
    contraseña_hash = Column(String(255), nullable=True)  # Null si solo usa OAuth
    
    # Google OAuth
    google_id = Column(String(255), unique=True, nullable=True)
    google_email = Column(String(255), nullable=True)
    google_photo_url = Column(Text, nullable=True)
    
    # Estado
    email_verificado = Column(Boolean, default=False)
    activo = Column(Boolean, default=True)
    
    # 2FA
    dos_fa_habilitado = Column(Boolean, default=False)
    dos_fa_secret = Column(String(255), nullable=True)
    
    # Auditoría
    fecha_creacion = Column(DateTime, server_default=func.now())
    ultimo_login = Column(DateTime, nullable=True)
    fecha_actualizacion = Column(DateTime, onupdate=func.now())
    
    def __repr__(self):
        return f"<Usuario {self.email}>"
