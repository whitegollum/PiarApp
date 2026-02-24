"""Endpoints de gestión de clubes"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.usuario import Usuario
from app.models.club import Club
from app.models.miembro_club import MiembroClub
from app.models.noticia import Noticia
from app.schemas.club import ClubCreate, ClubUpdate, ClubResponse, MiembroClubResponse, MiembroRolUpdate
from app.schemas.noticia import NoticiaResponse
from app.services.invitacion_service import InvitacionService
from app.routes.auth import get_current_user

router = APIRouter()


# ==================== CLUBES ====================

@router.post("", response_model=ClubResponse)
async def crear_club(
    club_create: ClubCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear nuevo club (Solo Superadmin)"""
    
    if not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los superadministradores pueden crear clubes"
        )
    
    # Verificar que el slug sea único
    club_existente = db.query(Club).filter(Club.slug == club_create.slug).first()
    if club_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El slug del club ya está en uso"
        )
    
    # Crear el club
    nuevo_club = Club(
        nombre=club_create.nombre,
        slug=club_create.slug,
        descripcion=club_create.descripcion,
        creador_id=current_user.id  # Asignar el usuario como creador
    )
    
    db.add(nuevo_club)
    db.flush()  # Para obtener el ID sin hacer commit
    
    # Agregar el creador como miembro administrador
    miembro_admin = MiembroClub(
        usuario_id=current_user.id,
        club_id=nuevo_club.id,
        rol="administrador",
        estado="activo"
    )
    
    db.add(miembro_admin)
    db.commit()
    db.refresh(nuevo_club)
    
    return ClubResponse.model_validate(nuevo_club)


@router.get("/mi-rol/{club_id}", response_model=dict)
async def obtener_mi_rol(
    club_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener el rol del usuario en un club específico"""
    
    # 1. Buscar si es miembro directo
    miembro = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id,
        MiembroClub.estado == "activo"
    ).first()
    
    if miembro:
        return {"rol": miembro.rol}
        
    # 2. Si es superadmin global, considerar administrador
    if current_user.es_superadmin:
        return {"rol": "administrador"}
        
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="No eres miembro de este club"
    )


@router.get("", response_model=list)
async def listar_clubes_usuario(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar clubes del usuario actual"""
    
    miembros = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.estado == "activo"
    ).all()
    
    clubes = [miembro.club for miembro in miembros]
    return [ClubResponse.model_validate(club) for club in clubes]


@router.get("/{club_id}", response_model=ClubResponse)
async def get_club(
    club_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener detalles del club"""
    
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
    
    club = db.query(Club).filter(Club.id == club_id).first()
    
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club no encontrado"
        )
    
    return ClubResponse.model_validate(club)


@router.put("/{club_id}", response_model=ClubResponse)
async def actualizar_club(
    club_id: int,
    club_update: ClubUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar detalles del club (solo administradores)"""
    
    # Verificar que el usuario es administrador del club
    miembro = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id,
        MiembroClub.rol == "administrador"
    ).first()
    
    if not miembro:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para actualizar este club"
        )
    
    club = db.query(Club).filter(Club.id == club_id).first()
    
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club no encontrado"
        )
    
    # Actualizar campos permitidos
    update_data = club_update.dict(exclude_unset=True)
    allowed_fields = {
        "nombre", "descripcion", "logo_url", 
        "color_primario", "color_secundario", "color_acento",
        "pais", "region", "email_contacto", "telefono", "sitio_web",
        "latitud", "longitud"
    }
    
    for field, value in update_data.items():
        if field in allowed_fields and hasattr(club, field):
            setattr(club, field, value)
    
    db.commit()
    db.refresh(club)
    
    return ClubResponse.model_validate(club)


# ==================== MIEMBROS ====================

