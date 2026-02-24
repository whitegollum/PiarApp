from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Response
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.socio import Socio
from app.models.club import Club
from app.models.usuario import Usuario
from app.models.miembro_club import MiembroClub
from app.schemas.socio import SocioCreate, SocioUpdate, SocioResponse
from app.routes.auth import get_current_user

router = APIRouter()


def _check_permission(db: Session, user: Usuario, club_id: int):
    # Verificar si es admin del club
    member = db.query(MiembroClub).filter(
        MiembroClub.club_id == club_id,
        MiembroClub.usuario_id == user.id,
        MiembroClub.rol == "administrador"
    ).first()
    if not member and user.rol != "superadmin": # Asumiendo superadmin global existe
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para gestionar socios de este club"
        )


@router.get("/", response_model=List[SocioResponse])
async def listar_socios(
    club_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Listar socios de un club especifico"""
    # Verificar acceso (miembros pueden ver lista? asumamos que si por ahora, o solo admins)
    # _check_permission(db, current_user, club_id) # Descomentar para restringir solo a admins
    
    socios = db.query(Socio).filter(Socio.club_id == club_id).all()
    # Mapear campo tiene_foto
    for s in socios:
        s.tiene_foto = s.foto_carnet_blob is not None
        
    return socios


@router.post("/", response_model=SocioResponse)
async def crear_socio(
    socio_in: SocioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Registrar nuevo socio en club"""
    _check_permission(db, current_user, socio_in.club_id)
    
    # Verificar si ya existe
    existe = db.query(Socio).filter(
        Socio.club_id == socio_in.club_id,
        Socio.usuario_id == socio_in.usuario_id
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="El usuario ya es socio de este club")

    nuevo_socio = Socio(
        club_id=socio_in.club_id,
        usuario_id=socio_in.usuario_id,
        nombre=socio_in.nombre,
        email=socio_in.email,
        telefono=socio_in.telefono,
        fecha_nacimiento=socio_in.fecha_nacimiento,
        direccion=socio_in.direccion,
        especialidades=socio_in.especialidades,
        estado=socio_in.estado
    )
    db.add(nuevo_socio)
    db.commit()
    db.refresh(nuevo_socio)
    nuevo_socio.tiene_foto = False
    return nuevo_socio


@router.get("/{socio_id}", response_model=SocioResponse)
async def obtener_socio(
    socio_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    socio = db.query(Socio).filter(Socio.id == socio_id).first()
    if not socio:
        raise HTTPException(status_code=404, detail="Socio no encontrado")
        
    # Permisos? Miembro del club o Admin
    # Por ahora abierto a autenticados para simplificar MVP funcional
    
    socio.tiene_foto = socio.foto_carnet_blob is not None
    return socio


@router.put("/{socio_id}", response_model=SocioResponse)
async def actualizar_socio(
    socio_id: int,
    socio_in: SocioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    socio_db = db.query(Socio).filter(Socio.id == socio_id).first()
    if not socio_db:
        raise HTTPException(status_code=404, detail="Socio no encontrado")
        
    _check_permission(db, current_user, socio_db.club_id)
    
    stored_data = socio_in.model_dump(exclude_unset=True)
    for key, value in stored_data.items():
        setattr(socio_db, key, value)
        
    db.commit()
    db.refresh(socio_db)
    socio_db.tiene_foto = socio_db.foto_carnet_blob is not None
    return socio_db


@router.post("/{socio_id}/foto")
async def subir_foto_socio(
    socio_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    socio_db = db.query(Socio).filter(Socio.id == socio_id).first()
    if not socio_db:
        raise HTTPException(status_code=404, detail="Socio no encontrado")
    
    _check_permission(db, current_user, socio_db.club_id)
    
    # Validar tipo de archivo (opcional)
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Formato de imagen no soportado")

    contents = await file.read()
    socio_db.foto_carnet_blob = contents
    socio_db.foto_carnet_mime = file.content_type
    socio_db.foto_carnet_fecha_subida = datetime.now()
    
    db.commit()
    return {"message": "Foto actualizada correctamente"}


@router.get("/{socio_id}/foto")
async def obtener_foto_socio(
    socio_id: int,
    db: Session = Depends(get_db)
):
    socio_db = db.query(Socio).filter(Socio.id == socio_id).first()
    if not socio_db or not socio_db.foto_carnet_blob:
         # Retornar imagen por defecto o 404? 404 es mejor para API
        raise HTTPException(status_code=404, detail="Foto no encontrada")
        
    return Response(
        content=socio_db.foto_carnet_blob, 
        media_type=socio_db.foto_carnet_mime or "image/jpeg"
    )
