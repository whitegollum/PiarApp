from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class ProductoAfiliacionBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=255, description="Nombre del producto")
    descripcion: Optional[str] = Field(None, description="Descripción del producto")
    categoria: Optional[str] = Field(None, max_length=100, description="Categoría del producto")
    url_afiliacion: str = Field(..., description="URL con código de afiliación incluido")
    codigo_afiliacion: Optional[str] = Field(None, max_length=100, description="Código de afiliación")
    proveedor: Optional[str] = Field(None, max_length=100, description="Proveedor (Amazon, etc)")
    imagen_url: Optional[str] = Field(None, description="URL de la imagen del producto")
    precio_referencia: Optional[str] = Field(None, max_length=50, description="Precio de referencia")
    activo: bool = Field(True, description="Si el producto está activo")
    orden: int = Field(0, description="Orden de visualización")
    destacado: bool = Field(False, description="Producto destacado")


class ProductoAfiliacionCreate(ProductoAfiliacionBase):
    """Schema para crear un producto de afiliación"""
    pass


class ProductoAfiliacionUpdate(BaseModel):
    """Schema para actualizar un producto de afiliación"""
    nombre: Optional[str] = Field(None, min_length=1, max_length=255)
    descripcion: Optional[str] = None
    categoria: Optional[str] = Field(None, max_length=100)
    url_afiliacion: Optional[str] = None
    codigo_afiliacion: Optional[str] = Field(None, max_length=100)
    proveedor: Optional[str] = Field(None, max_length=100)
    imagen_url: Optional[str] = None
    precio_referencia: Optional[str] = Field(None, max_length=50)
    activo: Optional[bool] = None
    orden: Optional[int] = None
    destacado: Optional[bool] = None


class ProductoAfiliacionResponse(ProductoAfiliacionBase):
    """Schema de respuesta de un producto de afiliación"""
    id: int
    club_id: int
    clicks: int
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime]
    creado_por_id: int
    
    model_config = ConfigDict(from_attributes=True)


class ProductoAfiliacionListResponse(BaseModel):
    """Schema para listado de productos"""
    productos: list[ProductoAfiliacionResponse]
    total: int
