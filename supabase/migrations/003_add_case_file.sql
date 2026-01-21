-- Add case_file column to stories table
-- This stores the structured case file data for the newspaper-style UI display

ALTER TABLE stories ADD COLUMN IF NOT EXISTS case_file JSONB;

-- Add a comment describing the column
COMMENT ON COLUMN stories.case_file IS 'Structured case file data (victim info, cause of death, initial evidence) displayed as newspaper clipping in game UI';
