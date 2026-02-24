from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.db import Base


class Club(Base):
    """Modelo de Club - soporte para multitenancy"""
    
    __tablename__ = "clubes"
    
    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    nombre = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=True)
    
    # Personalización
    logo_url = Column(Text, nullable=True)
    color_primario = Column(String(7), default="#FF6B35")  # HEX color
    color_secundario = Column(String(7), default="#004E89")
    color_acento = Column(String(7), default="#F77F00")
    favicon_url = Column(Text, nullable=True)
    
    # Información del club
    pais = Column(String(100), nullable=True)
    region = Column(String(100), nullable=True)
    latitud = Column(Float, nullable=True)
    longitud = Column(Float, nullable=True)
    email_contacto = Column(String(255), nullable=True)
    telefono = Column(String(20), nullable=True)
    sitio_web = Column(String(255), nullable=True)
    redes_sociales = Column(JSON, nullable=True)  # {facebook, instagram, etc}
    zona_horaria = Column(String(50), default="Europe/Madrid")
    idioma_por_defecto = Column(String(10), default="es")
    
    # Configuración
    estado = Column(String(20), default="inactivo")  # activo, inactivo, suspendido
    creador_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    
    # Configuración antigua (removidas por nuevo modelo)
    # es_publico, requiere_aprobacion, permite_autoregistro
    
    # Metadata
    settings = Column(JSON, nullable=True)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, onupdate=func.now())
    
    # Relaciones
    miembros = relationship("MiembroClub", cascade="all, delete-orphan", back_populates="club")
    creador = relationship("Usuario", foreign_keys=[creador_id])
    
    def __repr__(self):
        return f"<Club {self.slug}>"
