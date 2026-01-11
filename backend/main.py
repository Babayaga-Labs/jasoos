"""FastAPI application entry point"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables BEFORE importing routers (they read env vars at import time)
env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(dotenv_path=str(env_path))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
sys.path.insert(0, str(Path(__file__).parent))
from routers import chat, score

app = FastAPI(title="Final Cut Game AI Backend")

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(score.router, prefix="/api", tags=["score"])


@app.get("/")
async def root():
    return {"message": "Final Cut Game AI Backend", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
