from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field


class MessageRole(str, Enum):
    user = "user"
    assistant = "assistant"


class Message(BaseModel):
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatRequest(BaseModel):
    message: str
    session_id: str


class ChatResponse(BaseModel):
    reply: str
    message: Message


class HistoryResponse(BaseModel):
    messages: list[Message]


class Session(BaseModel):
    session_id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime


class SessionResponse(BaseModel):
    session_id: str
    title: str
    created_at: datetime
    updated_at: datetime


class SessionsListResponse(BaseModel):
    sessions: list[SessionResponse]
