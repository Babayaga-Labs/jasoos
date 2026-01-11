"""Pydantic models for request/response schemas"""
from pydantic import BaseModel
from typing import List, Optional, Literal


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    story_id: str
    character_id: str
    messages: List[ChatMessage]
    system_prompt: str


class ScoreRequest(BaseModel):
    reasoning: str
    solution: dict
    is_correct: bool


class ReasoningScore(BaseModel):
    """Structured output for reasoning evaluation"""
    score: int  # 0-100
    motive_points: int  # 0-30
    method_points: int  # 0-30
    logic_points: int  # 0-40


class ScoreResponse(BaseModel):
    score: int
    breakdown: ReasoningScore
