"""Endpoints de gestión de noticias"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.usuario import Usuario
from app.models.noticia import Noticia
from app.models.club import Club
from app.models.miembro_club import MiembroClub
from app.schemas.noticia import NoticiaCreate, NoticiaResponse, NoticiaUpdate
from app.routes.auth import get_current_user
from datetime import datetime

router = APIRouter()


# ==================== NOTICIAS ====================

@router.post("/clubes/{club_id}/noticias", response_model=NoticiaResponse)
async def crear_noticia(
    club_id: int,
    noticia_create: NoticiaCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear nueva noticia en el club (solo administradores)"""
    
    # Verificar que el usuario es administrador del club
    miembro_admin = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id,
        MiembroClub.rol == "administrador"
    ).first()
    
    if not miembro_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden crear noticias"
        )
    
    # Verificar que el club existe
    club = db.query(Club).filter(Club.id == club_id).first()
    
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club no encontrado"
        )
    
    # Crear noticia
    nueva_noticia = Noticia(
        club_id=club_id,
        titulo=noticia_create.titulo,
        contenido=noticia_create.contenido,
        autor_id=current_user.id
    )
    
    db.add(nueva_noticia)
    db.commit()
    db.refresh(nueva_noticia)
    
    return NoticiaResponse.from_orm(nueva_noticia)


@router.get("/clubes/{club_id}/noticias", response_model=list)
async def listar_noticias_club(
    club_id: int,
    skip: int = 0,
    limit: int = 10,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar noticias del club"""
    
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
    
    noticias = db.query(Noticia).filter(
        Noticia.club_id == club_id
    ).order_by(Noticia.fecha_creacion.desc()).offset(skip).limit(limit).all()
    
    return [NoticiaResponse.from_orm(n) for n in noticias]


@router.get("/clubes/{club_id}/noticias/{noticia_id}", response_model=NoticiaResponse)
async def obtener_noticia(
    club_id: int,
    noticia_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener detalles de una noticia"""
    
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
    
    noticia = db.query(Noticia).filter(
        Noticia.id == noticia_id,
        Noticia.club_id == club_id
    ).first()
    
    if not noticia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Noticia no encontrada"
        )
    
    return NoticiaResponse.from_orm(noticia)


@router.put("/clubes/{club_id}/noticias/{noticia_id}", response_model=NoticiaResponse)
async def actualizar_noticia(
    club_id: int,
    noticia_id: int,
    noticia_update: NoticiaUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar noticia (solo administradores o autor)"""
    
    noticia = db.query(Noticia).filter(
        Noticia.id == noticia_id,
        Noticia.club_id == club_id
    ).first()
    
    if not noticia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Noticia no encontrada"
        )
    
    # Verificar permisos (administrador o autor)
    miembro = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id
    ).first()
    
    if noticia.autor_id != current_user.id and miembro.rol != "administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para editar esta noticia"
        )
    
    # Actualizar campos
    if noticia_update.titulo:
        noticia.titulo = noticia_update.titulo
    if noticia_update.contenido:
        noticia.contenido = noticia_update.contenido
    
    db.commit()
    db.refresh(noticia)
    
    return NoticiaResponse.from_orm(noticia)


@router.delete("/clubes/{club_id}/noticias/{noticia_id}", response_model=dict)
async def eliminar_noticia(
    club_id: int,
    noticia_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar noticia (solo administradores o autor)"""
    
    noticia = db.query(Noticia).filter(
        Noticia.id == noticia_id,
        Noticia.club_id == club_id
    ).first()
    
    if not noticia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Noticia no encontrada"
        )
    
    # Verificar permisos
    miembro = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id
    ).first()
    
    if noticia.autor_id != current_user.id and miembro.rol != "administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar esta noticia"
        )
    
    db.delete(noticia)
    db.commit()
    
    return {"message": "Noticia eliminada exitosamente"}
