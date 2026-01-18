# Production Deployment Plan: 200 Concurrent Players

## Summary of Decisions
- **Deployment**: Railway (both Next.js frontend + Python backend)
- **Database/Auth**: Supabase (PostgreSQL + Google OAuth)
- **Mode**: Single-player only (SSE streaming sufficient)
- **Credit System**: Earn by leaderboard rank (daily payouts), spend to create UGC
- **Leaderboards**: Public, per-story rankings

---

## Phase 1: Supabase Setup & Database Schema

### 1.1 Create Supabase Project
- Create project at supabase.com
- Enable Google OAuth in Authentication > Providers
- Get `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### 1.2 Database Schema (SQL migrations)

**File**: `supabase/migrations/001_initial_schema.sql`

```sql
-- Users profile (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  credits INTEGER DEFAULT 100 NOT NULL,  -- Starting credits
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game sessions (tracks each playthrough)
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  story_id TEXT NOT NULL,
  score INTEGER,  -- 0-100
  reasoning_score INTEGER,  -- 0-100
  time_taken INTEGER,  -- seconds
  is_correct BOOLEAN,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboards (materialized view for fast queries)
CREATE TABLE leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  story_id TEXT NOT NULL,
  best_score INTEGER NOT NULL,
  best_time INTEGER,  -- tiebreaker
  play_count INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, story_id)
);

-- Credit transactions (audit log)
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,  -- positive = earned, negative = spent
  reason TEXT NOT NULL,  -- 'leaderboard_daily', 'ugc_creation', 'signup_bonus'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- UGC stories metadata (links to file storage)
