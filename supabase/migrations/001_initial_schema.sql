-- Stories table
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  synopsis TEXT NOT NULL,
  crime_type TEXT NOT NULL,
  setting JSONB NOT NULL,
  victim_paragraph TEXT,
  timeline TEXT[],
  solution JSONB NOT NULL,
  scoring JSONB NOT NULL,
  scene_image_url TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Characters table
CREATE TABLE IF NOT EXISTS characters (
  id TEXT NOT NULL,
  story_id TEXT REFERENCES stories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  age INTEGER,
  is_guilty BOOLEAN DEFAULT FALSE,
  is_victim BOOLEAN DEFAULT FALSE,
  personality JSONB,
  appearance JSONB,
  knowledge JSONB,
  statement TEXT,
  secrets JSONB,
  behavior_under_pressure JSONB,
  relationships JSONB,
  image_url TEXT,
  PRIMARY KEY (story_id, id)
);

-- Clues table
CREATE TABLE IF NOT EXISTS clues (
  id TEXT NOT NULL,
  story_id TEXT REFERENCES stories(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  points INTEGER DEFAULT 10,
  revealed_by TEXT[],
  detection_hints TEXT[],
  PRIMARY KEY (story_id, id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_stories_published ON stories(is_published);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_characters_story_id ON characters(story_id);
CREATE INDEX IF NOT EXISTS idx_clues_story_id ON clues(story_id);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE clues ENABLE ROW LEVEL SECURITY;

-- Stories policies
-- Anyone can read published stories
CREATE POLICY "Anyone can read published stories"
  ON stories FOR SELECT
  USING (is_published = TRUE);

-- Authenticated users can read their own unpublished stories
CREATE POLICY "Users can read their own stories"
  ON stories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Authenticated users can insert their own stories
CREATE POLICY "Users can insert their own stories"
  ON stories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role can insert stories (for migration and anonymous publishing)
CREATE POLICY "Service role can insert stories"
  ON stories FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

-- Service role can read all stories
CREATE POLICY "Service role can read all stories"
  ON stories FOR SELECT
  TO service_role
  USING (TRUE);

-- Users can update their own stories
CREATE POLICY "Users can update their own stories"
  ON stories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can update stories
CREATE POLICY "Service role can update stories"
  ON stories FOR UPDATE
  TO service_role
  USING (TRUE);

-- Characters policies
-- Anyone can read characters of published stories
CREATE POLICY "Anyone can read characters of published stories"
  ON characters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = characters.story_id
      AND stories.is_published = TRUE
    )
  );

-- Service role can manage all characters
CREATE POLICY "Service role can insert characters"
  ON characters FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

CREATE POLICY "Service role can read all characters"
  ON characters FOR SELECT
  TO service_role
  USING (TRUE);

CREATE POLICY "Service role can update characters"
  ON characters FOR UPDATE
  TO service_role
  USING (TRUE);

CREATE POLICY "Service role can delete characters"
  ON characters FOR DELETE
  TO service_role
  USING (TRUE);

-- Clues policies
-- Anyone can read clues of published stories
CREATE POLICY "Anyone can read clues of published stories"
  ON clues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = clues.story_id
      AND stories.is_published = TRUE
    )
  );

-- Service role can manage all clues
CREATE POLICY "Service role can insert clues"
  ON clues FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

CREATE POLICY "Service role can read all clues"
  ON clues FOR SELECT
  TO service_role
  USING (TRUE);

CREATE POLICY "Service role can update clues"
  ON clues FOR UPDATE
  TO service_role
  USING (TRUE);

CREATE POLICY "Service role can delete clues"
  ON clues FOR DELETE
  TO service_role
  USING (TRUE);
