"""Chat endpoint for character conversations"""
import os
import json
import sys
from pathlib import Path
from typing import List
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from openai import OpenAI

sys.path.insert(0, str(Path(__file__).parent.parent))
from models import ChatRequest, ChatMessage

router = APIRouter()

# Initialize OpenAI client pointing to OpenRouter
# Support both LLM_API_KEY (from existing config) and OPENROUTER_API_KEY
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("LLM_API_KEY") or os.getenv("OPENROUTER_API_KEY"),
    default_headers={
        "HTTP-Referer": os.getenv("OPENROUTER_REFERER", "https://localhost:3000"),
        "X-Title": os.getenv("OPENROUTER_TITLE", "Final Cut Game"),
    },
)

# Get model from env or use default
DEFAULT_MODEL = os.getenv("OPENROUTER_MODEL", "anthropic/claude-3.5-sonnet")


@router.post("/chat")
async def chat(request: ChatRequest):
    """Stream character conversation response"""
    try:
        # Convert messages to OpenAI format
        messages = [
            {"role": msg.role, "content": msg.content}
            for msg in request.messages
        ]
        
        # Add system prompt
        messages.insert(0, {"role": "system", "content": request.system_prompt})
        
        # Stream response from OpenRouter
        stream = client.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=messages,
            max_tokens=300,
            temperature=0.8,
            stream=True,
        )
        
        async def generate():
            """Generator for text stream - format compatible with simple text streaming"""
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    # Yield just the text content
                    yield chunk.choices[0].delta.content
        
        return StreamingResponse(generate(), media_type="text/plain")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
