from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import lifespan
from app.routes import chat, history, sessions

app = FastAPI(
    title="LLM Chatbot API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok", "model": settings.OLLAMA_MODEL}
