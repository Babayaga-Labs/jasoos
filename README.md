# AI Detective Game

An AI-powered detective game where players take on the role of Sherlock Holmes, interrogating AI suspects to solve mysteries.

## Project Structure

```
/app                    # Next.js frontend
/backend                # Python FastAPI backend (LLM interactions)
/packages
  /engine               # Core game logic
  /ai                   # Image generation clients (LLM moved to Python)
  /types                # Shared TypeScript types
/stories                # Mystery scenarios (each folder = one story)
  /_template            # Copy this to create new stories
/scripts                # CLI tools for story generation
```

## Creating a New Story

1. Copy the `stories/_template` folder
2. Rename it to your story's ID (e.g., `manor-murder`)
3. Edit the JSON files:
   - `story.json` - Plot, setting, solution
   - `characters.json` - Suspect definitions
   - `plot-points.json` - Evidence to uncover
4. Add the story to `stories.config.json`
5. Run `npm run generate:story <story-id>` to generate character images

## Story JSON Schemas

### story.json
- `id` - Unique identifier
- `title` - Display name
- `setting` - Location, time period, atmosphere
- `premise` - What players see at the start
- `actualEvents` - Timeline of what really happened
- `solution` - Who did it, how, and why

### characters.json
- `id` - Unique identifier
- `name` - Character's full name
- `role` - Their role in the story
- `personality` - Traits, speech style, quirks
- `appearance` - Description + image generation prompt
- `knowledge` - What they know about the crime and others
- `secrets` - What they're hiding
- `behaviorUnderPressure` - How they react to accusations
- `isGuilty` - Whether they committed the crime

### plot-points.json
- `id` - Unique identifier
- `category` - motive, alibi, evidence, relationship
- `description` - What the player learns
- `importance` - low, medium, high, critical
- `points` - Score value
- `revealedBy` - Which characters can reveal this

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- OpenRouter API key (or OpenAI/Anthropic)

### Setup

1. **Install dependencies**
```bash
npm install
cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt && cd ..
```

2. **Configure environment**
```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

Required env vars:
- `LLM_API_KEY` - Your OpenRouter (or OpenAI) API key
- `LLM_PROVIDER` - `openrouter`, `openai`, or `anthropic`
- `IMAGE_API_KEY` - For character portrait generation (Fal.ai or Replicate)

### Running the Game

**Start both servers (recommended):**
```bash
npm run dev:all
```

This runs the Next.js frontend (port 3000) and Python backend (port 8000) concurrently.

**Or run separately:**
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
npm run dev:backend
# Or manually: cd backend && ./venv/bin/uvicorn main:app --reload
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:all` | Start frontend + backend together |
| `npm run dev` | Start Next.js frontend only |
| `npm run dev:backend` | Start Python backend only |
| `npm run generate:story <id>` | Generate a new story from synopsis |
| `npm run generate:images <id>` | Generate character portraits |
| `npm run test:llm` | Test LLM connection |
| `npm run test:character <story> <char>` | Interactive character chat |

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, Zustand
- **Backend**: Python FastAPI with OpenAI SDK
- **LLM**: OpenRouter (unified gateway to 100+ models)
- **Images**: Replicate/Fal.ai for character portraits
- **Database**: Supabase (game sessions, progress)
