from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def listar_productos():
    return {"productos": []}
