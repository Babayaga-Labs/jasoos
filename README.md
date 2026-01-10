# AI Detective Game

An AI-powered detective game where players take on the role of Sherlock Holmes, interrogating AI suspects to solve mysteries.

## Project Structure

```
/app                    # Next.js frontend
/packages
  /engine               # Core game logic
  /ai                   # LLM and image generation clients
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

## Development

```bash
npm install
npm run dev
```

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, Zustand
- **LLM**: Claude (Anthropic) for character conversations
- **Images**: Replicate/Fal.ai for character portraits
- **Database**: Supabase (game sessions, progress)
