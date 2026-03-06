"""Endpoints de gestión de clubes"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from datetime import datetime
from pydantic import BaseModel

from app.database.db import get_db
from app.models.usuario import Usuario
from app.models.club import Club
from app.models.miembro_club import MiembroClub
from app.models.noticia import Noticia
from app.models.evento import Evento
from app.models.producto import ProductoAfiliacion
from app.schemas.club import ClubCreate, ClubUpdate, ClubResponse, MiembroClubResponse, MiembroRolUpdate, MiembroEstadoUpdate
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
        "latitud", "longitud", "ayuda_documentacion_md"
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
    include_inactivos: bool = False,
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
    
    miembros_query = db.query(MiembroClub).filter(
        MiembroClub.club_id == club_id
    )
    if not include_inactivos:
        miembros_query = miembros_query.filter(MiembroClub.estado == "activo")
    else:
        miembro_admin = db.query(MiembroClub).filter(
            MiembroClub.usuario_id == current_user.id,
            MiembroClub.club_id == club_id,
            MiembroClub.rol == "administrador"
        ).first()
        if not miembro_admin:
            miembros_query = miembros_query.filter(MiembroClub.estado == "activo")

    miembros = miembros_query.all()
    
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
    
    # Eliminar miembro del club
    db.delete(miembro)
    db.commit()

    return {"message": "Miembro eliminado del club"}


@router.put("/{club_id}/miembros/{usuario_id}/estado", response_model=dict)
async def actualizar_estado_miembro(
    club_id: int,
    usuario_id: int,
    estado_update: MiembroEstadoUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar estado de un miembro (solo administradores)"""

    miembro_admin = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id,
        MiembroClub.rol == "administrador"
    ).first()

    if not miembro_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden cambiar el estado"
        )

    if estado_update.estado not in ["activo", "inactivo"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Estado inválido"
        )

    miembro = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == usuario_id,
        MiembroClub.club_id == club_id
    ).first()

    if not miembro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Miembro no encontrado"
        )

    miembro.estado = estado_update.estado
    db.commit()

    return {"message": "Estado actualizado"}


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


class RecentContentItem(BaseModel):
    tipo: str  # "noticia", "evento", "producto"
    id: int
    titulo: str
    descripcion: str | None
    fecha: datetime
    
    class Config:
        from_attributes = True


