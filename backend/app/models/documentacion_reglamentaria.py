from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, LargeBinary
from sqlalchemy.sql import func
from app.database.db import Base


class DocumentacionReglamentaria(Base):
    """Documentacion reglamentaria del socio por club."""

    __tablename__ = "documentacion_reglamentaria"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), index=True, nullable=False)

    # Seguro RC
    rc_numero = Column(String(100), nullable=True)
    rc_fecha_emision = Column(DateTime, nullable=True)
    rc_fecha_vencimiento = Column(DateTime, nullable=True)
    rc_archivo = Column(LargeBinary, nullable=True)
    rc_archivo_nombre = Column(String(255), nullable=True)
    rc_archivo_mime = Column(String(100), nullable=True)

    # Carnet de piloto
    carnet_numero = Column(String(100), nullable=True)
    carnet_fecha_emision = Column(DateTime, nullable=True)
    carnet_fecha_vencimiento = Column(DateTime, nullable=True)
    carnet_archivo = Column(LargeBinary, nullable=True)
    carnet_archivo_nombre = Column(String(255), nullable=True)
    carnet_archivo_mime = Column(String(100), nullable=True)

    # Auditoria
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, onupdate=func.now())

    def __repr__(self):
        return f"<DocumentacionReglamentaria usuario_id={self.usuario_id}>"
