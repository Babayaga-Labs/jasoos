import { createServiceClient } from './server';
import type {
  UGCGeneratedCharacter,
  UGCGeneratedClue,
  UGCSolution,
} from '@/packages/ai/types/ugc-types';

// ============================================================================
// Types for database rows
// ============================================================================

export interface StoryRow {
  id: string;
  user_id: string | null;
  title: string;
  synopsis: string;
  crime_type: string;
  setting: {
    location: string;
    timePeriod: string;
    atmosphere: string;
  };
  victim_paragraph: string | null;
  timeline: string[];
  solution: UGCSolution;
  scoring: {
    minimumPointsToAccuse: number;
    perfectScoreThreshold: number;
  };
  scene_image_url: string | null;
  is_published: boolean;
  created_at: string;
}

export interface CharacterRow {
  id: string;
  story_id: string;
  name: string;
  role: string;
  age: number | null;
  is_guilty: boolean;
  is_victim: boolean;
  personality: {
    traits: string[];
    speechStyle: string;
    quirks: string[];
  } | null;
  appearance: {
    description: string;
    imagePrompt: string;
  } | null;
  knowledge: {
    knowsAboutCrime: string;
    knowsAboutOthers: string[];
    alibi: string;
  } | null;
  statement: string | null;
  secrets: Array<{
    content: string;
    willingnessToReveal: string;
    revealCondition: string;
  }> | null;
  behavior_under_pressure: {
    defensive: string;
    whenCaughtLying: string;
    whenAccused: string;
  } | null;
  relationships: Record<string, string> | null;
  image_url: string | null;
}

export interface ClueRow {
  id: string;
  story_id: string;
  description: string;
  points: number;
  revealed_by: string[];
  detection_hints: string[];
}

// ============================================================================
// Story Queries
// ============================================================================

/**
 * Get all published stories for the home page
 */
export async function getPublishedStories(): Promise<StoryRow[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch published stories:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a story by ID
 */
export async function getStoryById(storyId: string): Promise<StoryRow | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', storyId)
    .single();

  if (error) {
    console.error('Failed to fetch story:', error);
    return null;
  }

  return data;
}

/**
 * Insert or update a story (upsert)
 */
export async function insertStory(story: Omit<StoryRow, 'created_at'>): Promise<boolean> {
  const supabase = createServiceClient();

  const { error } = await supabase.from('stories').upsert(story, {
    onConflict: 'id',
  });

  if (error) {
    console.error('Failed to insert/update story:', error);
    return false;
  }

  return true;
}

/**
 * Update an existing story
 */
export async function updateStory(
  storyId: string,
  updates: Partial<Omit<StoryRow, 'id' | 'created_at'>>
): Promise<boolean> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('stories')
    .update(updates)
    .eq('id', storyId);

  if (error) {
    console.error('Failed to update story:', error);
    return false;
  }

  return true;
}

// ============================================================================
// Character Queries
// ============================================================================

/**
 * Get all characters for a story
 */
export async function getCharactersByStoryId(
  storyId: string
): Promise<CharacterRow[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('story_id', storyId);

  if (error) {
    console.error('Failed to fetch characters:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a specific character
 */
export async function getCharacter(
  storyId: string,
  characterId: string
): Promise<CharacterRow | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('story_id', storyId)
    .eq('id', characterId)
    .single();

  if (error) {
    console.error('Failed to fetch character:', error);
    return null;
  }

  return data;
}

/**
 * Insert multiple characters for a story
 */
export async function insertCharacters(
  storyId: string,
  characters: UGCGeneratedCharacter[]
): Promise<boolean> {
  const supabase = createServiceClient();

  const rows: Omit<CharacterRow, 'story_id'>[] = characters.map((char) => ({
    id: char.id,
    story_id: storyId,
    name: char.name,
    role: char.role,
    age: char.age,
    is_guilty: char.isGuilty,
    is_victim: char.isVictim,
    personality: char.personality,
    appearance: char.appearance,
    knowledge: char.knowledge,
    statement: char.statement || null,
    secrets: char.secrets,
    behavior_under_pressure: char.behaviorUnderPressure,
    relationships: char.relationships,
    image_url: char.imageUrl || null,
  }));

  const { error } = await supabase.from('characters').insert(
    rows.map((r) => ({ ...r, story_id: storyId }))
  );

  if (error) {
    console.error('Failed to insert characters:', error);
    return false;
  }

  return true;
}

/**
 * Delete all characters for a story
 */
export async function deleteCharactersByStoryId(storyId: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('characters')
    .delete()
    .eq('story_id', storyId);

  if (error) {
    console.error('Failed to delete characters:', error);
    return false;
  }

  return true;
}

// ============================================================================
// Clue Queries
// ============================================================================

/**
 * Get all clues for a story
 */
export async function getCluesByStoryId(storyId: string): Promise<ClueRow[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('clues')
    .select('*')
    .eq('story_id', storyId);

  if (error) {
    console.error('Failed to fetch clues:', error);
    return [];
  }

  return data || [];
}

/**
 * Insert multiple clues for a story
 */
export async function insertClues(
  storyId: string,
  clues: UGCGeneratedClue[]
): Promise<boolean> {
  const supabase = createServiceClient();

  const rows = clues.map((clue) => ({
    id: clue.id,
    story_id: storyId,
    description: clue.description,
    points: clue.points,
    revealed_by: clue.revealedBy,
    detection_hints: clue.detectionHints,
  }));

  const { error } = await supabase.from('clues').insert(rows);

  if (error) {
    console.error('Failed to insert clues:', error);
    return false;
  }

  return true;
}

/**
 * Delete all clues for a story
 */
export async function deleteCluesByStoryId(storyId: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { error } = await supabase.from('clues').delete().eq('story_id', storyId);

  if (error) {
    console.error('Failed to delete clues:', error);
    return false;
  }

  return true;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert CharacterRow to the format expected by the game
 */
export function characterRowToGameFormat(row: CharacterRow): UGCGeneratedCharacter {
  return {
    id: row.id,
    tempId: row.id,
    name: row.name,
    role: row.role,
    age: row.age || 30,
    isGuilty: row.is_guilty,
    isVictim: row.is_victim,
    personality: row.personality || {
      traits: [],
      speechStyle: 'normal',
      quirks: [],
    },
    appearance: row.appearance || {
      description: '',
      imagePrompt: '',
    },
    knowledge: row.knowledge || {
      knowsAboutCrime: '',
      knowsAboutOthers: [],
      alibi: '',
    },
    statement: row.statement || '',
    secrets: (row.secrets || []) as UGCGeneratedCharacter['secrets'],
    behaviorUnderPressure: row.behavior_under_pressure || {
      defensive: 'Get evasive',
      whenCaughtLying: 'Deflect',
      whenAccused: 'Deny firmly',
    },
    relationships: row.relationships || {},
    imageUrl: row.image_url || undefined,
  };
}

/**
 * Convert ClueRow to the format expected by the game
 */
export function clueRowToGameFormat(row: ClueRow): UGCGeneratedClue {
  return {
    id: row.id,
    description: row.description,
    points: row.points,
    revealedBy: row.revealed_by,
    detectionHints: row.detection_hints,
  };
}
