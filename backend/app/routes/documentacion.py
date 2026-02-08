from fastapi import APIRouter

router = APIRouter()

@router.get("/ayuda")
async def get_ayuda():
    return {"ayuda": "Sección de ayuda"}
