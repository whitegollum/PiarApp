from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional
from datetime import datetime

from app.utils.aliexpress import (
    is_aliexpress_url,
    is_third_party_affiliate,
    normalize_aliexpress_url,
)


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

    @field_validator("url_afiliacion")
    @classmethod
    def validar_url(cls, v: str, info) -> str:
        proveedor = (info.data.get("proveedor") or "").lower()
        if "aliexpress" in proveedor:
            if is_third_party_affiliate(v):
                raise ValueError(
                    "No se permiten links de afiliación de terceros "
                    "(s.click.aliexpress.com). Pega el link directo del producto."
                )
            if not is_aliexpress_url(v):
                raise ValueError("La URL debe ser de aliexpress.com")
            return normalize_aliexpress_url(v)
        return v


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

    @field_validator("url_afiliacion")
    @classmethod
    def validar_url(cls, v: Optional[str], info) -> Optional[str]:
        if v is None:
            return v
        proveedor = (info.data.get("proveedor") or "").lower()
        if "aliexpress" in proveedor:
            if is_third_party_affiliate(v):
                raise ValueError(
                    "No se permiten links de afiliación de terceros "
                    "(s.click.aliexpress.com). Pega el link directo del producto."
                )
            if not is_aliexpress_url(v):
                raise ValueError("La URL debe ser de aliexpress.com")
            return normalize_aliexpress_url(v)
        return v


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
