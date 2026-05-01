from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.usuario import Usuario
from .dependencies import get_current_superadmin
from . import storage, persona_loader
from .schemas import AgentConfigIn, AgentConfigOut, ProviderModelInfo, PersonaFile
from .providers import get_provider

router = APIRouter(prefix="/agent", tags=["Agent Admin"])


@router.get("/config", response_model=AgentConfigOut)
async def get_config(
    _: Usuario = Depends(get_current_superadmin),
    db: Session = Depends(get_db),
):
    cfg = storage.get_agent_config(db)
    return cfg


@router.put("/config", response_model=AgentConfigOut)
async def update_config(
    payload: AgentConfigIn,
    admin: Usuario = Depends(get_current_superadmin),
    db: Session = Depends(get_db),
):
    cfg = storage.get_agent_config(db)
    for k, v in payload.model_dump().items():
        setattr(cfg, k, v)
    cfg.updated_by = admin.id
    db.commit()
    db.refresh(cfg)
    return cfg


@router.get("/providers/{provider}/models", response_model=list[ProviderModelInfo])
async def list_provider_models(
    provider: str,
    _: Usuario = Depends(get_current_superadmin),
):
    try:
        p = get_provider(provider)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return await p.list_models()


@router.get("/persona/{filename}")
async def get_persona_file(
    filename: str,
    _: Usuario = Depends(get_current_superadmin),
):
    try:
        return {"name": filename, "content": persona_loader.read_persona_file(filename)}
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/persona/{filename}")
async def update_persona_file(
    filename: str,
    payload: PersonaFile,
    _: Usuario = Depends(get_current_superadmin),
):
    try:
        persona_loader.write_persona_file(filename, payload.content)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"ok": True}


# --- OAuth device-code flows ---

class DeviceCodePollRequest(BaseModel):
    device_code: str


@router.post("/oauth/openai/start")
async def openai_oauth_start(_: Usuario = Depends(get_current_superadmin)):
    """Inicia flujo OAuth PKCE contra OpenAI (Codex CLI).
    Devuelve {authorization_url, state, redirect_uri, expires_in}.
    El admin debe abrir authorization_url en su navegador.
    """
    from .providers.openai_oauth import start_oauth_flow
    try:
        return await start_oauth_flow()
    except Exception as e:
        raise HTTPException(502, f"Error iniciando flujo OAuth con OpenAI: {e}")


@router.get("/oauth/openai/callback", response_class=HTMLResponse)
async def openai_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
):
    """Callback de OpenAI OAuth. Recibe code+state y completa el flujo."""
    from .providers.openai_oauth import handle_oauth_callback
    html = await handle_oauth_callback(code, state)
    return HTMLResponse(content=html)


@router.post("/oauth/openai/poll")
async def openai_oauth_poll(
    _: Usuario = Depends(get_current_superadmin),
):
    """Polling para detectar si el flujo OAuth completó.
    Devuelve {"status": "no_flow" | "pending" | "complete" | "error"}.
    """
    from .providers.openai_oauth import poll_oauth_status
    result = await poll_oauth_status()
    if result["status"] == "error":
        raise HTTPException(400, result.get("detail", "Error desconocido"))
    return result


@router.post("/oauth/copilot/start")
async def copilot_oauth_start(_: Usuario = Depends(get_current_superadmin)):
    """Inicia device-code flow contra GitHub para Copilot.
    Devuelve {device_code, user_code, verification_uri, expires_in, interval}.
    El admin debe abrir verification_uri e introducir user_code.
    """
    from .providers.github_copilot import start_device_code_flow
    try:
        return await start_device_code_flow()
    except Exception as e:
        raise HTTPException(502, f"Error iniciando flujo OAuth con GitHub: {e}")


@router.post("/oauth/copilot/poll")
async def copilot_oauth_poll(
    payload: DeviceCodePollRequest,
    _: Usuario = Depends(get_current_superadmin),
):
    """Polling para detectar autorización completada contra GitHub/Copilot.
    Devuelve {"status": "pending" | "complete" | "expired" | "error"}.
    """
    from .providers.github_copilot import poll_device_code
    result = await poll_device_code(payload.device_code)
    if result["status"] == "error":
        raise HTTPException(400, result.get("detail", "Error desconocido"))
    return result
