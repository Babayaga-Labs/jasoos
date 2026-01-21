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

    // Process characters - ALWAYS derive statement from alibi to strip revealing info
    const processedCharacters = interactableCharacters.map((c) => {
      // Always regenerate statement from alibi to ensure no revealing text
      c.statement = deriveStatementFromAlibi(c.name, c.knowledge?.alibi || '');
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
      caseFile: storyRow.case_file,
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
 * Derive a third-person statement from a character's alibi
 * Strips any text that reveals whether the alibi is true or false
 */
function deriveStatementFromAlibi(name: string, alibi: string): string {
  if (!alibi || alibi.length < 5) {
    return `${name} was present during the incident. No detailed statement provided.`;
  }

  // Clean up internal annotations - remove anything that reveals alibi validity
  let cleanAlibi = alibi
    // Remove parenthetical annotations
    .replace(/\s*\(false\)\s*/gi, '')
    .replace(/\s*\(true\)\s*/gi, '')
    .replace(/\s*\(verified\)\s*/gi, '')
    .replace(/\s*\(unverified\)\s*/gi, '')
    // Remove "FALSE" / "TRUE" markers at end
    .replace(/\s*[-–—]\s*(FALSE|TRUE)\s*$/i, '')
    .replace(/\s+(FALSE|TRUE)\s*$/i, '')
    // Remove sentences/clauses that reveal alibi validity
    .replace(/,?\s*but\s+(this\s+is|it\s+is|was)\s+(disproved|proven false|contradicted|refuted)[^.]*\.?/gi, '.')
    .replace(/,?\s*[-–—]\s*(this\s+)?(alibi\s+)?(is\s+)?(false|unverified|a lie|contradicted)[^.]*\.?/gi, '.')
    .replace(/,?\s*[-–—]\s*her alibi is false\.?/gi, '.')
    .replace(/,?\s*[-–—]\s*his alibi is false\.?/gi, '.')
    .replace(/,?\s*which\s+(is|was)\s+(later\s+)?(disproved|proven false|contradicted)[^.]*\.?/gi, '.')
    .replace(/;\s*(however|but),?\s+(this\s+)?(is|was)\s+(disproved|false|a lie)[^.]*\.?/gi, '.')
    // Remove phrases indicating verification status at end
    .replace(/\s*[-–—]\s*verified by[^.]*\.?$/gi, '')
    .replace(/\s*[-–—]\s*confirmed by[^.]*\.?$/gi, '')
    .replace(/\s*[-–—]\s*corroborated by[^.]*\.?$/gi, '')
    // Clean up any trailing punctuation issues
    .replace(/\.\s*\./g, '.')
    .replace(/,\s*\./g, '.')
    .replace(/\s+\./g, '.')
    .trim();

  // Remove trailing period if the alibi ends awkwardly after cleanup
  cleanAlibi = cleanAlibi.replace(/[,;]\s*$/, '').trim();

  // If already third-person style
  if (/^claims?\s/i.test(cleanAlibi)) {
    return cleanAlibi.charAt(0).toUpperCase() + cleanAlibi.slice(1);
  }

  // Convert first-person to third-person
  if (/^i (was|am|have|had|went|saw|heard)/i.test(cleanAlibi)) {
    return cleanAlibi
      .replace(/^i was/i, `Claims to have been`)
      .replace(/^i am/i, `Says they are`)
      .replace(/^i have/i, `Says they have`)
      .replace(/^i had/i, `Claims they had`)
      .replace(/^i went/i, `Says they went`)
      .replace(/^i saw/i, `Claims to have seen`)
      .replace(/^i heard/i, `Claims to have heard`);
  }

  // Wrap as a claim
  return `"${cleanAlibi}"`;
}
