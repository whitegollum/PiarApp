from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.db import get_db

router = APIRouter()


@router.get("/")
async def listar_socios(db: Session = Depends(get_db)):
    """Listar socios"""
    return {"socios": []}


@router.post("/registro")
async def registrar_socio(db: Session = Depends(get_db)):
    """Registrar nuevo socio en club"""
    return {"message": "Socio registrado - implementar"}
