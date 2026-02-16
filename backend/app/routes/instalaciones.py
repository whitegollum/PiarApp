from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.usuario import Usuario
from app.models.club import Club
from app.models.instalacion import ContrasenaInstalacion
from app.models.miembro_club import MiembroClub
from app.schemas.instalacion import ContrasenaCreate, ContrasenaResponse, ContrasenaHistory
from app.routes.auth import get_current_user
from typing import List

router = APIRouter()

# ==================== CONTRASEÑA DE INSTALACIONES ====================

@router.get("/clubes/{club_id}/instalacion/password", response_model=ContrasenaResponse)
async def obtener_contrasena_actual(
    club_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener la contraseña actual de las instalaciones.
    Requiere ser miembro activo del club.
    """
    # Verificar membresía activa
    miembro_act = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id,
        MiembroClub.estado == "activo"
    ).first()

    if not miembro_act:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Debes ser miembro activo del club para ver la contraseña"
        )
    
    # Buscar la última contraseña activa de ese club
    contrasena = db.query(ContrasenaInstalacion).filter(
        ContrasenaInstalacion.club_id == club_id,
        ContrasenaInstalacion.activa == True
    ).order_by(ContrasenaInstalacion.fecha_creacion.desc()).first()

    if not contrasena:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se ha configurado contraseña para este club"
        )
    
    return contrasena


@router.post("/clubes/{club_id}/instalacion/password", response_model=ContrasenaResponse)
async def crear_contrasena(
    club_id: int,
    contrasena_data: ContrasenaCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Establecer nueva contraseña para las instalaciones.
    (Solo Admin/Owner)
    """

    # Verificar rol
    miembro_admin = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id
    ).first()

    if not miembro_admin or miembro_admin.rol not in ["administrador", "propietario"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos de administrador"
        )
    
    # Desactivar contraseñas antiguas del club
    db.query(ContrasenaInstalacion).filter(
        ContrasenaInstalacion.club_id == club_id,
        ContrasenaInstalacion.activa == True
    ).update({"activa": False})

    # Crear nueva contraseña
    nueva_contrasena = ContrasenaInstalacion(
        club_id=club_id,
        codigo=contrasena_data.codigo,
        descripcion=contrasena_data.descripcion,
        creado_por_id=current_user.id,
        activa=True
    )
    
    db.add(nueva_contrasena)
    db.commit()
    db.refresh(nueva_contrasena)

    return nueva_contrasena


@router.get("/clubes/{club_id}/instalacion/history", response_model=List[ContrasenaHistory])
async def historial_contrasenas(
    club_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Listar historial de contraseñas (auditoría).
    (Solo Admin/Owner)
    """
    
    miembro_admin = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id
    ).first()

    if not miembro_admin or miembro_admin.rol not in ["administrador", "propietario"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden ver el historial"
        )
    
    return db.query(ContrasenaInstalacion).filter(
        ContrasenaInstalacion.club_id == club_id
    ).order_by(ContrasenaInstalacion.fecha_creacion.desc()).all()

