"""Scoring endpoint for accusation reasoning"""
import os
from fastapi import APIRouter, HTTPException
from openai import OpenAI
from pydantic import BaseModel
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from models import ScoreRequest, ReasoningScore

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

# Use cheaper model for scoring
SCORING_MODEL = os.getenv("OPENROUTER_SCORING_MODEL", "openai/gpt-4o-mini")


@router.post("/score")
async def score_reasoning(request: ScoreRequest):
    """Score detective's reasoning using structured output"""
    if not request.is_correct:
        return {
            "score": 0,
            "breakdown": {
                "score": 0,
                "motive_points": 0,
                "method_points": 0,
                "logic_points": 0
            }
        }
    
    if not request.reasoning or len(request.reasoning) < 20:
        return {
            "score": 10,
            "breakdown": {
                "score": 10,
                "motive_points": 3,
                "method_points": 3,
                "logic_points": 4
            }
        }
    
    try:
        # Build prompt for scoring
        prompt = f"""THE CORRECT SOLUTION:
- Culprit: {request.solution.get('culprit', 'Unknown')}
- Method: {request.solution.get('method', 'Unknown')}
- Motive: {request.solution.get('motive', 'Unknown')}

THE DETECTIVE'S REASONING:
"{request.reasoning}"

Evaluate the reasoning and provide a structured score."""
        
        # Use structured output with Pydantic model
        # Note: OpenRouter may not support structured outputs for all models
        # Fallback to regular completion if needed
        try:
            completion = client.beta.chat.completions.parse(
                model=SCORING_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": """You are evaluating a detective's reasoning for solving a mystery.

Score the reasoning from 0-100 based on:
1. Does it identify the correct motive? (30 points max)
2. Does it explain the method? (30 points max)
3. Is the logic sound and well-explained? (40 points max)

Provide a structured breakdown of the score."""
                    },
                    {"role": "user", "content": prompt}
                ],
                response_format=ReasoningScore,
                max_tokens=100,
                temperature=0.1,
            )
            
            result = completion.choices[0].message.parsed
            return {
                "score": result.score,
                "breakdown": {
                    "score": result.score,
                    "motive_points": result.motive_points,
                    "method_points": result.method_points,
                    "logic_points": result.logic_points
                }
            }
        except Exception:
            # Fallback: regular completion and parse manually
            completion = client.chat.completions.create(
                model=SCORING_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": """You are evaluating a detective's reasoning for solving a mystery.

Score the reasoning from 0-100 based on:
1. Does it identify the correct motive? (30 points max)
2. Does it explain the method? (30 points max)
3. Is the logic sound and well-explained? (40 points max)

Respond with ONLY a JSON object in this format:
{"score": 85, "motive_points": 25, "method_points": 28, "logic_points": 32}"""
                    },
                    {"role": "user", "content": prompt}
                ],
                max_tokens=100,
                temperature=0.1,
            )
            
            import json
            response_text = completion.choices[0].message.content
            # Try to extract JSON from response
            try:
                # Find JSON in response
                start = response_text.find("{")
                end = response_text.rfind("}") + 1
                if start >= 0 and end > start:
                    parsed = json.loads(response_text[start:end])
                    return {
                        "score": parsed.get("score", 50),
                        "breakdown": {
                            "score": parsed.get("score", 50),
                            "motive_points": parsed.get("motive_points", 15),
                            "method_points": parsed.get("method_points", 15),
                            "logic_points": parsed.get("logic_points", 20)
                        }
                    }
            except:
                pass
            
            # Ultimate fallback: extract just the score number
            score_text = completion.choices[0].message.content.strip()
            try:
                score = int(score_text)
                score = max(0, min(100, score))
                return {
                    "score": score,
                    "breakdown": {
                        "score": score,
                        "motive_points": int(score * 0.3),
                        "method_points": int(score * 0.3),
                        "logic_points": int(score * 0.4)
                    }
                }
            except:
                return {
                    "score": 50,
                    "breakdown": {
                        "score": 50,
                        "motive_points": 15,
                        "method_points": 15,
                        "logic_points": 20
                    }
                }
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error scoring reasoning: {str(e)}")
