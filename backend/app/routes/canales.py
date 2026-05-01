"""Endpoints de Canales - Coordinación de frecuencias entre pilotos"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.usuario import Usuario
from app.models.miembro_club import MiembroClub
from app.routes.auth import get_current_user
from app.schemas.canal import CanalesPanel, CanalOcupacionResponse
from app.services.canal_service import CanalService, TOTAL_CANALES

router = APIRouter()


def verificar_es_miembro(db: Session, usuario_id: int, club_id: int) -> bool:
    miembro = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == usuario_id,
        MiembroClub.club_id == club_id,
        MiembroClub.estado == "activo"
    ).first()
    return miembro is not None


@router.get("/{club_id}/canales", response_model=CanalesPanel)
async def obtener_panel_canales(
    club_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener el estado completo del panel de canales"""
    if not current_user.es_superadmin and not verificar_es_miembro(db, current_user.id, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No eres miembro de este club")

    return CanalService.obtener_panel(db, club_id)


@router.post("/{club_id}/canales/{canal_numero}/ocupar")
async def ocupar_canal(
    club_id: int,
    canal_numero: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ocupar un canal"""
    if canal_numero < 1 or canal_numero > TOTAL_CANALES:
        raise HTTPException(status_code=400, detail=f"Canal debe estar entre 1 y {TOTAL_CANALES}")

    if not current_user.es_superadmin and not verificar_es_miembro(db, current_user.id, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No eres miembro de este club")

    try:
        CanalService.ocupar_canal(db, club_id, canal_numero, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return CanalService.obtener_panel(db, club_id)


@router.post("/{club_id}/canales/{canal_numero}/liberar")
async def liberar_canal(
    club_id: int,
    canal_numero: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Liberar un canal (dejar de ocuparlo)"""
    if canal_numero < 1 or canal_numero > TOTAL_CANALES:
        raise HTTPException(status_code=400, detail=f"Canal debe estar entre 1 y {TOTAL_CANALES}")

    if not current_user.es_superadmin and not verificar_es_miembro(db, current_user.id, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No eres miembro de este club")

    CanalService.liberar_canal(db, club_id, canal_numero, current_user.id)
    return CanalService.obtener_panel(db, club_id)


@router.post("/{club_id}/canales/{canal_numero}/vuelo")
async def toggle_vuelo(
    club_id: int,
    canal_numero: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle del estado de vuelo en un canal"""
    if canal_numero < 1 or canal_numero > TOTAL_CANALES:
        raise HTTPException(status_code=400, detail=f"Canal debe estar entre 1 y {TOTAL_CANALES}")

    if not current_user.es_superadmin and not verificar_es_miembro(db, current_user.id, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No eres miembro de este club")

    result = CanalService.toggle_vuelo(db, club_id, canal_numero, current_user.id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No puedes volar: hay otro piloto volando en este canal o no estás en el canal"
        )

    return CanalService.obtener_panel(db, club_id)
