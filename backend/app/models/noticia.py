from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.db import Base


class Noticia(Base):
    """Noticias y anuncios del club - específico por club"""
    
    __tablename__ = "noticias"
    
    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubes.id"), index=True, nullable=False)
    
    titulo = Column(String(255), nullable=False)
    contenido = Column(Text, nullable=False)
    categoria = Column(String(50), nullable=True)  # evento, anuncio, resultado, etc
    
    # Autor y estado
    autor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    estado = Column(String(20), default="borrador")  # borrador, publicada, archivada

    autor = relationship("Usuario", foreign_keys=[autor_id])
    
    # Visibilidad
    visible_para = Column(String(20), default="socios")  # publico, socios
    permite_comentarios = Column(Boolean, default=True)
    
    # Multimedia
    imagen_url = Column(Text, nullable=True)

    # Relaciones
    comentarios = relationship("Comentario", back_populates="noticia", cascade="all, delete-orphan")
    
    # Auditoría
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_publicacion = Column(DateTime, nullable=True)
    fecha_actualizacion = Column(DateTime, onupdate=func.now())
    fecha_archivado = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<Noticia {self.titulo}>"
