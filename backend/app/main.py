
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.chat import router as chat_router
from app.api.auth import router as auth_router
from app.db.database import (
    connect_to_mongodb,
    close_mongodb_connection,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Backend start hone par MongoDB connect karo
    connect_to_mongodb()

    try:
        yield
    finally:
        # Backend band hone par connection close karo
        close_mongodb_connection()


app = FastAPI(
    title="Jiya AI Chatbot API",
    description="Full-Stack AI Chatbot Backend",
    version="1.0.0",
    lifespan=lifespan,
)


allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

frontend_url = os.getenv("FRONTEND_URL")

if frontend_url:
    allowed_origins.append(frontend_url.rstrip("/"))


app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "Jiya AI Chatbot Backend is running!"
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


# Chat APIs
app.include_router(chat_router, prefix="/api")

# Register and Login APIs
app.include_router(auth_router, prefix="/api")
