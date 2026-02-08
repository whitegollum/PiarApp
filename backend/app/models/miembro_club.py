from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.db import Base


class MiembroClub(Base):
    """Relación Usuario-Club con roles específicos por club"""
    
    __tablename__ = "miembro_club"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), index=True, nullable=False)
    club_id = Column(Integer, ForeignKey("clubes.id"), index=True, nullable=False)
    
    # Relaciones
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    club = relationship("Club", foreign_keys=[club_id], back_populates="miembros")
    
    # Rol dentro del club
    rol = Column(
        String(50),
        default="socio",
        nullable=False
        # Valores: propietario, admin, editor, moderador, gestor_eventos, tesorero, socio, visitante
    )
    
    # Estado de membresía
    estado = Column(
        String(20),
        default="pendiente",
        nullable=False
        # Valores: activo, pendiente, suspendido
    )
    
    # Auditoría
    fecha_inscripcion = Column(DateTime, server_default=func.now())
    fecha_aprobacion = Column(DateTime, nullable=True)
    aprobado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    fecha_ultimo_acceso = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<MiembroClub usuario_id={self.usuario_id} club_id={self.club_id} rol={self.rol}>"
