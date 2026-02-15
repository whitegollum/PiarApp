"""Endpoints de gestión de eventos"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.usuario import Usuario
from app.models.evento import Evento
from app.models.club import Club
from app.models.miembro_club import MiembroClub
from app.models.asistencia import AsistenciaEvento
from app.schemas.evento import EventoCreate, EventoResponse, EventoUpdate
from app.schemas.asistencia import AsistenciaCreate, AsistenciaResponse, AsistenciaUpdate
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
        nombre=evento_create.nombre,
        descripcion=evento_create.descripcion,
        tipo=evento_create.tipo,
        fecha_inicio=evento_create.fecha_inicio,
        fecha_fin=evento_create.fecha_fin,
        hora_inicio=evento_create.hora_inicio,
        hora_fin=evento_create.hora_fin,
        ubicacion=evento_create.ubicacion,
        aforo_maximo=evento_create.aforo_maximo,
        requisitos=evento_create.requisitos,
        imagen_url=evento_create.imagen_url,
        permite_comentarios=evento_create.permite_comentarios,
        contacto_responsable_id=current_user.id
    )
    
    db.add(nuevo_evento)
    db.commit()
    db.refresh(nuevo_evento)
    
    return EventoResponse.model_validate(nuevo_evento)


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
    
    # Calcular inscritos para cada evento
    results = []
    for evento in eventos:
        inscritos = db.query(AsistenciaEvento).filter(
            AsistenciaEvento.evento_id == evento.id,
            AsistenciaEvento.estado == "inscrito"
        ).count()
        
        # Convertir a dict y agregar campo extra
        # Nota: EventoResponse.model_validate(evento) fallaría validación si el campo es obligatorio y no está en el modelo
        # Pero como agregamos inscritos_count con default=0 al schema, validará lo del modelo y usará 0.
        # Luego nosotros lo sobrescribimos.
        
        evento_resp = EventoResponse.model_validate(evento)
        evento_resp.inscritos_count = inscritos
        results.append(evento_resp)
        
    return results


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
    
    # Calcular inscritos
    inscritos = db.query(AsistenciaEvento).filter(
        AsistenciaEvento.evento_id == evento.id,
        AsistenciaEvento.estado == "inscrito"
    ).count()
    
    response = EventoResponse.model_validate(evento)
    response.inscritos_count = inscritos
    return response


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
    for field, value in evento_update.model_dump(exclude_unset=True).items():
        setattr(evento, field, value)
    
    db.commit()
    db.refresh(evento)
    
    # Calcular inscritos
    inscritos = db.query(AsistenciaEvento).filter(
        AsistenciaEvento.evento_id == evento.id,
        AsistenciaEvento.estado == "inscrito"
    ).count()
    
    response = EventoResponse.model_validate(evento)
    response.inscritos_count = inscritos
    return response


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


# ==================== ASISTENCIA (RSVP) ====================

@router.post("/clubes/{club_id}/eventos/{evento_id}/asistencia", response_model=AsistenciaResponse)
async def registrar_asistencia(
    club_id: int,
    evento_id: int,
    asistencia_in: AsistenciaCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Registrar o actualizar asistencia a un evento"""
    
    # 1. Verificar membresía
    miembro = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id,
        MiembroClub.estado == "activo"
    ).first()
    
    if not miembro:
        raise HTTPException(status_code=403, detail="Debes ser miembro del club para inscribirte")

    # 2. Verificar evento
    evento = db.query(Evento).filter(Evento.id == evento_id, Evento.club_id == club_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    # 3. Verificar estado previo
    asistencia = db.query(AsistenciaEvento).filter(
        AsistenciaEvento.evento_id == evento_id,
        AsistenciaEvento.usuario_id == current_user.id
    ).first()

    nuevo_estado = asistencia_in.estado
    
    # 4. Control de Aforo (si se está inscribiendo)
    if nuevo_estado == "inscrito" and (not asistencia or asistencia.estado != "inscrito"):
        if evento.aforo_maximo:
            inscritos = db.query(AsistenciaEvento).filter(
                AsistenciaEvento.evento_id == evento_id,
                AsistenciaEvento.estado == "inscrito"
            ).count()
            
            if inscritos >= evento.aforo_maximo:
                nuevo_estado = "lista_espera" # Auto-move to waitlist
                # Opcional: Avisar al usuario que quedo en espera

    if asistencia:
        asistencia.estado = nuevo_estado
        asistencia.fecha_actualizacion = datetime.now()
    else:
        asistencia = AsistenciaEvento(
            evento_id=evento_id,
            usuario_id=current_user.id,
            estado=nuevo_estado
        )
        db.add(asistencia)
    
    db.commit()
    db.refresh(asistencia)
    return AsistenciaResponse.model_validate(asistencia)


@router.get("/clubes/{club_id}/eventos/{evento_id}/asistencia", response_model=list[AsistenciaResponse])
async def listar_asistentes(
    club_id: int,
    evento_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar asistentes a un evento (para ver quién va)"""
    
    # Solo miembros activos ven la lista
    miembro = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id,
        MiembroClub.estado == "activo"
    ).first()
    
    if not miembro:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    # Obtener lista (inscritos y lista_espera, excluidos cancelados para limpieza visual?)
    # Generalmente se quiere ver quien va.
    asistentes = db.query(AsistenciaEvento).filter(
        AsistenciaEvento.evento_id == evento_id,
        AsistenciaEvento.estado.in_(["inscrito", "lista_espera"])
    ).all()
    
    # Eager load usuario if needed, but Pydantic creates user info from relationship?
    # Relationship is defined in model, schema has UserResponse.
    # We might need to make sure User is loaded.
    
    return [AsistenciaResponse.model_validate(a) for a in asistentes]


@router.get("/clubes/{club_id}/eventos/{evento_id}/mi-asistencia", response_model=AsistenciaResponse)
async def obtener_mi_asistencia(
    club_id: int,
    evento_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ver mi estado actual de inscripción"""
    asistencia = db.query(AsistenciaEvento).filter(
        AsistenciaEvento.evento_id == evento_id,
        AsistenciaEvento.usuario_id == current_user.id
    ).first()
    
    if not asistencia:
        # Retornar objeto vacío/dummy o 404? 
        # Mejor 404 para que el front sepa que no hay registro
        raise HTTPException(status_code=404, detail="No inscrito")

    return AsistenciaResponse.model_validate(asistencia)

