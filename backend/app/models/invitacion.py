from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database.db import Base


class Invitacion(Base):
    """Invitaciones a clubes - sistema cerrado controlado por admin"""
    
    __tablename__ = "invitaciones"
    
    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubes.id"), index=True, nullable=False)
    
    # Email del invitado (puede no estar registrado aún)
    email = Column(String(255), index=True, nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)  # Se rellena al registrarse
    
    # Rol que tendrá al aceptar
    rol = Column(String(50), default="socio", nullable=False)
    nombre_completo = Column(String(255), nullable=True)  # Propuesto por admin
    
    # Token de invitación (para enlace seguro)
    token = Column(String(255), unique=True, index=True, nullable=False)
    
    # Estado
    estado = Column(
        String(20),
        default="pendiente",
        nullable=False
        # Valores: pendiente, aceptada, rechazada, expirada
    )
    
    # Auditoría
    creado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_vencimiento = Column(DateTime, nullable=False)  # 30 días después
    fecha_aceptacion = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<Invitacion email={self.email} club_id={self.club_id} estado={self.estado}>"
