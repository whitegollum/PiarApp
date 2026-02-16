from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.db import Base

class Comentario(Base):
    __tablename__ = "comentarios"

    id = Column(Integer, primary_key=True, index=True)
    contenido = Column(Text, nullable=False)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_actualizacion = Column(DateTime(timezone=True), onupdate=func.now())

    # Relaciones
    autor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    noticia_id = Column(Integer, ForeignKey("noticias.id"), nullable=False)

    autor = relationship("Usuario", foreign_keys=[autor_id])
    noticia = relationship("Noticia", back_populates="comentarios")
