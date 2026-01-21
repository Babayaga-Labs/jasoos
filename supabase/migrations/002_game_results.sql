-- Game results table for leaderboard
CREATE TABLE game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  time_taken INTEGER NOT NULL CHECK (time_taken >= 0),
  reasoning_score INTEGER NOT NULL CHECK (reasoning_score >= 0 AND reasoning_score <= 100),
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one best score per user per story
  CONSTRAINT unique_user_story UNIQUE (user_id, story_id)
);

-- Indexes for efficient leaderboard queries
CREATE INDEX idx_game_results_story_id ON game_results(story_id);
CREATE INDEX idx_game_results_user_id ON game_results(user_id);
CREATE INDEX idx_game_results_leaderboard ON game_results(story_id, score DESC, time_taken ASC);

-- Enable RLS
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view leaderboard results
CREATE POLICY "Anyone can view leaderboard" ON game_results
  FOR SELECT USING (true);

-- Policy: Authenticated users can insert their own results
CREATE POLICY "Users can insert own results" ON game_results
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Policy: Authenticated users can update their own results
CREATE POLICY "Users can update own results" ON game_results
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Service role can manage all results
CREATE POLICY "Service role can manage results" ON game_results
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- Profiles table for storing user display names and avatars
-- ============================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view profiles (needed for leaderboard display)
CREATE POLICY "Public profiles viewable" ON profiles
  FOR SELECT USING (true);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Policy: Service role can manage all profiles
CREATE POLICY "Service role can manage profiles" ON profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- Trigger to auto-create profile when a new user signs up
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- Function to update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_game_results_updated_at
  BEFORE UPDATE ON game_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
