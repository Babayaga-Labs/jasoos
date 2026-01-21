-- Mystery stars table for tracking user favorites
CREATE TABLE mystery_stars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One star per user per story
  CONSTRAINT unique_user_story_star UNIQUE (user_id, story_id)
);

-- Index for counting stars per story (used for sorting)
CREATE INDEX idx_mystery_stars_story_id ON mystery_stars(story_id);

-- Index for checking if user starred a story
CREATE INDEX idx_mystery_stars_user_story ON mystery_stars(user_id, story_id);

-- Enable RLS
ALTER TABLE mystery_stars ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view star counts
CREATE POLICY "Anyone can view stars" ON mystery_stars
  FOR SELECT USING (true);

-- Policy: Authenticated users can star mysteries
CREATE POLICY "Users can star mysteries" ON mystery_stars
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Policy: Users can unstar their own
CREATE POLICY "Users can unstar own" ON mystery_stars
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policy: Service role can manage all
CREATE POLICY "Service role manages stars" ON mystery_stars
  FOR ALL TO service_role USING (true) WITH CHECK (true);
