from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from ..schemas.chat import ChatRequest, ChatResponse
from ..services.openclaw_service import openclaw_service
from ..routes.auth import get_current_user
from ..models.usuario import Usuario

router = APIRouter(prefix="/chat", tags=["chat"])

@router.get("/openclaw/debug")
async def debug_openclaw_connection(
    current_user: Usuario = Depends(get_current_user)
):
    """
    Diagnostica la conexión a OpenClaw y retorna información detallada.
    Útil para depurar problemas de conexión en producción.
    **Solo accesible para superadministradores.**
    """
    # Verificar que el usuario sea superadmin
    if not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los superadministradores pueden acceder al diagnóstico de OpenClaw"
        )
    
    try:
        diagnosis = await openclaw_service.diagnose_connection()
        return diagnosis
    except Exception as e:
        return {
            "success": False,
            "error": f"Diagnostic failed: {str(e)}",
            "steps": [{"step": "initialization", "status": "error", "details": str(e)}]
        }

@router.get("/openclaw/history", response_model=List[Dict[str, Any]])
async def get_chat_history_route(
    club_id: int = None,
    limit: int = 50,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtiene el historial de chat de la sesión especificada.
    Requiere autenticación de usuario.
    """
    try:
        context = {"user_id": current_user.id}
        if club_id:
            context["club_id"] = club_id
            
        history = await openclaw_service.get_chat_history(context=context, limit=limit)
        return history
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo historial: {str(e)}"
        )


@router.post("/openclaw", response_model=ChatResponse)
async def generate_chat_response(
    request: ChatRequest,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Envía mensajes al servicio de OpenClaw y obtiene una respuesta.
    Requiere autenticación de usuario.
    """
    
    # Preparar el contexto si es necesario, por ejemplo con info del usuario
    context = request.context or {}
    context.update({
        "user_id": current_user.id,
        "user_email": current_user.email
    })
    
    # Aquí podríamos verificar permisos sobre el club_id si viene en el request
    if request.club_id:
        # Lógica para verificar si el usuario pertenece al club
        context["club_id"] = request.club_id

    # Convertir mensajes de Pydantic a dict para el servicio
    messages_dicts = [{"role": m.role, "content": m.content} for m in request.messages]

    try:
        reply_text = await openclaw_service.get_response(
            messages=messages_dicts,
            context=context
        )
        
        return ChatResponse(
            reply=reply_text,
            usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0} # Placeholder
        )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar la solicitud de chat: {str(e)}"
        )
