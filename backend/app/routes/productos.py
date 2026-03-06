"""Endpoints de gestión de productos de afiliación"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database.db import get_db
from app.models.usuario import Usuario
from app.models.producto import ProductoAfiliacion
from app.models.club import Club
from app.models.miembro_club import MiembroClub
from app.schemas.producto import (
    ProductoAfiliacionCreate,
    ProductoAfiliacionUpdate,
    ProductoAfiliacionResponse,
    ProductoAfiliacionListResponse
)
from app.routes.auth import get_current_user

router = APIRouter()


# ==================== PRODUCTOS DE AFILIACIÓN ====================

@router.post("/clubes/{club_id}/productos", response_model=ProductoAfiliacionResponse)
async def crear_producto(
    club_id: int,
    producto_create: ProductoAfiliacionCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear nuevo producto de afiliación (solo administradores)"""
    
    # Verificar que el usuario es administrador del club
    miembro_admin = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id,
        MiembroClub.rol == "administrador"
    ).first()
    
    if not miembro_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden crear productos"
        )
    
    # Verificar que el club existe
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club no encontrado"
        )
    
    # Crear producto
    nuevo_producto = ProductoAfiliacion(
        club_id=club_id,
        nombre=producto_create.nombre,
        descripcion=producto_create.descripcion,
        categoria=producto_create.categoria,
        url_afiliacion=producto_create.url_afiliacion,
        codigo_afiliacion=producto_create.codigo_afiliacion,
        proveedor=producto_create.proveedor,
        imagen_url=producto_create.imagen_url,
        precio_referencia=producto_create.precio_referencia,
        activo=producto_create.activo,
        orden=producto_create.orden,
        destacado=producto_create.destacado,
        creado_por_id=current_user.id
    )
    
    db.add(nuevo_producto)
    db.commit()
    db.refresh(nuevo_producto)
    
    return ProductoAfiliacionResponse.model_validate(nuevo_producto)


@router.get("/clubes/{club_id}/productos", response_model=ProductoAfiliacionListResponse)
async def listar_productos_club(
    club_id: int,
    categoria: Optional[str] = None,
    solo_activos: bool = True,
    solo_destacados: bool = False,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar productos de afiliación del club"""
    
    # Verificar que el usuario es miembro del club
    miembro = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id
    ).first()
    
    if not miembro:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este club"
        )
    
    # Construir query
    query = db.query(ProductoAfiliacion).filter(
        ProductoAfiliacion.club_id == club_id
    )
    
    # Filtros opcionales
    if solo_activos:
        query = query.filter(ProductoAfiliacion.activo == True)
    
    if solo_destacados:
        query = query.filter(ProductoAfiliacion.destacado == True)
    
    if categoria:
        query = query.filter(ProductoAfiliacion.categoria == categoria)
    
    # Ordenar por orden y fecha
    productos = query.order_by(
        ProductoAfiliacion.orden.desc(),
        ProductoAfiliacion.fecha_creacion.desc()
    ).all()
    
    return ProductoAfiliacionListResponse(
        productos=[ProductoAfiliacionResponse.model_validate(p) for p in productos],
        total=len(productos)
    )


@router.get("/clubes/{club_id}/productos/{producto_id}", response_model=ProductoAfiliacionResponse)
async def obtener_producto(
    club_id: int,
    producto_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener detalle de un producto"""
    
    # Verificar que el usuario es miembro del club
    miembro = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id
    ).first()
    
    if not miembro:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este club"
        )
    
    producto = db.query(ProductoAfiliacion).filter(
        ProductoAfiliacion.id == producto_id,
        ProductoAfiliacion.club_id == club_id
    ).first()
    
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado"
        )
    
    return ProductoAfiliacionResponse.model_validate(producto)


@router.put("/clubes/{club_id}/productos/{producto_id}", response_model=ProductoAfiliacionResponse)
async def actualizar_producto(
    club_id: int,
    producto_id: int,
    producto_update: ProductoAfiliacionUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar producto (solo administradores)"""
    
    # Verificar que el usuario es administrador
    miembro_admin = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id,
        MiembroClub.rol == "administrador"
    ).first()
    
    if not miembro_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden actualizar productos"
        )
    
    producto = db.query(ProductoAfiliacion).filter(
        ProductoAfiliacion.id == producto_id,
        ProductoAfiliacion.club_id == club_id
    ).first()
    
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado"
        )
    
    # Actualizar campos
    update_data = producto_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(producto, field, value)
    
    db.commit()
    db.refresh(producto)
    
    return ProductoAfiliacionResponse.model_validate(producto)


@router.delete("/clubes/{club_id}/productos/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_producto(
    club_id: int,
    producto_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar producto (solo administradores)"""
    
    # Verificar que el usuario es administrador
    miembro_admin = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id,
        MiembroClub.rol == "administrador"
    ).first()
    
    if not miembro_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden eliminar productos"
        )
    
    producto = db.query(ProductoAfiliacion).filter(
        ProductoAfiliacion.id == producto_id,
        ProductoAfiliacion.club_id == club_id
    ).first()
    
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado"
        )
    
    db.delete(producto)
    db.commit()


@router.post("/clubes/{club_id}/productos/{producto_id}/click", status_code=status.HTTP_200_OK)
async def registrar_click(
    club_id: int,
    producto_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Registrar click en enlace de afiliación (para estadísticas)"""
    
    # Verificar que el usuario es miembro
    miembro = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id
    ).first()
    
    if not miembro:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este club"
        )
    
    producto = db.query(ProductoAfiliacion).filter(
        ProductoAfiliacion.id == producto_id,
        ProductoAfiliacion.club_id == club_id
    ).first()
    
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado"
        )
    
    # Incrementar contador
    producto.clicks += 1
    db.commit()
    
    return {"clicks": producto.clicks}


# Endpoint legacy para compatibilidad
@router.get("/")
async def listar_productos():
    """Endpoint legacy - usar /clubes/{club_id}/productos"""
    return {"productos": [], "message": "Usar /clubes/{club_id}/productos"}
