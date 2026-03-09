import fs from 'fs';
import path from 'path';
import type { StoryRow, StoryWithStars, CharacterRow, ClueRow } from './supabase/queries';

const LOCAL_MYSTERIES_DIR = path.join(process.cwd(), 'new_games');

/**
 * Check if local mysteries feature is enabled
 * Only enabled in development mode
 */
export function isLocalMysteriesEnabled(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if a story ID is a local mystery
 */
export function isLocalMysteryId(storyId: string): boolean {
  if (!isLocalMysteriesEnabled()) return false;
  const mysteryPath = path.join(LOCAL_MYSTERIES_DIR, storyId);
  return fs.existsSync(mysteryPath) && fs.existsSync(path.join(mysteryPath, 'story.json'));
}

/**
 * Get all local mystery IDs (folder names)
 */
function getLocalMysteryIds(): string[] {
  if (!isLocalMysteriesEnabled()) return [];
  if (!fs.existsSync(LOCAL_MYSTERIES_DIR)) return [];

  return fs.readdirSync(LOCAL_MYSTERIES_DIR).filter((name) => {
    const mysteryPath = path.join(LOCAL_MYSTERIES_DIR, name);
    return (
      fs.statSync(mysteryPath).isDirectory() &&
      fs.existsSync(path.join(mysteryPath, 'story.json'))
    );
  });
}

/**
 * Read and parse a JSON file from a local mystery folder
 */
function readLocalJson<T>(mysteryId: string, filename: string): T | null {
  try {
    const filePath = path.join(LOCAL_MYSTERIES_DIR, mysteryId, filename);
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`[LocalMysteries] Failed to read ${mysteryId}/${filename}:`, error);
    return null;
  }
}

/**
 * Find scene image in assets folder
 */
function findSceneImage(mysteryId: string): string | null {
  const possibleNames = ['scene.png', 'scene.jpg', 'scene.jpeg', 'scene.webp'];
  for (const name of possibleNames) {
    const assetPath = path.join(LOCAL_MYSTERIES_DIR, mysteryId, 'assets', name);
    if (fs.existsSync(assetPath)) {
      return `/api/local-assets/${mysteryId}/assets/${name}`;
    }
  }
  return null;
}

/**
 * Find character image by character ID
 */
function findCharacterImage(mysteryId: string, characterId: string): string | null {
  const possibleExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
  for (const ext of possibleExtensions) {
    const assetPath = path.join(
      LOCAL_MYSTERIES_DIR,
      mysteryId,
      'assets',
      'characters',
      `${characterId}${ext}`
    );
    if (fs.existsSync(assetPath)) {
      return `/api/local-assets/${mysteryId}/assets/characters/${characterId}${ext}`;
    }
  }
  return null;
}

/**
 * Get all local stories with stars (stars are always 0 for local)
 */
export async function getLocalStoriesWithStars(): Promise<(StoryWithStars & { isLocal: true })[]> {
  if (!isLocalMysteriesEnabled()) return [];

  const mysteryIds = getLocalMysteryIds();
  const stories: (StoryWithStars & { isLocal: true })[] = [];

  for (const id of mysteryIds) {
    const story = readLocalJson<StoryRow>(id, 'story.json');
    if (story) {
      // Use scene image from JSON or find in assets folder
      const sceneImageUrl = story.scene_image_url || findSceneImage(id);

      stories.push({
        ...story,
        id, // Ensure folder name is used as ID
        scene_image_url: sceneImageUrl,
        starCount: 0, // Local stories have no stars
        isLocal: true,
      });
    }
  }

  return stories;
}

/**
 * Get a local story by ID
 */
export async function getLocalStoryById(
  storyId: string
): Promise<(StoryRow & { isLocal: true }) | null> {
  if (!isLocalMysteriesEnabled()) return null;
  if (!isLocalMysteryId(storyId)) return null;

  const story = readLocalJson<StoryRow>(storyId, 'story.json');
  if (!story) return null;

  // Use scene image from JSON or find in assets folder
  const sceneImageUrl = story.scene_image_url || findSceneImage(storyId);

  return {
    ...story,
    id: storyId,
    scene_image_url: sceneImageUrl,
    isLocal: true,
  };
}

/**
 * Get characters for a local story
 */
export async function getLocalCharactersByStoryId(
  storyId: string
): Promise<(CharacterRow & { isLocal: true })[]> {
  if (!isLocalMysteriesEnabled()) return [];
  if (!isLocalMysteryId(storyId)) return [];

  const characters = readLocalJson<CharacterRow[]>(storyId, 'characters.json');
  if (!characters) return [];

  return characters.map((char) => ({
    ...char,
    story_id: storyId,
    // Use image_url from JSON or find in assets folder
    image_url: char.image_url || findCharacterImage(storyId, char.id),
    isLocal: true,
  }));
}

/**
 * Get clues for a local story
 */
export async function getLocalCluesByStoryId(
  storyId: string
): Promise<(ClueRow & { isLocal: true })[]> {
  if (!isLocalMysteriesEnabled()) return [];
  if (!isLocalMysteryId(storyId)) return [];

  const clues = readLocalJson<ClueRow[]>(storyId, 'clues.json');
  if (!clues) return [];

  return clues.map((clue) => ({
    ...clue,
    story_id: storyId,
    isLocal: true,
  }));
}
