from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.sql import func
from app.database.db import Base


class Evento(Base):
    """Eventos del club - específico por club"""
    
    __tablename__ = "eventos"
    
    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubes.id"), index=True, nullable=False)
    
    nombre = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=True)
    tipo = Column(String(50), nullable=True)  # volar_grupo, competicion, formacion, social, otro
    
    # Fechas y horario
    fecha_inicio = Column(DateTime, nullable=False)
    fecha_fin = Column(DateTime, nullable=True)
    hora_inicio = Column(String(10), nullable=True)
    hora_fin = Column(String(10), nullable=True)
    
    # Ubicación
    ubicacion = Column(String(255), nullable=True)
    
    # Aforo
    aforo_maximo = Column(Integer, nullable=True)
    
    # Requisitos
    requisitos = Column(JSON, nullable=True)  # {carnet_vigente, seguro, especialidad, etc}
    
    # Responsable y estado
    contacto_responsable_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    estado = Column(String(20), default="no_iniciado")  # no_iniciado, en_curso, finalizado, cancelado
    
    # Multimedia
    imagen_url = Column(Text, nullable=True)
    permite_comentarios = Column(Boolean, default=True)
    
    # Auditoría
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, onupdate=func.now())
    
    def __repr__(self):
        return f"<Evento {self.nombre}>"
