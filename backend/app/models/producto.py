from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.db import Base


class ProductoAfiliacion(Base):
    """Productos de afiliación - Enlaces externos con códigos de afiliación del club"""
    
    __tablename__ = "productos_afiliacion"
    
    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubes.id"), index=True, nullable=False)
    
    # Información del producto
    nombre = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=True)
    categoria = Column(String(100), nullable=True)  # Equipos, Repuestos, Software, etc.
    
    # Enlaces de afiliación
    url_afiliacion = Column(Text, nullable=False)  # URL completa con código de afiliación incluido
    codigo_afiliacion = Column(String(100), nullable=True)  # Código de afiliación separado (opcional)
    proveedor = Column(String(100), nullable=True)  # Amazon, AliExpress, etc.
    
    # Presentación
    imagen_url = Column(Text, nullable=True)
    precio_referencia = Column(String(50), nullable=True)  # Precio estimado como string (ej: "29.99€")
    
    # Control
    activo = Column(Boolean, default=True)
    orden = Column(Integer, default=0)  # Para ordenar manualmente los productos
    destacado = Column(Boolean, default=False)  # Para mostrar en posición destacada
    
    # Estadísticas (futuro)
    clicks = Column(Integer, default=0)  # Contador de clicks
    
    # Auditoría
    fecha_creacion = Column(DateTime, server_default=func.now())
    fecha_actualizacion = Column(DateTime, onupdate=func.now())
    creado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    
    # Relaciones
    club = relationship("Club")
    creado_por = relationship("Usuario")
    
    def __repr__(self):
        return f"<ProductoAfiliacion {self.nombre}>"
