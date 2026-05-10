from contextlib import asynccontextmanager
from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

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
    await db["chat_history"].create_index("user_id")


def _get_db() -> AsyncIOMotorDatabase:
    if _client is None:
        raise RuntimeError("Database client is not initialised — did lifespan run?")
    return _client[settings.DATABASE_NAME]


async def get_database() -> AsyncIOMotorDatabase:
    return _get_db()
