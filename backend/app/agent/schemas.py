from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime


class MessageIn(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    session_id: int | None = None
    club_id: int | None = None


class MessageOut(BaseModel):
    id: int
    role: Literal["user", "assistant", "tool"]
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    session_id: int
    response: str
    messages: list[MessageOut]


class SessionSummary(BaseModel):
    id: int
    title: str | None
    club_id: int | None
    updated_at: datetime
    message_count: int


class AgentConfigIn(BaseModel):
    model_config = {"protected_namespaces": ()}

    provider: Literal["openai_apikey", "openai_oauth", "github_copilot"] = "openai_apikey"
    model_id: str
    max_tokens: int = Field(2048, ge=64, le=32000)
    temperature: int = Field(70, ge=0, le=200)
    enabled: bool = True


class AgentConfigOut(AgentConfigIn):
    model_config = {"protected_namespaces": (), "from_attributes": True}

    updated_at: datetime


class ProviderModelInfo(BaseModel):
    id: str
    name: str
    context_window: int | None = None


class PersonaFile(BaseModel):
    name: Literal["identity.md", "soul.md", "tools.md", "agents.md"] | None = None
    content: str
