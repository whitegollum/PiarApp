from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.routes.auth import get_current_user
from app.models.usuario import Usuario
from . import service, storage
from .schemas import MessageIn, ChatResponse, MessageOut, SessionSummary

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/send", response_model=ChatResponse)
async def send_message(
    payload: MessageIn,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Extract raw Bearer token for tool calls on behalf of user
    auth_header = request.headers.get("authorization", "")
    user_token = auth_header.removeprefix("Bearer ").strip() if auth_header else None
    try:
        result = await service.handle_turn(
            db=db,
            user_id=current_user.id,
            club_id=payload.club_id,
            session_id=payload.session_id,
            user_message=payload.message,
            user_token=user_token,
        )
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    return ChatResponse(
        session_id=result["session_id"],
        response=result["response"],
        messages=[MessageOut.model_validate(m) for m in result["messages_added"]],
    )


@router.get("/sessions", response_model=list[SessionSummary])
async def list_sessions(
    club_id: int | None = None,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = storage.list_user_sessions(db, current_user.id, club_id)
    return [SessionSummary(
        id=r.id, title=r.title, club_id=r.club_id,
        updated_at=r.updated_at, message_count=r.message_count,
    ) for r in rows]


@router.get("/sessions/{session_id}/messages", response_model=list[MessageOut])
async def get_session_messages(
    session_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    msgs = storage.get_session_messages(db, session_id, current_user.id)
    return [MessageOut.model_validate(m) for m in msgs]


@router.delete("/sessions/{session_id}")
async def archive_session(
    session_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from .models import ChatSession
    sess = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id,
    ).first()
    if not sess:
        raise HTTPException(404, "Sesión no encontrada")
    sess.archived = True
    db.commit()
    return {"ok": True}


@router.post("/debug")
async def debug_message(
    payload: MessageIn,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Debug endpoint: executes a single turn with full diagnostic info."""
    auth_header = request.headers.get("authorization", "")
    user_token = auth_header.removeprefix("Bearer ").strip() if auth_header else None
    try:
        result = await service.handle_turn_debug(
            db=db,
            user_id=current_user.id,
            club_id=payload.club_id,
            user_message=payload.message,
            user_token=user_token,
        )
    except Exception as e:
        return {"error": str(e), "debug_log": []}
    return result
