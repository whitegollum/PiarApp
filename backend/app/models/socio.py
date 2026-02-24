from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text, LargeBinary
from sqlalchemy.sql import func
from app.database.db import Base


class Socio(Base):
    """Perfil de socio dentro del club - específico por club"""
    
    __tablename__ = "socios"
    
    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubes.id"), index=True, nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), index=True, nullable=False)
    
    # Datos personales
    nombre = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    telefono = Column(String(20), nullable=True)
    fecha_nacimiento = Column(DateTime, nullable=True)
    direccion = Column(Text, nullable=True)
    
    # Especialidades
    especialidades = Column(JSON, nullable=True)  # array de especialidades
    
    # Foto de carnet (almacenada como binario para MVP)
    foto_carnet_blob = Column(LargeBinary, nullable=True)
    foto_carnet_mime = Column(String(100), nullable=True)
    foto_carnet_fecha_subida = Column(DateTime, nullable=True)
    
    # Estado en el club
    estado = Column(String(20), default="activo")  # activo, inactivo
    fecha_alta = Column(DateTime, server_default=func.now())
    
    # Auditoría
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, onupdate=func.now())
    
    def __repr__(self):
        return f"<Socio {self.nombre} club_id={self.club_id}>"