@router.get("/{club_id}/miembros", response_model=list)
async def listar_miembros(
    club_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar miembros del club"""
    
    # Verificar que el usuario es miembro del club
    miembro_usuario = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id
    ).first()
    
    if not miembro_usuario:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este club"
        )
    
    miembros = db.query(MiembroClub).filter(
        MiembroClub.club_id == club_id,
        MiembroClub.estado == "activo"
    ).all()
    
    return [MiembroClubResponse.model_validate(m) for m in miembros]


@router.post("/{club_id}/miembros/invitar", response_model=dict)
async def invitar_miembro(
    club_id: int,
    invitacion_data: dict,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Invitar miembro al club (solo administradores)"""
    
    email_a_invitar = invitacion_data.get("email")
    rol = invitacion_data.get("rol", "miembro")
    
    # Verificar que el usuario es administrador del club
    miembro_admin = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id,
        MiembroClub.rol == "administrador"
    ).first()
    
    if not miembro_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden invitar miembros"
        )
    
    # Verificar que el club existe
    club = db.query(Club).filter(Club.id == club_id).first()
    
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club no encontrado"
        )
    
    # Crear invitación
    invitacion = InvitacionService.crear_invitacion(
        db,
        club_id,
        email_a_invitar,
        rol,
        creado_por_id=current_user.id
    )
    
    return {
        "message": "Invitación creada exitosamente",
        "token": invitacion.token,
        "email": invitacion.email
    }


@router.get("/{club_id}/miembros/invitaciones", response_model=list)
async def listar_invitaciones_club(
    club_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar invitaciones pendientes del club (solo administradores)"""
    
    # Verificar que el usuario es administrador del club
    miembro_admin = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id,
        MiembroClub.rol == "administrador"
    ).first()
    
    if not miembro_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden ver invitaciones"
        )
    
    invitaciones = InvitacionService.obtener_invitaciones_del_club(db, club_id)
    
    return [
        {
            "email": inv.email,
            "estado": inv.estado,
            "rol": inv.rol,
            "fecha_creacion": inv.fecha_creacion
        }
        for inv in invitaciones
    ]


@router.delete("/{club_id}/miembros/{usuario_id}", response_model=dict)
async def remover_miembro(
    club_id: int,
    usuario_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remover miembro del club (solo administradores)"""
    
    # Verificar que el usuario es administrador del club
    miembro_admin = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id,
        MiembroClub.rol == "administrador"
    ).first()
    
    if not miembro_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden remover miembros"
        )
    
    # Verificar que no intente removerse a sí mismo
    if usuario_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes removerte a ti mismo del club"
        )
    
    # Permitir remover por usuario_id o por id de miembro
    miembro = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == usuario_id,
        MiembroClub.club_id == club_id
    ).first()
    if not miembro:
        miembro = db.query(MiembroClub).filter(
            MiembroClub.id == usuario_id,
            MiembroClub.club_id == club_id
        ).first()
    
    if not miembro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Miembro no encontrado"
        )
    
    # Marcar como inactivo en lugar de eliminar
    miembro.estado = "inactivo"
    db.commit()
    
    return {"message": "Miembro removido del club"}


@router.put("/{club_id}/miembros/{usuario_id}/rol", response_model=dict)
async def actualizar_rol_miembro(
    club_id: int,
    usuario_id: int,
    rol_update: MiembroRolUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar rol de un miembro (solo administradores)"""

    miembro_admin = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id,
        MiembroClub.rol == "administrador"
    ).first()

    if not miembro_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden cambiar roles"
        )

    if usuario_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes cambiar tu propio rol"
        )

    allowed_roles = {
        "propietario",
        "administrador",
        "admin",
        "editor",
        "moderador",
        "gestor_eventos",
        "tesorero",
        "socio",
        "miembro",
        "visitante"
    }

    rol_normalizado = rol_update.rol.strip().lower()
    if rol_normalizado not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rol no permitido"
        )

    miembro = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == usuario_id,
        MiembroClub.club_id == club_id
    ).first()
    if not miembro:
        miembro = db.query(MiembroClub).filter(
            MiembroClub.id == usuario_id,
            MiembroClub.club_id == club_id
        ).first()

    if not miembro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Miembro no encontrado"
        )

    miembro.rol = rol_normalizado
    db.commit()

    return {
        "message": "Rol actualizado exitosamente",
        "usuario_id": miembro.usuario_id,
        "rol": miembro.rol
    }



