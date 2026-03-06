"""Endpoints para el dashboard - contenido reciente de todos los clubes del usuario"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from typing import List, Union
from datetime import datetime

from app.database.db import get_db
from app.models.usuario import Usuario
from app.models.noticia import Noticia
from app.models.evento import Evento
from app.models.producto import ProductoAfiliacion
from app.models.miembro_club import MiembroClub
from app.models.club import Club
from app.routes.auth import get_current_user
from pydantic import BaseModel

router = APIRouter()


class RecentContentItem(BaseModel):
    tipo: str  # "noticia", "evento", "producto"
    id: int
    titulo: str
    descripcion: str | None
    club_id: int
    club_nombre: str
    fecha: datetime
    
    class Config:
        from_attributes = True


@router.get("/dashboard/contenido-reciente", response_model=List[RecentContentItem])
async def obtener_contenido_reciente(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener el contenido más reciente de todos los clubes del usuario.
    Devuelve máximo 2 elementos: el último evento/noticia y el último producto.
    """
    
    # Obtener IDs de clubes del usuario
    club_ids = db.query(MiembroClub.club_id).filter(
        MiembroClub.usuario_id == current_user.id
    ).all()
    club_ids = [cid[0] for cid in club_ids]
    
    if not club_ids:
        return []
    
    # Obtener clubes para los nombres
    clubes_dict = {
        club.id: club.nombre 
        for club in db.query(Club).filter(Club.id.in_(club_ids)).all()
    }
    
    resultado = []
    
    # 1. Obtener última noticia publicada
    ultima_noticia = db.query(Noticia).filter(
        Noticia.club_id.in_(club_ids),
        Noticia.estado == "publicada",
        Noticia.fecha_publicacion.isnot(None)
    ).order_by(desc(Noticia.fecha_publicacion)).first()
    
    # 2. Obtener último evento
    ultimo_evento = db.query(Evento).filter(
        Evento.club_id.in_(club_ids)
    ).order_by(desc(Evento.fecha_creacion)).first()
    
    # Comparar fechas y agregar el más reciente
    if ultima_noticia and ultimo_evento:
        if ultima_noticia.fecha_publicacion >= ultimo_evento.fecha_creacion:
            contenido_reciente = ultima_noticia
            tipo = "noticia"
            fecha = ultima_noticia.fecha_publicacion
            titulo = ultima_noticia.titulo
            descripcion = ultima_noticia.contenido[:200] if ultima_noticia.contenido else None
        else:
            contenido_reciente = ultimo_evento
            tipo = "evento"
            fecha = ultimo_evento.fecha_creacion
            titulo = ultimo_evento.titulo
            descripcion = ultimo_evento.descripcion
        
        resultado.append(RecentContentItem(
            tipo=tipo,
            id=contenido_reciente.id,
            titulo=titulo,
            descripcion=descripcion,
            club_id=contenido_reciente.club_id,
            club_nombre=clubes_dict.get(contenido_reciente.club_id, "Club"),
            fecha=fecha
        ))
    elif ultima_noticia:
        resultado.append(RecentContentItem(
            tipo="noticia",
            id=ultima_noticia.id,
            titulo=ultima_noticia.titulo,
            descripcion=ultima_noticia.contenido[:200] if ultima_noticia.contenido else None,
            club_id=ultima_noticia.club_id,
            club_nombre=clubes_dict.get(ultima_noticia.club_id, "Club"),
            fecha=ultima_noticia.fecha_publicacion
        ))
    elif ultimo_evento:
        resultado.append(RecentContentItem(
            tipo="evento",
            id=ultimo_evento.id,
            titulo=ultimo_evento.titulo,
            descripcion=ultimo_evento.descripcion,
            club_id=ultimo_evento.club_id,
            club_nombre=clubes_dict.get(ultimo_evento.club_id, "Club"),
            fecha=ultimo_evento.fecha_creacion
        ))
    
    # 3. Obtener último producto
    ultimo_producto = db.query(ProductoAfiliacion).filter(
        ProductoAfiliacion.club_id.in_(club_ids),
        ProductoAfiliacion.activo == True
    ).order_by(desc(ProductoAfiliacion.fecha_creacion)).first()
    
    if ultimo_producto:
        resultado.append(RecentContentItem(
            tipo="producto",
            id=ultimo_producto.id,
            titulo=ultimo_producto.nombre,
            descripcion=ultimo_producto.descripcion,
            club_id=ultimo_producto.club_id,
            club_nombre=clubes_dict.get(ultimo_producto.club_id, "Club"),
            fecha=ultimo_producto.fecha_creacion
        ))
    
    return resultado