@router.get("/{club_id}/contenido-reciente", response_model=List[RecentContentItem])
async def obtener_contenido_reciente_club(
    club_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener el contenido más reciente de un club específico.
    Devuelve máximo 3 elementos: las últimas noticias, eventos y producto.
    """
    
    # Verificar que el club existe
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club no encontrado"
        )
    
    # Verificar que el usuario es miembro del club
    miembro = db.query(MiembroClub).filter(
        MiembroClub.club_id == club_id,
        MiembroClub.usuario_id == current_user.id
    ).first()
    
    if not miembro and not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este club"
        )
    
    resultado = []
    
    # 1. Obtener última noticia publicada
    ultima_noticia = db.query(Noticia).filter(
        Noticia.club_id == club_id,
        Noticia.estado == "publicada",
        Noticia.fecha_publicacion.isnot(None)
    ).order_by(desc(Noticia.fecha_publicacion)).first()
    
    if ultima_noticia:
        resultado.append(RecentContentItem(
            tipo="noticia",
            id=ultima_noticia.id,
            titulo=ultima_noticia.titulo,
            descripcion=ultima_noticia.contenido[:200] if ultima_noticia.contenido else None,
            fecha=ultima_noticia.fecha_publicacion
        ))
    
    # 2. Obtener último evento
    ultimo_evento = db.query(Evento).filter(
        Evento.club_id == club_id
    ).order_by(desc(Evento.fecha_creacion)).first()
    
    if ultimo_evento:
        resultado.append(RecentContentItem(
            tipo="evento",
            id=ultimo_evento.id,
            titulo=ultimo_evento.nombre,
            descripcion=ultimo_evento.descripcion[:200] if ultimo_evento.descripcion else None,
            fecha=ultimo_evento.fecha_creacion
        ))
    
    # 3. Obtener último producto
    ultimo_producto = db.query(ProductoAfiliacion).filter(
        ProductoAfiliacion.club_id == club_id,
        ProductoAfiliacion.activo == True
    ).order_by(desc(ProductoAfiliacion.fecha_creacion)).first()
    
    if ultimo_producto:
        resultado.append(RecentContentItem(
            tipo="producto",
            id=ultimo_producto.id,
            titulo=ultimo_producto.nombre,
            descripcion=ultimo_producto.descripcion[:200] if ultimo_producto.descripcion else None,
            fecha=ultimo_producto.fecha_creacion
        ))
    
    # Ordenar por fecha descendente y limitar a 3
    resultado.sort(key=lambda x: x.fecha, reverse=True)
    return resultado[:3]


@router.post("/{club_id}/generar-datos-ejemplo", response_model=dict)
async def generar_datos_ejemplo(
    club_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generar datos de ejemplo para un club:
    - 5 usuarios miembros
    - Ubicación geográfica
    - Contraseña de instalaciones
    - 5 noticias
    - 5 eventos
    - 5 productos en la tienda
    
    Solo accesible para administradores del club o superadmins
    """
    from app.models.instalacion import ContrasenaInstalacion
    from datetime import timedelta
    import random
    import string
    
    def generate_readable_password(length=8):
        """Generar una contraseña legible sin caracteres ambiguos"""
        chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        return ''.join(random.choice(chars) for _ in range(length))
    
    # Verificar que el club existe
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club no encontrado"
        )
    
    # Verificar permisos
    miembro = db.query(MiembroClub).filter(
        MiembroClub.usuario_id == current_user.id,
        MiembroClub.club_id == club_id,
        MiembroClub.estado == "activo"
    ).first()
    
    if not miembro or (miembro.rol != "administrador" and not current_user.es_superadmin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores del club pueden generar datos de ejemplo"
        )
    
    resultados = {
        "usuarios_creados": 0,
        "noticias_creadas": 0,
        "eventos_creados": 0,
        "productos_creados": 0,
        "ubicacion_actualizada": False,
        "password_instalaciones_creada": False
    }
    
    try:
        # 1. Actualizar ubicación geográfica del club (ejemplo: Madrid, España)
        ubicaciones_ejemplo = [
            {"lat": 40.4168, "lon": -3.7038, "pais": "España", "region": "Madrid"},
            {"lat": 41.3851, "lon": 2.1734, "pais": "España", "region": "Barcelona"},
            {"lat": 43.2630, "lon": -2.9350, "pais": "España", "region": "Bilbao"},
            {"lat": 37.3891, "lon": -5.9845, "pais": "España", "region": "Sevilla"},
            {"lat": 39.4699, "lon": -0.3763, "pais": "España", "region": "Valencia"}
        ]
        ubicacion = random.choice(ubicaciones_ejemplo)
        club.latitud = ubicacion["lat"]
        club.longitud = ubicacion["lon"]
        club.pais = ubicacion["pais"]
        club.region = ubicacion["region"]
        resultados["ubicacion_actualizada"] = True
        
        # 2. Crear contraseña de instalaciones
        existing_password = db.query(ContrasenaInstalacion).filter(
            ContrasenaInstalacion.club_id == club_id,
            ContrasenaInstalacion.activa == True
        ).first()
        
        if not existing_password:
            nueva_password = ContrasenaInstalacion(
                club_id=club_id,
                codigo=generate_readable_password(),
                descripcion="Contraseña de ejemplo generada automáticamente",
                creado_por_id=current_user.id,
                fecha_creacion=datetime.utcnow(),
                activa=True
            )
            db.add(nueva_password)
            resultados["password_instalaciones_creada"] = True
        
        # 3. Crear 5 usuarios de ejemplo
        nombres_ejemplo = [
            ("Carlos", "Martínez", "carlos.martinez"),
            ("Laura", "González", "laura.gonzalez"),
            ("Miguel", "Rodríguez", "miguel.rodriguez"),
            ("Ana", "Fernández", "ana.fernandez"),
            ("David", "López", "david.lopez")
        ]
        
        for nombre, apellido, username in nombres_ejemplo:
            email = f"{username}@ejemplo.com"
            # Verificar que el usuario no existe
            usuario_existe = db.query(Usuario).filter(Usuario.email == email).first()
            if not usuario_existe:
                nuevo_usuario = Usuario(
                    email=email,
                    nombre_completo=f"{nombre} {apellido}",
                    email_verificado=True,
                    activo=True,
                    fecha_creacion=datetime.utcnow()
                )
                db.add(nuevo_usuario)
                db.flush()
                
                # Agregar como miembro del club
                nuevo_miembro = MiembroClub(
                    usuario_id=nuevo_usuario.id,
                    club_id=club_id,
                    rol="socio",
                    estado="activo",
                    fecha_inscripcion=datetime.utcnow(),
                    fecha_aprobacion=datetime.utcnow(),
                    aprobado_por_id=current_user.id
                )
                db.add(nuevo_miembro)
                resultados["usuarios_creados"] += 1
        
        # 4. Crear 5 noticias de ejemplo
        noticias_ejemplo = [
            {
                "titulo": "Inauguración de la nueva temporada",
                "contenido": "Nos complace anunciar el inicio de la nueva temporada deportiva. ¡Os esperamos a todos!",
                "categoria": "Anuncios"
            },
            {
                "titulo": "Torneo de verano 2026",
                "contenido": "Se ha organizado un torneo especial para este verano. Las inscripciones ya están abiertas.",
                "categoria": "Eventos"
            },
            {
                "titulo": "Nuevas instalaciones disponibles",
                "contenido": "Hemos renovado las instalaciones con nuevo equipamiento de última generación.",
                "categoria": "Instalaciones"
            },
            {
                "titulo": "Éxito en el campeonato regional",
                "contenido": "Nuestro equipo ha conseguido excelentes resultados en el campeonato regional. ¡Enhorabuena!",
                "categoria": "Resultados"
            },
            {
                "titulo": "Descuentos en la tienda del club",
                "contenido": "Durante este mes tenemos ofertas especiales en productos seleccionados de nuestra tienda.",
                "categoria": "Promociones"
            }
        ]
        
        for i, noticia_data in enumerate(noticias_ejemplo):
            nueva_noticia = Noticia(
                club_id=club_id,
                titulo=noticia_data["titulo"],
                contenido=noticia_data["contenido"],
                autor_id=current_user.id,
                categoria=noticia_data["categoria"],
                estado="publicada",
                fecha_publicacion=datetime.utcnow() - timedelta(days=i*3),
                fecha_creacion=datetime.utcnow() - timedelta(days=i*3)
            )
            db.add(nueva_noticia)
            resultados["noticias_creadas"] += 1
        
        # 5. Crear 5 eventos de ejemplo
        eventos_ejemplo = [
            {
                "nombre": "Entrenamiento grupal",
                "descripcion": "Sesión de entrenamiento para todos los niveles",
                "dias": 3
            },
            {
                "nombre": "Competición amistosa",
                "descripcion": "Partido amistoso con otro club de la zona",
                "dias": 7
            },
            {
                "nombre": "Asamblea general de socios",
                "descripcion": "Asamblea anual para todos los miembros del club",
                "dias": 14
            },
            {
                "nombre": "Jornada de puertas abiertas",
                "descripcion": "Ven a conocer nuestras instalaciones y actividades",
                "dias": 21
            },
            {
                "nombre": "Clínic de técnica avanzada",
                "descripcion": "Taller especializado para mejorar técnicas específicas",
                "dias": 28
            }
        ]
        
        for evento_data in eventos_ejemplo:
            fecha_evento = datetime.utcnow() + timedelta(days=evento_data["dias"])
            nuevo_evento = Evento(
                club_id=club_id,
                nombre=evento_data["nombre"],
                descripcion=evento_data["descripcion"],
                tipo="otro",
                fecha_inicio=fecha_evento,
                fecha_fin=fecha_evento + timedelta(hours=2),
                contacto_responsable_id=current_user.id,
                aforo_maximo=50,
                estado="no_iniciado",
                permite_comentarios=True,
                fecha_creacion=datetime.utcnow()
            )
            db.add(nuevo_evento)
            resultados["eventos_creados"] += 1
        
        # 6. Crear 5 productos en la tienda
        productos_ejemplo = [
            {
                "nombre": "Camiseta oficial del club",
                "descripcion": "Camiseta técnica con el logo del club",
                "precio_referencia": "35.00€",
                "categoria": "Ropa",
                "url": "https://ejemplo.com/camiseta"
            },
            {
                "nombre": "Pantalón deportivo",
                "descripcion": "Pantalón cómodo para entrenamientos",
                "precio_referencia": "42.00€",
                "categoria": "Ropa",
                "url": "https://ejemplo.com/pantalon"
            },
            {
                "nombre": "Mochila deportiva",
                "descripcion": "Mochila espaciosa con compartimentos",
                "precio_referencia": "28.00€",
                "categoria": "Accesorios",
                "url": "https://ejemplo.com/mochila"
            },
            {
                "nombre": "Gorra con logo",
                "descripcion": "Gorra ajustable con logo bordado del club",
                "precio_referencia": "15.00€",
                "categoria": "Accesorios",
                "url": "https://ejemplo.com/gorra"
            },
            {
                "nombre": "Botella térmica",
                "descripcion": "Botella de 750ml con aislamiento térmico",
                "precio_referencia": "22.00€",
                "categoria": "Accesorios",
                "url": "https://ejemplo.com/botella"
            }
        ]
        
        for producto_data in productos_ejemplo:
            nuevo_producto = ProductoAfiliacion(
                club_id=club_id,
                nombre=producto_data["nombre"],
                descripcion=producto_data["descripcion"],
                precio_referencia=producto_data["precio_referencia"],
                categoria=producto_data["categoria"],
                url_afiliacion=producto_data["url"],
                proveedor="Tienda Ejemplo",
                activo=True,
                destacado=False,
                orden=0,
                clicks=0,
                creado_por_id=current_user.id,
                fecha_creacion=datetime.utcnow()
            )
            db.add(nuevo_producto)
            resultados["productos_creados"] += 1
        
        db.commit()
        
        return {
            "success": True,
            "message": "Datos de ejemplo generados correctamente",
            "detalles": resultados
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar datos de ejemplo: {str(e)}"
        )



