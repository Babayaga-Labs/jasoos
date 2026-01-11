# Python AI Backend

FastAPI backend for handling LLM interactions via OpenRouter.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables in `.env.local` (in project root):
```
OPENROUTER_API_KEY=your_key_here
OPENROUTER_REFERER=https://localhost:3000
OPENROUTER_TITLE=Final Cut Game
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_SCORING_MODEL=openai/gpt-4o-mini
```

3. Run the server:
```bash
uvicorn main:app --reload --port 8000
```

## Endpoints

- `POST /api/chat` - Stream character conversation responses
- `POST /api/score` - Score accusation reasoning with structured output

## Architecture

- Uses OpenAI SDK pointed at OpenRouter API
- FastAPI for async request handling
- Pydantic for request/response validation
- Streaming responses for real-time chat
