from contextlib import asynccontextmanager

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING

from app.config import settings

_client: AsyncIOMotorClient | None = None


@asynccontextmanager
async def lifespan(app):
    global _client
    _client = AsyncIOMotorClient(settings.MONGODB_URL)
    await _ensure_indexes()
    yield
    _client.close()
    _client = None


async def _ensure_indexes() -> None:
    db = _get_db()
    # sessions: list by user newest-first; fast lookup by session_id
    await db["sessions"].create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    await db["sessions"].create_index(
        [("session_id", ASCENDING), ("user_id", ASCENDING)], unique=True
    )
    # chat_history: one document per (user_id, session_id)
    await db["chat_history"].create_index(
        [("user_id", ASCENDING), ("session_id", ASCENDING)], unique=True
    )


def _get_db() -> AsyncIOMotorDatabase:
    if _client is None:
        raise RuntimeError("Database client is not initialised — did lifespan run?")
    return _client[settings.DATABASE_NAME]


async def get_database() -> AsyncIOMotorDatabase:
    return _get_db()
