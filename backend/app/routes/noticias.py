"""Endpoints de gestión de noticias"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.usuario import Usuario
from app.models.noticia import Noticia
from app.models.comentario import Comentario  # Added
from app.models.club import Club
from app.models.miembro_club import MiembroClub
from app.schemas.noticia import NoticiaCreate, NoticiaResponse, NoticiaUpdate
from app.schemas.comentario import ComentarioCreate, ComentarioResponse, ComentarioUpdate # Added
from app.routes.auth import get_current_user
from datetime import datetime
from typing import List # Added

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
        categoria=noticia_create.categoria,
        imagen_url=noticia_create.imagen_url,
        visible_para=noticia_create.visible_para,
        permite_comentarios=noticia_create.permite_comentarios,
        autor_id=current_user.id
    )
    
    db.add(nueva_noticia)
    db.commit()
    db.refresh(nueva_noticia)
    
    return NoticiaResponse.model_validate(nueva_noticia)


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
    
    return [NoticiaResponse.model_validate(n) for n in noticias]


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
    
    return NoticiaResponse.model_validate(noticia)


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
    for field, value in noticia_update.model_dump(exclude_unset=True).items():
        setattr(noticia, field, value)
    
    db.commit()
    db.refresh(noticia)
    
    return NoticiaResponse.model_validate(noticia)


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
    
    return {"message": "Noticia eliminada correctamente"}


# ==================== COMENTARIOS ====================

@router.get("/clubes/{club_id}/noticias/{noticia_id}/comentarios", response_model=List[ComentarioResponse])
async def listar_comentarios(
    club_id: int,
    noticia_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar comentarios de una noticia"""
    
    # Verificar acceso al club/noticia
    noticia = db.query(Noticia).filter(
        Noticia.id == noticia_id,
        Noticia.club_id == club_id
    ).first()
    
    if not noticia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Noticia no encontrada"
        )
        
    # Verificar membresía
    miembro = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id,
        MiembroClub.estado == "activo"
    ).first()
    
    if not miembro:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No eres miembro activo de este club"
        )

    # Devolver comentarios ordenados por fecha (más recientes abajo? o arriba?)
    # Usualmente comentarios cronológicos: más viejos arriba.
    return db.query(Comentario).filter(
        Comentario.noticia_id == noticia_id
    ).order_by(Comentario.fecha_creacion.asc()).all()


@router.post("/clubes/{club_id}/noticias/{noticia_id}/comentarios", response_model=ComentarioResponse)
async def crear_comentario(
    club_id: int,
    noticia_id: int,
    comentario: ComentarioCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Publicar un comentario en una noticia"""
    
    noticia = db.query(Noticia).filter(
        Noticia.id == noticia_id,
        Noticia.club_id == club_id
    ).first()
    
    if not noticia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Noticia no encontrada"
        )
        
    if not noticia.permite_comentarios:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Los comentarios están desactivados para esta noticia"
        )

    # Verificar membresía
    miembro = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id,
        MiembroClub.estado == "activo"
    ).first()
    
    if not miembro:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No eres miembro activo de este club"
        )
        
    nuevo_comentario = Comentario(
        contenido=comentario.contenido,
        autor_id=current_user.id,
        noticia_id=noticia_id
    )
    
    db.add(nuevo_comentario)
    db.commit()
    db.refresh(nuevo_comentario)
    
    return nuevo_comentario


@router.delete("/clubes/{club_id}/noticias/{noticia_id}/comentarios/{comentario_id}")
async def eliminar_comentario(
    club_id: int,
    noticia_id: int,
    comentario_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar un comentario (autor o administrador)"""
    
    comentario = db.query(Comentario).filter(
        Comentario.id == comentario_id,
        Comentario.noticia_id == noticia_id
    ).first()
    
    if not comentario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comentario no encontrado"
        )
        
    # Verificar permisos (Autor o Admin del club)
    miembro = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id
    ).first()
    
    es_admin = miembro and miembro.rol in ["administrador", "propietario"]
    es_autor = comentario.autor_id == current_user.id
    
    if not (es_admin or es_autor):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para eliminar este comentario"
        )
        
    db.delete(comentario)
    db.commit()
    
    return {"message": "Comentario eliminado"}
    
    return {"message": "Noticia eliminada exitosamente"}
