"""Endpoints de Invitados - Acceso por QR sin autenticación"""
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.usuario import Usuario
from app.models.club import Club
from app.models.miembro_club import MiembroClub
from app.routes.auth import get_current_user
from app.services.nombre_generator import generar_nombre_cerdo
from app.services.canal_service import CanalService, TOTAL_CANALES
from app.services.invitado_service import InvitadoService
from app.schemas.invitado import (
    InvitadoUnirseRequest,
    InvitadoSesionResponse,
    CanalesPanelInvitado,
    QRInvitadoResponse,
    InvitadoCambiarNombreRequest,
)
from app.config import settings

router = APIRouter()


def _verificar_es_miembro(db: Session, usuario_id: int, club_id: int) -> bool:
    return db.query(MiembroClub).filter(
        MiembroClub.usuario_id == usuario_id,
        MiembroClub.club_id == club_id,
        MiembroClub.estado == "activo",
    ).first() is not None


def _get_sesion_o_404(db: Session, token: str, club_id: int):
    sesion = InvitadoService.obtener_sesion(db, token, club_id)
    if not sesion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión de invitado no encontrada o expirada",
        )
    return sesion


# ─── Endpoint para socios: obtener URL/token del QR ─────────────────────────

@router.get("/clubes/{club_id}/qr-invitado", response_model=QRInvitadoResponse)
async def obtener_qr_invitado(
    club_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Devuelve el token QR del club (lo genera si no existe). Requiere ser miembro."""
    if not current_user.es_superadmin and not _verificar_es_miembro(db, current_user.id, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No eres miembro de este club")

    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club no encontrado")

    if not club.token_qr:
        club.token_qr = str(uuid.uuid4())
        db.commit()

    url = f"{settings.frontend_url}/invitado/{club.token_qr}"
    return QRInvitadoResponse(token_qr=club.token_qr, url=url)


# ─── Endpoints públicos para invitados (solo validación por token de sesión) ─

@router.post("/invitados/unirse", response_model=InvitadoSesionResponse)
async def unirse_como_invitado(
    body: InvitadoUnirseRequest,
    db: Session = Depends(get_db),
):
    """Crea o recupera una sesión de invitado. No requiere autenticación."""
    try:
        sesion = InvitadoService.unirse(
            db,
            token_qr=body.token_qr,
            nombre=body.nombre,
            token_existente=body.token_existente,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return InvitadoSesionResponse(
        token=sesion.token,
        club_id=sesion.club_id,
        nombre=sesion.nombre,
        canal_numero=sesion.canal_numero,
        en_vuelo=sesion.en_vuelo,
    )


@router.get("/invitados/{token}/clubes/{club_id}/canales", response_model=CanalesPanelInvitado)
async def panel_canales_invitado(
    token: str,
    club_id: int,
    db: Session = Depends(get_db),
):
    """Panel de canales para el invitado, incluye su estado personal."""
    sesion = _get_sesion_o_404(db, token, club_id)
    panel = CanalService.obtener_panel(db, club_id)
    return CanalesPanelInvitado(
        canales=panel.canales,
        mi_canal=sesion.canal_numero,
        en_vuelo=sesion.en_vuelo,
        mi_nombre=sesion.nombre,
    )


@router.post("/invitados/{token}/clubes/{club_id}/canales/{canal_numero}/ocupar", response_model=CanalesPanelInvitado)
async def ocupar_canal_invitado(
    token: str,
    club_id: int,
    canal_numero: int,
    db: Session = Depends(get_db),
):
    """El invitado ocupa un canal (libera el anterior automáticamente)."""
    if canal_numero < 1 or canal_numero > TOTAL_CANALES:
        raise HTTPException(status_code=400, detail=f"Canal debe estar entre 1 y {TOTAL_CANALES}")

    sesion = _get_sesion_o_404(db, token, club_id)
    sesion = InvitadoService.ocupar_canal(db, sesion, canal_numero)
    panel = CanalService.obtener_panel(db, club_id)
    return CanalesPanelInvitado(
        canales=panel.canales,
        mi_canal=sesion.canal_numero,
        en_vuelo=sesion.en_vuelo,
        mi_nombre=sesion.nombre,
    )


@router.post("/invitados/{token}/clubes/{club_id}/liberar", response_model=CanalesPanelInvitado)
async def liberar_canal_invitado(
    token: str,
    club_id: int,
    db: Session = Depends(get_db),
):
    """El invitado sale del canal que ocupa."""
    sesion = _get_sesion_o_404(db, token, club_id)
    sesion = InvitadoService.liberar_canal(db, sesion)
    panel = CanalService.obtener_panel(db, club_id)
    return CanalesPanelInvitado(
        canales=panel.canales,
        mi_canal=sesion.canal_numero,
        en_vuelo=sesion.en_vuelo,
        mi_nombre=sesion.nombre,
    )


@router.patch("/invitados/{token}/clubes/{club_id}/nombre", response_model=InvitadoSesionResponse)
async def cambiar_nombre_invitado(
    token: str,
    club_id: int,
    body: InvitadoCambiarNombreRequest,
    db: Session = Depends(get_db),
):
    """El invitado cambia su nombre en cualquier momento."""
    sesion = _get_sesion_o_404(db, token, club_id)
    nombre_final = (
        f"Cerdo {body.nombre.strip().capitalize()}"
        if body.nombre and body.nombre.strip()
        else None
    )
    if not nombre_final:
        nombre_final = generar_nombre_cerdo()
    sesion.nombre = nombre_final
    sesion.last_active = datetime.utcnow()
    db.commit()
    db.refresh(sesion)
    return InvitadoSesionResponse(
        token=sesion.token,
        club_id=sesion.club_id,
        nombre=sesion.nombre,
        canal_numero=sesion.canal_numero,
        en_vuelo=sesion.en_vuelo,
    )


@router.post("/invitados/{token}/clubes/{club_id}/vuelo", response_model=CanalesPanelInvitado)
async def toggle_vuelo_invitado(
    token: str,
    club_id: int,
    db: Session = Depends(get_db),
):
    """Toggle del estado de vuelo del invitado."""
    sesion = _get_sesion_o_404(db, token, club_id)
    try:
        sesion = InvitadoService.toggle_vuelo(db, sesion)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    panel = CanalService.obtener_panel(db, club_id)
    return CanalesPanelInvitado(
        canales=panel.canales,
        mi_canal=sesion.canal_numero,
        en_vuelo=sesion.en_vuelo,
        mi_nombre=sesion.nombre,
    )
