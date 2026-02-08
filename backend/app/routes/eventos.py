"""Endpoints de gestión de eventos"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.usuario import Usuario
from app.models.evento import Evento
from app.models.club import Club
from app.models.miembro_club import MiembroClub
from app.schemas.evento import EventoCreate, EventoResponse, EventoUpdate
from app.routes.auth import get_current_user
from datetime import datetime

router = APIRouter()


# ==================== EVENTOS ====================

@router.post("/clubes/{club_id}/eventos", response_model=EventoResponse)
async def crear_evento(
    club_id: int,
    evento_create: EventoCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear nuevo evento en el club (solo administradores)"""
    
    # Verificar que el usuario es administrador del club
    miembro_admin = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id,
        MiembroClub.rol == "administrador"
    ).first()
    
    if not miembro_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden crear eventos"
        )
    
    # Verificar que el club existe
    club = db.query(Club).filter(Club.id == club_id).first()
    
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club no encontrado"
        )
    
    # Crear evento
    nuevo_evento = Evento(
        club_id=club_id,
        titulo=evento_create.titulo,
        descripcion=evento_create.descripcion,
        fecha_inicio=evento_create.fecha_inicio,
        fecha_fin=evento_create.fecha_fin,
        ubicacion=evento_create.ubicacion,
        organizador_id=current_user.id
    )
    
    db.add(nuevo_evento)
    db.commit()
    db.refresh(nuevo_evento)
    
    return EventoResponse.from_orm(nuevo_evento)


@router.get("/clubes/{club_id}/eventos", response_model=list)
async def listar_eventos_club(
    club_id: int,
    skip: int = 0,
    limit: int = 20,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar eventos del club"""
    
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
    
    eventos = db.query(Evento).filter(
        Evento.club_id == club_id
    ).order_by(Evento.fecha_inicio.desc()).offset(skip).limit(limit).all()
    
    return [EventoResponse.from_orm(e) for e in eventos]


@router.get("/clubes/{club_id}/eventos/{evento_id}", response_model=EventoResponse)
async def obtener_evento(
    club_id: int,
    evento_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener detalles de un evento"""
    
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
    
    evento = db.query(Evento).filter(
        Evento.id == evento_id,
        Evento.club_id == club_id
    ).first()
    
    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento no encontrado"
        )
    
    return EventoResponse.from_orm(evento)


@router.put("/clubes/{club_id}/eventos/{evento_id}", response_model=EventoResponse)
async def actualizar_evento(
    club_id: int,
    evento_id: int,
    evento_update: EventoUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar evento (solo administradores)"""
    
    # Verificar que el usuario es administrador del club
    miembro_admin = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id,
        MiembroClub.rol == "administrador"
    ).first()
    
    if not miembro_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden actualizar eventos"
        )
    
    evento = db.query(Evento).filter(
        Evento.id == evento_id,
        Evento.club_id == club_id
    ).first()
    
    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento no encontrado"
        )
    
    # Actualizar campos
    if evento_update.titulo:
        evento.titulo = evento_update.titulo
    if evento_update.descripcion:
        evento.descripcion = evento_update.descripcion
    if evento_update.fecha_inicio:
        evento.fecha_inicio = evento_update.fecha_inicio
    if evento_update.fecha_fin:
        evento.fecha_fin = evento_update.fecha_fin
    if evento_update.ubicacion:
        evento.ubicacion = evento_update.ubicacion
    
    db.commit()
    db.refresh(evento)
    
    return EventoResponse.from_orm(evento)


@router.delete("/clubes/{club_id}/eventos/{evento_id}", response_model=dict)
async def eliminar_evento(
    club_id: int,
    evento_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar evento (solo administradores)"""
    
    # Verificar que el usuario es administrador del club
    miembro_admin = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id,
        MiembroClub.rol == "administrador"
    ).first()
    
    if not miembro_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden eliminar eventos"
        )
    
    evento = db.query(Evento).filter(
        Evento.id == evento_id,
        Evento.club_id == club_id
    ).first()
    
    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento no encontrado"
        )
    
    db.delete(evento)
    db.commit()
    
    return {"message": "Evento eliminado exitosamente"}
