from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    club_id: Optional[int] = None
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    reply: str
    usage: Optional[Dict[str, int]] = None
