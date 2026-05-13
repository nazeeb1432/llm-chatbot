from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.auth import get_current_user_id
from app.database import get_database
from app.models import SessionResponse, SessionsListResponse
from app.services import session_service

router = APIRouter(tags=["sessions"])


@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> SessionResponse:
    return await session_service.create_session(db, user_id)


@router.get("/sessions", response_model=SessionsListResponse, status_code=status.HTTP_200_OK)
async def list_sessions(
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> SessionsListResponse:
    sessions = await session_service.list_sessions(db, user_id)
    return SessionsListResponse(sessions=sessions)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> None:
    existing = await session_service.get_session(db, user_id, session_id)
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    await session_service.delete_session(db, user_id, session_id)
