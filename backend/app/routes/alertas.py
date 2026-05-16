"""Endpoints de gestión de alertas"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database.db import get_db
from app.models.usuario import Usuario
from app.models.club import Club
from app.models.miembro_club import MiembroClub
from app.models.alerta import Alerta
from app.schemas.alerta import (
    AlertaResponse,
    AlertaListResponse,
    AlertaCountResponse,
    AlertaResolverRequest,
    AlertasConfigUpdate,
    AlertasConfigResponse,
    UsuarioAlertaInfo
)
from app.services.alerta_service import AlertaService
from app.routes.auth import get_current_user

router = APIRouter()


def verificar_es_admin(db: Session, usuario_id: int, club_id: int) -> bool:
    """Verificar si el usuario es admin del club"""
    miembro = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == usuario_id,
        MiembroClub.club_id == club_id
    ).first()
    
    if not miembro:
        return False
    
    return miembro.rol in ["administrador", "propietario"]


# ==================== ALERTAS DEL CLUB ====================

@router.get("/clubs/{club_id}/alertas", response_model=AlertaListResponse)
async def obtener_alertas_club(
    club_id: int,
    tipo: Optional[str] = None,
    subtipo: Optional[str] = None,
    severidad: Optional[str] = None,
    estado: str = "activa",
    usuario_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener alertas del club (Solo admins o superadmins)
    
    Filtros disponibles:
    - tipo: documento_por_vencer, documento_vencido
    - subtipo: carnet_piloto, seguro_rc
    - severidad: warning, danger, critical
    - estado: activa, resuelta, ignorada
    - usuario_id: filtrar por usuario específico
    """
    # Verificar permisos: Superadmin o admin del club
    if not current_user.es_superadmin and not verificar_es_admin(db, current_user.id, club_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ver las alertas de este club"
        )
    
    # Obtener alertas
    alertas, total = AlertaService.obtener_alertas_club(
        db=db,
        club_id=club_id,
        tipo=tipo,
        subtipo=subtipo,
        severidad=severidad,
        estado=estado,
        usuario_id=usuario_id,
        limit=limit,
        offset=offset
    )
    
    # Convertir a response (from_orm maneja automáticamente la relación usuario)
    alertas_response = [AlertaResponse.from_orm(alerta) for alerta in alertas]
    
    return AlertaListResponse(
        alertas=alertas_response,
        total=total
    )


@router.get("/clubs/{club_id}/alertas/count", response_model=AlertaCountResponse)
async def obtener_contador_alertas(
    club_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener contador de alertas activas por severidad (Solo admins o superadmins)
    Útil para mostrar badge con número de alertas
    """
    # Verificar permisos: Superadmin o admin del club
    if not current_user.es_superadmin and not verificar_es_admin(db, current_user.id, club_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ver las alertas de este club"
        )
    
    contador = AlertaService.obtener_contador_alertas(db, club_id)
    
    return AlertaCountResponse(**contador)


@router.post("/clubs/{club_id}/alertas/generar")
async def generar_alertas_club(
    club_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generar/actualizar alertas de documentación para el club (Solo admins o superadmins)
    Este endpoint debe ejecutarse periódicamente (diario) o puede ser manual
    """
    # Verificar permisos: Superadmin o admin del club
    if not current_user.es_superadmin and not verificar_es_admin(db, current_user.id, club_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para generar alertas de este club"
        )
    
    # Verificar que el club existe
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club no encontrado"
        )
    
    # Generar alertas
    stats = AlertaService.generar_alertas_documentacion_club(db, club_id)
    
    return {
        "mensaje": "Alertas procesadas correctamente",
        "estadisticas": stats
    }


# ==================== GESTIÓN DE ALERTAS ====================

@router.patch("/alertas/{alerta_id}/resolver")
async def resolver_alerta(
    alerta_id: int,
    request: AlertaResolverRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Resolver o ignorar una alerta (Solo admins del club o superadmins)
    
    Acciones:
    - "resolver": Marcar como resuelta
    - "ignorar": Marcar como ignorada
    """
    # Obtener la alerta
    alerta = db.query(Alerta).filter(Alerta.id == alerta_id).first()
    if not alerta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alerta no encontrada"
        )
    
    # Verificar permisos: Superadmin o admin del club
    if not current_user.es_superadmin and not verificar_es_admin(db, current_user.id, alerta.club_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para gestionar alertas de este club"
        )
    
    # Resolver o ignorar
    if request.accion == "resolver":
        alerta_actualizada = AlertaService.resolver_alerta(db, alerta_id, current_user.id)
    elif request.accion == "ignorar":
        alerta_actualizada = AlertaService.ignorar_alerta(db, alerta_id, current_user.id)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Acción no válida. Usa 'resolver' o 'ignorar'"
        )
    
    return {
        "mensaje": f"Alerta {request.accion}",
        "alerta": AlertaResponse.from_orm(alerta_actualizada)
    }


# ==================== ALERTAS DEL USUARIO ====================

@router.get("/alertas/mis-alertas", response_model=List[AlertaResponse])
async def obtener_mis_alertas(
    club_id: Optional[int] = None,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener alertas activas del usuario autenticado
    Opcionalmente filtrar por club_id
    """
    alertas = AlertaService.obtener_alertas_usuario(
        db=db,
        usuario_id=current_user.id,
        club_id=club_id,
        solo_activas=True
    )
    
    return [AlertaResponse.from_orm(alerta) for alerta in alertas]


# ==================== CONFIGURACIÓN DE ALERTAS ====================

@router.get("/clubs/{club_id}/alertas/config", response_model=AlertasConfigResponse)
async def obtener_config_alertas(
    club_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener configuración de alertas del club (Solo admins o superadmins)"""
    # Verificar permisos: Superadmin o admin del club
    if not current_user.es_superadmin and not verificar_es_admin(db, current_user.id, club_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ver la configuración de este club"
        )
    
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club no encontrado"
        )
    
    return AlertasConfigResponse(
        alertas_documentacion_enabled=club.alertas_documentacion_enabled or False,
        alertas_doc_ausente_enabled=club.alertas_doc_ausente_enabled if club.alertas_doc_ausente_enabled is not None else True,
        dias_aviso_previo=club.alertas_dias_aviso_previo or 30,
        dias_critico=club.alertas_dias_critico or 60
    )


@router.patch("/clubs/{club_id}/alertas/config")
async def actualizar_config_alertas(
    club_id: int,
    config: AlertasConfigUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar configuración de alertas del club (Solo admins o superadmins)"""
    # Verificar permisos: Superadmin o admin del club
    if not current_user.es_superadmin and not verificar_es_admin(db, current_user.id, club_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar la configuración de este club"
        )
    
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club no encontrado"
        )
    
    # Actualizar configuración
    club.alertas_documentacion_enabled = config.alertas_documentacion_enabled
    club.alertas_doc_ausente_enabled = config.alertas_doc_ausente_enabled
    if config.dias_aviso_previo is not None:
        club.alertas_dias_aviso_previo = config.dias_aviso_previo
    if config.dias_critico is not None:
        club.alertas_dias_critico = config.dias_critico

    db.commit()
    db.refresh(club)

    return {
        "mensaje": "Configuración de alertas actualizada correctamente",
        "config": AlertasConfigResponse(
            alertas_documentacion_enabled=club.alertas_documentacion_enabled,
            alertas_doc_ausente_enabled=club.alertas_doc_ausente_enabled if club.alertas_doc_ausente_enabled is not None else True,
            dias_aviso_previo=club.alertas_dias_aviso_previo,
            dias_critico=club.alertas_dias_critico
        )
    }
