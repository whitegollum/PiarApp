import uuid
import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from app.config import settings
from app.models.usuario import Usuario
from app.routes.auth import get_current_user

router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
IMAGES_DIR = Path(settings.upload_folder) / "images"


@router.post("/upload/imagen")
async def upload_imagen(
    request: Request,
    file: UploadFile = File(...),
    current_user: Usuario = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Tipo de archivo no permitido. Usa JPG, PNG, GIF o WEBP.")

    content = await file.read()
    if len(content) > settings.max_upload_size:
        raise HTTPException(400, f"El archivo supera el límite de {settings.max_upload_size // 1024 // 1024} MB.")

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "imagen").suffix.lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = IMAGES_DIR / filename
    dest.write_bytes(content)

    base = str(request.base_url).rstrip("/")
    return {"url": f"{base}/uploads/images/{filename}"}
