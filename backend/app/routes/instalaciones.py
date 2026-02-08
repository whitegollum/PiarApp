from fastapi import APIRouter

router = APIRouter()

@router.get("/contraseña")
async def get_contraseña():
    return {"contraseña": "***"}