CREATE TABLE ugc_stories (
  id TEXT PRIMARY KEY,  -- matches folder name
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  play_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_game_sessions_user ON game_sessions(user_id);
CREATE INDEX idx_game_sessions_story ON game_sessions(story_id);
CREATE INDEX idx_leaderboard_story_score ON leaderboard_entries(story_id, best_score DESC, best_time ASC);
CREATE INDEX idx_credit_transactions_user ON credit_transactions(user_id);
```

### 1.3 Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "Public profiles are viewable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Game sessions: users see own, insert own
CREATE POLICY "Users can view own sessions" ON game_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON game_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Leaderboards: public read
CREATE POLICY "Leaderboards are public" ON leaderboard_entries FOR SELECT USING (true);
```

---

## Phase 2: Authentication Implementation

### 2.1 Install Dependencies
```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 2.2 Files to Create/Modify

**File**: `lib/supabase/client.ts` (browser client)
```typescript
import { createBrowserClient } from '@supabase/ssr'
export const createClient = () => createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**File**: `lib/supabase/server.ts` (server client)
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
// ... server-side client setup
```

**File**: `app/auth/callback/route.ts` (OAuth callback)
- Handles Google OAuth redirect
- Creates profile on first login

**File**: `middleware.ts` (session refresh)
- Refresh session on each request
- Protect routes requiring auth

**File**: `components/auth/LoginButton.tsx`
- Google OAuth sign-in button
- Sign out functionality

### 2.3 Protect Game Routes
- `/play/*` - Requires authentication
- `/create/*` - Requires authentication + credit check
- `/api/game/*` - Validate session server-side
- `/api/ugc/*` - Validate session + deduct credits

---

## Phase 3: Credit System

### 3.1 Credit Constants

**File**: `lib/credits/constants.ts`
```typescript
export const CREDITS = {
  SIGNUP_BONUS: 100,
  UGC_CREATION_COST: 50,
  DAILY_LEADERBOARD_REWARDS: {
    1: 50,   // #1 rank
    2: 30,   // #2 rank
    3: 20,   // #3 rank
    // 4-10: 10 each
  },
}
```

### 3.2 Credit Service

**File**: `lib/credits/service.ts`
- `getUserCredits(userId)` - Get current balance
- `spendCredits(userId, amount, reason)` - Atomic deduction with check
- `earnCredits(userId, amount, reason)` - Add credits with audit log
- `canAfford(userId, amount)` - Check if user has enough

### 3.3 Daily Leaderboard Payout (Cron Job)

**File**: `app/api/cron/daily-rewards/route.ts`
- Run daily via Railway cron or Supabase Edge Function
- For each story, get top 10 players
- Award credits based on rank
- Record in credit_transactions

---

## Phase 4: Leaderboard System

### 4.1 Leaderboard Service

**File**: `lib/leaderboard/service.ts`
- `getStoryLeaderboard(storyId, limit)` - Top players for a story
- `getUserRank(userId, storyId)` - User's rank on a story
- `updateLeaderboard(userId, storyId, score, time)` - Upsert best score
- `getGlobalLeaderboard(limit)` - Aggregate across all stories

### 4.2 API Endpoints

**File**: `app/api/leaderboard/[storyId]/route.ts`
- GET: Fetch leaderboard (paginated)
- Returns: rank, username, avatar, score, time

### 4.3 UI Components

**File**: `components/game/Leaderboard.tsx`
- Display top 10 with current user highlighted
- Show user's rank if not in top 10

---

## Phase 5: Game Session Persistence

### 5.1 Modify Game Flow

**Update**: `app/api/game/start/route.ts`
- Require auth
- Create game_session record
- Return session_id for tracking

**Update**: `app/api/game/accuse/route.ts`
- Update game_session with results
- Update leaderboard_entries (upsert best score)
- Return leaderboard position

### 5.2 Modify Zustand Store

**Update**: `lib/store.ts`
- Add `sessionId` to state
- Persist chat history to Supabase (optional, for replay)
- Load previous game state on reconnect

---

## Phase 6: UGC Credit Integration

### 6.1 Modify UGC Save Flow

**Update**: `app/api/ugc/save/route.ts`
```typescript
// Before generating:
const canAfford = await creditsService.canAfford(userId, CREDITS.UGC_CREATION_COST)
if (!canAfford) {
  return Response.json({ error: 'Insufficient credits' }, { status: 402 })
}

// After successful save:
await creditsService.spendCredits(userId, CREDITS.UGC_CREATION_COST, 'ugc_creation')
await supabase.from('ugc_stories').insert({ id: storyId, creator_id: userId, title })
```

### 6.2 Credit Check UI

**Update**: `components/create/CreatePage.tsx`
- Show current credit balance
- Warn if insufficient credits before starting
- Show cost breakdown

---

## Phase 7: Rate Limiting & Security

### 7.1 Rate Limiting

**File**: `lib/rate-limit.ts`
```typescript
// Using Upstash Redis (free tier) or in-memory for MVP
import { Ratelimit } from '@upstash/ratelimit'

export const chatRateLimit = new Ratelimit({
  limiter: Ratelimit.slidingWindow(30, '10 m'),  // 30 messages per 10 min
})

export const ugcRateLimit = new Ratelimit({
  limiter: Ratelimit.slidingWindow(3, '1 h'),  // 3 UGC creates per hour
})
```

### 7.2 Apply Rate Limits

**Update**: `app/api/game/chat/route.ts`
- Check rate limit before proxying to Python backend
- Return 429 if exceeded

### 7.3 Input Validation

- Sanitize all user inputs before LLM prompts (prevent injection)
- Validate story IDs match expected pattern
- Limit message length (e.g., 500 chars)

---

## Phase 8: Production Configuration

### 8.1 Environment Variables

**Update**: `.env.example`
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # For server-side admin ops

# Railway sets these automatically
PORT=3000
RAILWAY_ENVIRONMENT=production

# Python backend URL (internal Railway URL)
PYTHON_BACKEND_URL=http://backend.railway.internal:8000
```

### 8.2 CORS Fix

**Update**: `backend/main.py`
```python
import os
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    os.getenv("FRONTEND_URL", ""),  # e.g., https://yourapp.up.railway.app
]
origins = [o for o in origins if o]  # Filter empty
```

### 8.3 Railway Configuration

**File**: `railway.json` (or use Railway dashboard)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "npm run start",
    "healthcheckPath": "/api/health"
  }
}
```

**Python Backend**: Separate Railway service
```dockerfile
# Dockerfile for backend
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 8.4 Health Checks

**File**: `app/api/health/route.ts`
```typescript
export async function GET() {
  // Check Supabase connection
  // Check Python backend
  return Response.json({ status: 'healthy', timestamp: Date.now() })
}
```

---

## Phase 9: Monitoring & Observability

### 9.1 Error Tracking (Sentry)

```bash
npm install @sentry/nextjs
```

**File**: `sentry.client.config.ts`, `sentry.server.config.ts`
- Capture errors automatically
- Track performance

### 9.2 Logging

**File**: `lib/logger.ts`
- Structured JSON logging
- Log levels: info, warn, error
- Include user_id, session_id for tracing

---

## Implementation Order (Recommended)

1. **Supabase Setup** (Phase 1) - Database schema, RLS policies
2. **Authentication** (Phase 2) - Google OAuth, protected routes
3. **Game Session Tracking** (Phase 5) - Record plays in DB
4. **Leaderboards** (Phase 4) - Show rankings
5. **Credit System** (Phase 3) - Balance, transactions
6. **UGC Credits** (Phase 6) - Charge for creation
7. **Rate Limiting** (Phase 7) - Protect LLM costs
8. **Production Config** (Phase 8) - Railway, CORS, env vars
9. **Monitoring** (Phase 9) - Sentry, logging
10. **Daily Cron** (Phase 3.3) - Leaderboard payouts

---

## Files to Modify (Summary)

| File | Changes |
|------|---------|
| `lib/store.ts` | Add sessionId, auth state |
| `backend/main.py` | Dynamic CORS origins |
| `app/api/game/start/route.ts` | Auth check, create session |
| `app/api/game/accuse/route.ts` | Save results, update leaderboard |
| `app/api/game/chat/route.ts` | Rate limiting |
| `app/api/ugc/save/route.ts` | Credit check & deduction |
| `.env.example` | Add Supabase vars |

## New Files to Create

| File | Purpose |
|------|---------|
| `lib/supabase/client.ts` | Browser Supabase client |
| `lib/supabase/server.ts` | Server Supabase client |
| `lib/credits/service.ts` | Credit operations |
| `lib/leaderboard/service.ts` | Leaderboard operations |
| `lib/rate-limit.ts` | Rate limiting |
| `middleware.ts` | Auth session refresh |
| `app/auth/callback/route.ts` | OAuth callback |
| `components/auth/LoginButton.tsx` | Auth UI |
| `supabase/migrations/*.sql` | Database schema |

---

## Verification Plan

1. **Auth Flow**: Sign in with Google → profile created → redirect works
2. **Game Play**: Start game → chat works → accuse → score saved → leaderboard updated
3. **Credits**: Check balance → create UGC → credits deducted → insufficient credits blocked
4. **Leaderboard**: Play game → rank appears → daily payout job runs → credits earned
5. **Rate Limits**: Spam chat → get rate limited → error shown
6. **Production**: Deploy to Railway → Google OAuth works → all features functional

---

## Cost Estimate (200 concurrent users)

| Service | Tier | Est. Cost |
|---------|------|-----------|
| Railway (Next.js) | Pro | ~$10-20/mo |
| Railway (Python) | Pro | ~$5-10/mo |
| Supabase | Free tier | $0 (up to 500MB, 50k auth users) |
| OpenRouter/LLM | Pay-per-use | Variable (~$50-200/mo depending on usage) |
| Upstash Redis | Free tier | $0 (10k requests/day) |
| Sentry | Free tier | $0 |
| **Total** | | **~$65-230/mo** |

The main cost driver is LLM usage - rate limiting and credits help control this.
