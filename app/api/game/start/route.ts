import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { storyId } = await request.json();

    const storyDir = path.join(process.cwd(), 'stories', storyId);

    // Load story data
    const storyPath = path.join(storyDir, 'story.json');
    const charactersPath = path.join(storyDir, 'characters.json');

    if (!fs.existsSync(storyPath)) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    const storyRaw = JSON.parse(fs.readFileSync(storyPath, 'utf-8'));
    // Handle both 'premise' and 'synopsis' fields for compatibility
    const story = {
      ...storyRaw,
      premise: storyRaw.premise || storyRaw.synopsis || '',
    };
    const charactersData = JSON.parse(fs.readFileSync(charactersPath, 'utf-8'));

    // Handle both formats: { characters: [...] } or just [...]
    const allCharacters = Array.isArray(charactersData) ? charactersData : charactersData.characters;

    if (!allCharacters) {
      return NextResponse.json({ error: 'Invalid characters data' }, { status: 500 });
    }

    // Filter out victims - they can't be interrogated (they're dead/missing)
    const interactableCharacters = allCharacters.filter((c: any) => !c.isVictim);

    // Process characters - ensure they have statement field (top-level, player-facing)
    let needsSave = false;
    const processedCharacters = interactableCharacters.map((c: any) => {
      // If character doesn't have a top-level statement, generate one
      if (!c.statement) {
        needsSave = true;
        c.statement = generateFallbackStatement(c);
      }
      return c;
    });

    // Save updated characters if any were modified
    if (needsSave) {
      const allUpdated = allCharacters.map((c: any) => {
        const processed = processedCharacters.find((p: any) => p.id === c.id);
        return processed || c;
      });
      fs.writeFileSync(charactersPath, JSON.stringify({ characters: allUpdated }, null, 2));
      console.log(`[Start] Generated fallback statements for ${storyId}`);
    }

    return NextResponse.json({
      story,
      characters: processedCharacters.map((c: any) => ({
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
