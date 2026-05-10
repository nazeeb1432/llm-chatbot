from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models import Message


async def save_message(db: AsyncIOMotorDatabase, user_id: str, message: Message) -> None:
    """Append *message* to the user's chat_history document, creating it if absent."""
    await db["chat_history"].update_one(
        {"user_id": user_id},
        {"$push": {"messages": message.model_dump(mode="json")}},
        upsert=True,
    )


async def get_history(db: AsyncIOMotorDatabase, user_id: str) -> list[Message]:
    """Return all messages for *user_id* sorted by timestamp ascending."""
    doc = await db["chat_history"].find_one(
        {"user_id": user_id},
        {"messages": 1, "_id": 0},
    )
    if not doc:
        return []
    return sorted(
        (Message(**msg) for msg in doc.get("messages", [])),
        key=lambda m: m.timestamp,
    )
