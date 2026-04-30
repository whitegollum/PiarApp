"""Modelos de Tareas Comunitarias - Sistema de tareas con ranking y premios"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.db import Base
import enum


class EstadoTarea(str, enum.Enum):
    ABIERTA = "abierta"
    EN_PROGRESO = "en_progreso"
    COMPLETADA = "completada"
    RECHAZADA = "rechazada"
    EXPIRADA = "expirada"


class PrioridadTarea(str, enum.Enum):
    ALTA = "alta"
    MEDIA = "media"
    BAJA = "baja"


class TipoPeriodo(str, enum.Enum):
    MENSUAL = "mensual"
    TRIMESTRAL = "trimestral"
    SEMESTRAL = "semestral"
    ANUAL = "anual"


class EstadoPeriodo(str, enum.Enum):
    ACTIVO = "activo"
    CERRADO = "cerrado"
    CONFIRMADO = "confirmado"


class TareaComunitaria(Base):
    """Tarea comunitaria del club"""

    __tablename__ = "tareas_comunitarias"

    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubes.id"), nullable=False, index=True)
    titulo = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=True)
    puntos = Column(Integer, nullable=False, default=0)
    categoria = Column(String(100), nullable=True)
    prioridad = Column(String(20), nullable=False, default="media")
    fecha_limite = Column(DateTime, nullable=True)
    max_participantes = Column(Integer, nullable=True)
    estado = Column(String(20), nullable=False, default="abierta")
    motivo_rechazo = Column(Text, nullable=True)
    creador_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relaciones
    club = relationship("Club", foreign_keys=[club_id])
    creador = relationship("Usuario", foreign_keys=[creador_id])
    participantes = relationship("ParticipanteTarea", back_populates="tarea", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<TareaComunitaria {self.id} titulo={self.titulo}>"


class ParticipanteTarea(Base):
    """Participante inscrito en una tarea"""

    __tablename__ = "participantes_tarea"

    id = Column(Integer, primary_key=True, index=True)
    tarea_id = Column(Integer, ForeignKey("tareas_comunitarias.id"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    fecha_inscripcion = Column(DateTime, server_default=func.now())
    puntos_otorgados = Column(Boolean, default=False)

    # Relaciones
    tarea = relationship("TareaComunitaria", back_populates="participantes")
    usuario = relationship("Usuario", foreign_keys=[usuario_id])

    def __repr__(self):
        return f"<ParticipanteTarea tarea_id={self.tarea_id} usuario_id={self.usuario_id}>"


class PuntuacionUsuario(Base):
    """Registro de puntos otorgados a un usuario"""

    __tablename__ = "puntuaciones_usuario"

    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubes.id"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    tarea_id = Column(Integer, ForeignKey("tareas_comunitarias.id"), nullable=False, index=True)
    puntos = Column(Integer, nullable=False)
    fecha = Column(DateTime, server_default=func.now())

    # Relaciones
    club = relationship("Club", foreign_keys=[club_id])
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    tarea = relationship("TareaComunitaria", foreign_keys=[tarea_id])

    def __repr__(self):
        return f"<PuntuacionUsuario usuario_id={self.usuario_id} puntos={self.puntos}>"


class PeriodoPremios(Base):
    """Periodo configurable para premios"""

    __tablename__ = "periodos_premios"

    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubes.id"), nullable=False, index=True)
    nombre = Column(String(255), nullable=False)
    fecha_inicio = Column(DateTime, nullable=False)
    fecha_fin = Column(DateTime, nullable=False)
    tipo = Column(String(20), nullable=False, default="mensual")
    estado = Column(String(20), nullable=False, default="activo")
    created_at = Column(DateTime, server_default=func.now())

    # Relaciones
    club = relationship("Club", foreign_keys=[club_id])
    premios = relationship("Premio", back_populates="periodo", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<PeriodoPremios {self.id} nombre={self.nombre}>"


class Premio(Base):
    """Premio asignado a una posición del ranking"""

    __tablename__ = "premios"

    id = Column(Integer, primary_key=True, index=True)
    periodo_id = Column(Integer, ForeignKey("periodos_premios.id"), nullable=False, index=True)
    club_id = Column(Integer, ForeignKey("clubes.id"), nullable=False, index=True)
    nombre = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=True)
    posicion = Column(Integer, nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    confirmado = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relaciones
    periodo = relationship("PeriodoPremios", back_populates="premios")
    club = relationship("Club", foreign_keys=[club_id])
    usuario = relationship("Usuario", foreign_keys=[usuario_id])

    def __repr__(self):
        return f"<Premio {self.id} posicion={self.posicion}>"
