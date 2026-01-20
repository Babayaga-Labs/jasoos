import { NextRequest, NextResponse } from 'next/server';
import {
  getStoryById,
  getCharactersByStoryId,
  characterRowToGameFormat,
} from '@/lib/supabase/queries';

export async function POST(request: NextRequest) {
  try {
    const { storyId } = await request.json();

    // Load story from Supabase
    const storyRow = await getStoryById(storyId);
    if (!storyRow) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Load characters from Supabase
    const characterRows = await getCharactersByStoryId(storyId);
    if (!characterRows || characterRows.length === 0) {
      return NextResponse.json({ error: 'No characters found' }, { status: 500 });
    }

    // Convert to game format
    const allCharacters = characterRows.map(characterRowToGameFormat);

    // Filter out victims - they can't be interrogated (they're dead/missing)
    const interactableCharacters = allCharacters.filter((c) => !c.isVictim);

    // Process characters - ensure they have statement field (top-level, player-facing)
    const processedCharacters = interactableCharacters.map((c) => {
      // If character doesn't have a top-level statement, generate one
      if (!c.statement) {
        c.statement = generateFallbackStatement(c);
      }
      return c;
    });

    // Build story object for frontend
    const story = {
      id: storyRow.id,
      title: storyRow.title,
      premise: storyRow.synopsis,
      synopsis: storyRow.synopsis,
      crimeType: storyRow.crime_type,
      setting: storyRow.setting,
      victimParagraph: storyRow.victim_paragraph,
      sceneImageUrl: storyRow.scene_image_url,
      timeline: storyRow.timeline,
      solution: storyRow.solution,
      scoring: storyRow.scoring,
    };

    return NextResponse.json({
      story,
      characters: processedCharacters.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.role,
        age: c.age,
        appearance: c.appearance,
        personality: {
          traits: c.personality.traits,
          speechStyle: c.personality.speechStyle,
        },
        statement: c.statement || '',
        imageUrl: c.imageUrl,
        // Don't send isGuilty, isVictim, knowledge, or secrets to client!
      })),
    });
  } catch (error) {
    console.error('[Start] Error starting game:', error);
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
  }
}

/**
 * Generate a fallback statement for characters without one
 * Creates a third-person case-file style summary
 */
function generateFallbackStatement(character: any): string {
  const rawAlibi = character.knowledge?.alibi || '';
  const name = character.name || 'This person';

  // Clean up the alibi - remove meta annotations
  let cleanAlibi = rawAlibi
    .replace(/\s*\(false\)\s*/gi, '')
    .replace(/\s*\(true\)\s*/gi, '')
    .trim();

  // If empty or too messy, create a generic one
  if (!cleanAlibi || cleanAlibi.length < 5) {
    return `${name} was present during the incident. No detailed statement provided.`;
  }

  // If already starts with "Claims" or similar, clean it up
  if (/^claims?\s/i.test(cleanAlibi)) {
    return cleanAlibi.charAt(0).toUpperCase() + cleanAlibi.slice(1);
  }

  // If it's first person, convert to third person
  if (/^i (was|am|have|had|went|saw|heard)/i.test(cleanAlibi)) {
    cleanAlibi = cleanAlibi
      .replace(/^i was/i, `Claims to have been`)
      .replace(/^i am/i, `Says they are`)
      .replace(/^i have/i, `Says they have`)
      .replace(/^i had/i, `Claims they had`)
      .replace(/^i went/i, `Says they went`)
      .replace(/^i saw/i, `Claims to have seen`)
      .replace(/^i heard/i, `Claims to have heard`);
    return cleanAlibi;
  }

  // Otherwise wrap it as a claim
  return `Claims: "${cleanAlibi}"`;
}
