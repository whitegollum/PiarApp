from sqlalchemy.orm import Session
from sqlalchemy import func
import json
from .models import ChatSession, ChatMessage, AgentConfig


def get_or_create_session(db: Session, user_id: int, club_id: int | None,
                          session_id: int | None) -> ChatSession:
    if session_id:
        sess = db.query(ChatSession).filter(
            ChatSession.id == session_id,
            ChatSession.user_id == user_id,
        ).first()
        if sess:
            return sess
    sess = ChatSession(user_id=user_id, club_id=club_id)
    db.add(sess)
    db.commit()
    db.refresh(sess)
    return sess


def list_user_sessions(db: Session, user_id: int, club_id: int | None = None) -> list:
    query = db.query(
        ChatSession.id,
        ChatSession.title,
        ChatSession.club_id,
        ChatSession.updated_at,
        func.count(ChatMessage.id).label("message_count"),
    ).outerjoin(ChatMessage).filter(
        ChatSession.user_id == user_id,
        ChatSession.archived == False,
    ).group_by(ChatSession.id).order_by(ChatSession.updated_at.desc())

    if club_id is not None:
        query = query.filter(ChatSession.club_id == club_id)

    return query.all()


def get_session_messages(db: Session, session_id: int,
                         user_id: int) -> list[ChatMessage]:
    sess = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == user_id,
    ).first()
    if not sess:
        return []
    return db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id,
    ).order_by(ChatMessage.id).all()


def append_message(db: Session, session_id: int, role: str,
                   content: str, **extras) -> ChatMessage:
    # Ensure tool_calls is JSON-serializable for SQLite
    if "tool_calls" in extras and extras["tool_calls"] is not None:
        tc = extras["tool_calls"]
        if not isinstance(tc, str):
            extras["tool_calls"] = json.dumps(tc)
    elif "tool_calls" in extras and extras["tool_calls"] is None:
        extras.pop("tool_calls")
    msg = ChatMessage(session_id=session_id, role=role, content=content, **extras)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def get_agent_config(db: Session) -> AgentConfig:
    cfg = db.query(AgentConfig).filter(AgentConfig.id == 1).first()
    if not cfg:
        cfg = AgentConfig(id=1)
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg
