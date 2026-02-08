from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.database.db import Base


class TokenGoogle(Base):
    """Almacena tokens de Google OAuth para cada usuario"""
    
    __tablename__ = "token_google"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), unique=True, nullable=False)
    
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    expires_at = Column(DateTime, nullable=False)
    scope = Column(String(255), nullable=True)
    token_type = Column(String(20), default="Bearer")
    
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<TokenGoogle usuario_id={self.usuario_id}>"
