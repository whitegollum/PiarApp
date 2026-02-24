from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Response
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.documentacion_reglamentaria import DocumentacionReglamentaria
from app.models.miembro_club import MiembroClub
from app.models.usuario import Usuario
from app.routes.auth import get_current_user
from app.schemas.documentacion import DocumentacionResponse

router = APIRouter()


def _parse_datetime(value: Optional[str]) -> Optional[datetime]:
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de fecha invalido, usa ISO-8601"
        ) from exc


def _to_response(doc: DocumentacionReglamentaria) -> DocumentacionResponse:
    return DocumentacionResponse(
        id=doc.id,
        usuario_id=doc.usuario_id,
        rc_numero=doc.rc_numero,
        rc_fecha_emision=doc.rc_fecha_emision,
        rc_fecha_vencimiento=doc.rc_fecha_vencimiento,
        rc_archivo_nombre=doc.rc_archivo_nombre,
        rc_archivo_mime=doc.rc_archivo_mime,
        rc_tiene_archivo=doc.rc_archivo is not None,
        carnet_numero=doc.carnet_numero,
        carnet_fecha_emision=doc.carnet_fecha_emision,
        carnet_fecha_vencimiento=doc.carnet_fecha_vencimiento,
        carnet_archivo_nombre=doc.carnet_archivo_nombre,
        carnet_archivo_mime=doc.carnet_archivo_mime,
        carnet_tiene_archivo=doc.carnet_archivo is not None,
        fecha_creacion=doc.fecha_creacion,
        fecha_actualizacion=doc.fecha_actualizacion
    )


@router.get("/ayuda")
async def get_ayuda():
    return {"ayuda": "Seccion de ayuda"}


@router.get("/me", response_model=DocumentacionResponse)
async def obtener_documentacion_me(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(DocumentacionReglamentaria).filter(
        DocumentacionReglamentaria.usuario_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay documentacion registrada"
        )

    return _to_response(doc)


@router.post("/me", response_model=DocumentacionResponse)
async def upsert_documentacion_me(
    rc_numero: Optional[str] = Form(None),
    rc_fecha_emision: Optional[str] = Form(None),
    rc_fecha_vencimiento: Optional[str] = Form(None),
    carnet_numero: Optional[str] = Form(None),
    carnet_fecha_emision: Optional[str] = Form(None),
    carnet_fecha_vencimiento: Optional[str] = Form(None),
    rc_archivo: Optional[UploadFile] = File(None),
    carnet_archivo: Optional[UploadFile] = File(None),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(DocumentacionReglamentaria).filter(
        DocumentacionReglamentaria.usuario_id == current_user.id
    ).first()

    if not doc:
        doc = DocumentacionReglamentaria(
            usuario_id=current_user.id
        )
        db.add(doc)

    if rc_numero is not None:
        doc.rc_numero = rc_numero.strip() or None
    if rc_fecha_emision is not None:
        doc.rc_fecha_emision = _parse_datetime(rc_fecha_emision)
    if rc_fecha_vencimiento is not None:
        doc.rc_fecha_vencimiento = _parse_datetime(rc_fecha_vencimiento)

    if carnet_numero is not None:
        doc.carnet_numero = carnet_numero.strip() or None
    if carnet_fecha_emision is not None:
        doc.carnet_fecha_emision = _parse_datetime(carnet_fecha_emision)
    if carnet_fecha_vencimiento is not None:
        doc.carnet_fecha_vencimiento = _parse_datetime(carnet_fecha_vencimiento)

    if rc_archivo is not None:
        doc.rc_archivo = await rc_archivo.read()
        doc.rc_archivo_nombre = rc_archivo.filename
        doc.rc_archivo_mime = rc_archivo.content_type

    if carnet_archivo is not None:
        doc.carnet_archivo = await carnet_archivo.read()
        doc.carnet_archivo_nombre = carnet_archivo.filename
        doc.carnet_archivo_mime = carnet_archivo.content_type

    db.commit()
    db.refresh(doc)

    return _to_response(doc)


@router.get("/me/rc")
async def descargar_rc(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(DocumentacionReglamentaria).filter(
        DocumentacionReglamentaria.usuario_id == current_user.id
    ).first()

    if not doc or not doc.rc_archivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay archivo de seguro RC"
        )

    filename = doc.rc_archivo_nombre or "seguro_rc"
    return Response(
        content=doc.rc_archivo,
        media_type=doc.rc_archivo_mime or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/me/carnet")
async def descargar_carnet(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(DocumentacionReglamentaria).filter(
        DocumentacionReglamentaria.usuario_id == current_user.id
    ).first()

    if not doc or not doc.carnet_archivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay archivo de carnet"
        )

    filename = doc.carnet_archivo_nombre or "carnet_piloto"
    return Response(
        content=doc.carnet_archivo,
        media_type=doc.carnet_archivo_mime or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/usuarios/{usuario_id}", response_model=DocumentacionResponse)
async def obtener_documentacion_usuario(
    usuario_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # TODO: Refinar permisos. Por ahora, permitimos acceso autenticado para MVP.
    # Idealmente solo admin de club compartidos o superadmin.
    
    doc = db.query(DocumentacionReglamentaria).filter(
        DocumentacionReglamentaria.usuario_id == usuario_id
    ).first()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay documentacion registrada para este usuario"
        )

    return _to_response(doc)
