import json
from datetime import datetime, timezone
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.auth import get_current_user_id
from app.database import get_database
from app.models import ChatRequest, ChatResponse, Message, MessageRole
from app.services import history_service, llm_service

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat(
    request: ChatRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> ChatResponse:
    """Send a message and receive an AI-generated reply.

    Persists both the user message and the assistant reply to MongoDB so that
    the conversation history survives across sessions.
    """
    user_message = Message(
        role=MessageRole.user,
        content=request.message,
        timestamp=datetime.now(timezone.utc),
    )

    try:
        reply_text = await llm_service.generate_response(user_id, request.message)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"LLM service unavailable: {exc}",
        )

    assistant_message = Message(
        role=MessageRole.assistant,
        content=reply_text,
        timestamp=datetime.now(timezone.utc),
    )

    try:
        await history_service.save_message(db, user_id, user_message)
        await history_service.save_message(db, user_id, assistant_message)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist messages: {exc}",
        )

    return ChatResponse(reply=reply_text, message=assistant_message)


@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> StreamingResponse:
    """Stream an AI reply as Server-Sent Events, then persist both messages."""

    user_message = Message(
        role=MessageRole.user,
        content=request.message,
        timestamp=datetime.now(timezone.utc),
    )

    async def event_generator() -> AsyncGenerator[str, None]:
        collected: list[str] = []
        try:
            async for chunk in llm_service.stream_response(user_id, request.message):
                collected.append(chunk)
                yield f"data: {json.dumps(chunk)}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
            return

        full_reply = "".join(collected)
        assistant_message = Message(
            role=MessageRole.assistant,
            content=full_reply,
            timestamp=datetime.now(timezone.utc),
        )
        try:
            await history_service.save_message(db, user_id, user_message)
            await history_service.save_message(db, user_id, assistant_message)
        except Exception:
            pass

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
