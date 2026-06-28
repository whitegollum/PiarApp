"""Endpoints de Tareas Comunitarias"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.db import get_db
from app.models.usuario import Usuario
from app.models.miembro_club import MiembroClub
from app.routes.auth import get_current_user
from app.schemas.tareas_comunitarias import (
    TareaComunitariaCreate, TareaComunitariaUpdate, TareaComunitariaResponse,
    ParticipanteTareaResponse, RankingEntry,
    PeriodoPremiosCreate, PeriodoPremiosResponse,
    PremioCreate, PremioResponse, RechazoTareaRequest
)
from app.services.tareas_comunitarias_service import TareasComunitariasService

router = APIRouter()

_ERRORES_NOT_FOUND = {"Tarea no encontrada", "Periodo no encontrado"}


def _http_desde_error_servicio(result: dict) -> None:
    error = result.get("error", "Error desconocido")
    if error in _ERRORES_NOT_FOUND:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=error)
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)


def verificar_es_admin(db: Session, usuario_id: int, club_id: int) -> bool:
    miembro = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == usuario_id,
        MiembroClub.club_id == club_id
    ).first()
    if not miembro:
        return False
    return miembro.rol in ["administrador", "propietario"]


def verificar_es_miembro(db: Session, usuario_id: int, club_id: int) -> bool:
    miembro = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == usuario_id,
        MiembroClub.club_id == club_id,
        MiembroClub.estado == "activo"
    ).first()
    return miembro is not None


# ==================== TAREAS ====================

@router.post("/{club_id}/tareas-comunitarias", response_model=TareaComunitariaResponse)
async def crear_tarea(
    club_id: int,
    data: TareaComunitariaCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.es_superadmin and not verificar_es_admin(db, current_user.id, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores pueden crear tareas")
    tarea = TareasComunitariasService.crear_tarea(db, club_id, data, current_user.id)
    return _tarea_to_response(tarea)


@router.get("/{club_id}/tareas-comunitarias", response_model=List[TareaComunitariaResponse])
async def listar_tareas(
    club_id: int,
    estado: Optional[str] = None,
    categoria: Optional[str] = None,
    prioridad: Optional[str] = None,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.es_superadmin and not verificar_es_miembro(db, current_user.id, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    tareas = TareasComunitariasService.listar_tareas(db, club_id, estado, categoria, prioridad)
    return [_tarea_to_response(t) for t in tareas]


@router.get("/{club_id}/tareas-comunitarias/{tarea_id}", response_model=TareaComunitariaResponse)
async def obtener_tarea(
    club_id: int,
    tarea_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.es_superadmin and not verificar_es_miembro(db, current_user.id, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    tarea = TareasComunitariasService.obtener_tarea(db, tarea_id)
    if not tarea or tarea.club_id != club_id:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return _tarea_to_response(tarea)


@router.put("/{club_id}/tareas-comunitarias/{tarea_id}", response_model=TareaComunitariaResponse)
async def actualizar_tarea(
    club_id: int,
    tarea_id: int,
    data: TareaComunitariaUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.es_superadmin and not verificar_es_admin(db, current_user.id, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores pueden editar tareas")
    tarea = TareasComunitariasService.actualizar_tarea(db, tarea_id, data)
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return _tarea_to_response(tarea)


@router.delete("/{club_id}/tareas-comunitarias/{tarea_id}")
async def eliminar_tarea(
    club_id: int,
    tarea_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.es_superadmin and not verificar_es_admin(db, current_user.id, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores pueden eliminar tareas")
    ok = TareasComunitariasService.eliminar_tarea(db, tarea_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return {"detail": "Tarea eliminada"}


@router.post("/{club_id}/tareas-comunitarias/{tarea_id}/inscribirse")
async def inscribirse(
    club_id: int,
    tarea_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.es_superadmin and not verificar_es_miembro(db, current_user.id, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    result = TareasComunitariasService.inscribir_usuario(db, tarea_id, current_user.id)
    if "error" in result:
        _http_desde_error_servicio(result)
    return {"detail": "Inscripción exitosa"}


@router.delete("/{club_id}/tareas-comunitarias/{tarea_id}/inscribirse")
async def desinscribirse(
    club_id: int,
    tarea_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.es_superadmin and not verificar_es_miembro(db, current_user.id, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    result = TareasComunitariasService.desinscribir_usuario(db, tarea_id, current_user.id)
    if "error" in result:
        _http_desde_error_servicio(result)
    return {"detail": "Desinscripción exitosa"}


@router.post("/{club_id}/tareas-comunitarias/{tarea_id}/aprobar")
async def aprobar_tarea(
    club_id: int,
    tarea_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.es_superadmin and not verificar_es_admin(db, current_user.id, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores pueden aprobar tareas")
    result = TareasComunitariasService.aprobar_tarea(db, tarea_id)
    if "error" in result:
        _http_desde_error_servicio(result)
    return result


@router.post("/{club_id}/tareas-comunitarias/{tarea_id}/rechazar")
async def rechazar_tarea(
    club_id: int,
    tarea_id: int,
    data: RechazoTareaRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.es_superadmin and not verificar_es_admin(db, current_user.id, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores pueden rechazar tareas")
    result = TareasComunitariasService.rechazar_tarea(db, tarea_id, data.motivo)
    if "error" in result:
        _http_desde_error_servicio(result)
    return result


# ==================== RANKING ====================

@router.get("/{club_id}/ranking", response_model=List[RankingEntry])
async def obtener_ranking(
    club_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.es_superadmin and not verificar_es_miembro(db, current_user.id, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    return TareasComunitariasService.obtener_ranking(db, club_id)


@router.get("/{club_id}/ranking/periodo/{periodo_id}", response_model=List[RankingEntry])
async def obtener_ranking_periodo(
    club_id: int,
    periodo_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.es_superadmin and not verificar_es_miembro(db, current_user.id, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    return TareasComunitariasService.obtener_ranking(db, club_id, periodo_id)


# ==================== PERIODOS Y PREMIOS ====================

@router.post("/{club_id}/periodos-premios", response_model=PeriodoPremiosResponse)
async def crear_periodo(
    club_id: int,
    data: PeriodoPremiosCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.es_superadmin and not verificar_es_admin(db, current_user.id, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores")
    periodo = TareasComunitariasService.crear_periodo(db, club_id, data)
    return _periodo_to_response(periodo)


@router.get("/{club_id}/periodos-premios", response_model=List[PeriodoPremiosResponse])
async def listar_periodos(
    club_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.es_superadmin and not verificar_es_miembro(db, current_user.id, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    periodos = TareasComunitariasService.listar_periodos(db, club_id)
    return [_periodo_to_response(p) for p in periodos]


@router.get("/{club_id}/periodos-premios/{periodo_id}", response_model=PeriodoPremiosResponse)
async def obtener_periodo(
    club_id: int,
    periodo_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.es_superadmin and not verificar_es_miembro(db, current_user.id, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    periodo = TareasComunitariasService.obtener_periodo(db, periodo_id)
    if not periodo or periodo.club_id != club_id:
        raise HTTPException(status_code=404, detail="Periodo no encontrado")
    return _periodo_to_response(periodo)


@router.post("/{club_id}/periodos-premios/{periodo_id}/cerrar")
async def cerrar_periodo(
    club_id: int,
    periodo_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.es_superadmin and not verificar_es_admin(db, current_user.id, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores")
    result = TareasComunitariasService.cerrar_periodo(db, periodo_id)
    if "error" in result:
        _http_desde_error_servicio(result)
    return result


@router.post("/{club_id}/periodos-premios/{periodo_id}/confirmar")
async def confirmar_premios(
    club_id: int,
    periodo_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.es_superadmin and not verificar_es_admin(db, current_user.id, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores")
    result = TareasComunitariasService.confirmar_premios(db, periodo_id)
    if "error" in result:
        _http_desde_error_servicio(result)
    return result


@router.post("/{club_id}/periodos-premios/{periodo_id}/premios", response_model=PremioResponse)
async def crear_premio(
    club_id: int,
    periodo_id: int,
    data: PremioCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.es_superadmin and not verificar_es_admin(db, current_user.id, club_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores")
    premio = TareasComunitariasService.crear_premio(db, periodo_id, club_id, data)
    return _premio_to_response(premio, db)


# ==================== HELPERS ====================

def _tarea_to_response(tarea) -> dict:
    participantes = []
    for p in tarea.participantes:
        nombre = p.usuario.nombre_completo if p.usuario else None
        participantes.append(ParticipanteTareaResponse(
            id=p.id,
            tarea_id=p.tarea_id,
            usuario_id=p.usuario_id,
            fecha_inscripcion=p.fecha_inscripcion,
            puntos_otorgados=p.puntos_otorgados,
            nombre_usuario=nombre
        ))
    return TareaComunitariaResponse(
        id=tarea.id,
        club_id=tarea.club_id,
        titulo=tarea.titulo,
        descripcion=tarea.descripcion,
        puntos=tarea.puntos,
        categoria=tarea.categoria,
        prioridad=tarea.prioridad,
        fecha_limite=tarea.fecha_limite,
        max_participantes=tarea.max_participantes,
        estado=tarea.estado,
        motivo_rechazo=tarea.motivo_rechazo,
        creador_id=tarea.creador_id,
        created_at=tarea.created_at,
        updated_at=tarea.updated_at,
        participantes=participantes,
        num_participantes=len(participantes)
    )


def _periodo_to_response(periodo) -> PeriodoPremiosResponse:
    premios = []
    for p in periodo.premios:
        nombre_usuario = p.usuario.nombre_completo if p.usuario else None
        premios.append(PremioResponse(
            id=p.id,
            periodo_id=p.periodo_id,
            club_id=p.club_id,
            nombre=p.nombre,
            descripcion=p.descripcion,
            posicion=p.posicion,
            usuario_id=p.usuario_id,
            nombre_usuario=nombre_usuario,
            confirmado=p.confirmado,
            created_at=p.created_at
        ))
    return PeriodoPremiosResponse(
        id=periodo.id,
        club_id=periodo.club_id,
        nombre=periodo.nombre,
        fecha_inicio=periodo.fecha_inicio,
        fecha_fin=periodo.fecha_fin,
        tipo=periodo.tipo,
        estado=periodo.estado,
        created_at=periodo.created_at,
        premios=premios
    )


def _premio_to_response(premio, db) -> PremioResponse:
    nombre_usuario = None
    if premio.usuario_id:
        from app.models.usuario import Usuario
        usuario = db.query(Usuario).filter(Usuario.id == premio.usuario_id).first()
        nombre_usuario = usuario.nombre_completo if usuario else None
    return PremioResponse(
        id=premio.id,
        periodo_id=premio.periodo_id,
        club_id=premio.club_id,
        nombre=premio.nombre,
        descripcion=premio.descripcion,
        posicion=premio.posicion,
        usuario_id=premio.usuario_id,
        nombre_usuario=nombre_usuario,
        confirmado=premio.confirmado,
        created_at=premio.created_at
    )
