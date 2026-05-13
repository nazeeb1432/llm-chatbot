from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.auth import get_current_user_id
from app.database import get_database
from app.models import HistoryResponse
from app.services import history_service

router = APIRouter(tags=["history"])


@router.get("/history", response_model=HistoryResponse, status_code=status.HTTP_200_OK)
async def get_history(
    session_id: str = Query(..., description="The session whose history to retrieve"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> HistoryResponse:
    try:
        messages = await history_service.get_history(db, user_id, session_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve history: {exc}",
        )

    return HistoryResponse(messages=messages)
