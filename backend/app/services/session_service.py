import uuid
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models import Session, SessionResponse


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def create_session(db: AsyncIOMotorDatabase, user_id: str) -> SessionResponse:
    now = _now()
    doc = {
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": "New Chat",
        "created_at": now,
        "updated_at": now,
    }
    await db["sessions"].insert_one(doc)
    return SessionResponse(
        session_id=doc["session_id"],
        title=doc["title"],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


async def list_sessions(db: AsyncIOMotorDatabase, user_id: str) -> list[SessionResponse]:
    cursor = db["sessions"].find(
        {"user_id": user_id},
        {"session_id": 1, "title": 1, "created_at": 1, "updated_at": 1, "_id": 0},
    ).sort("created_at", -1)
    sessions = []
    async for doc in cursor:
        sessions.append(SessionResponse(**doc))
    return sessions


async def get_session(
    db: AsyncIOMotorDatabase, user_id: str, session_id: str
) -> SessionResponse | None:
    doc = await db["sessions"].find_one(
        {"session_id": session_id, "user_id": user_id},
        {"session_id": 1, "title": 1, "created_at": 1, "updated_at": 1, "_id": 0},
    )
    return SessionResponse(**doc) if doc else None


async def delete_session(
    db: AsyncIOMotorDatabase, user_id: str, session_id: str
) -> None:
    await db["sessions"].delete_one({"session_id": session_id, "user_id": user_id})
    await db["chat_history"].delete_one({"session_id": session_id, "user_id": user_id})


async def update_session_title(
    db: AsyncIOMotorDatabase, user_id: str, session_id: str, title: str
) -> None:
    await db["sessions"].update_one(
        {"session_id": session_id, "user_id": user_id},
        {"$set": {"title": title, "updated_at": _now()}},
    )
