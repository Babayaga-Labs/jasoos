import { NextRequest } from 'next/server';
import { UGCEngine, loadAIConfig } from '@/packages/ai';
import type {
  UGCFoundation,
  UGCGeneratedCharacter,
  UGCSolution,
} from '@/packages/ai/types/ugc-types';

export const maxDuration = 120; // 2 minute timeout

interface CluesStagedRequest {
  foundation: UGCFoundation;
  characters: UGCGeneratedCharacter[];
  solution: UGCSolution;
}

/**
 * Generate clues based on finalized characters (staged flow)
 * POST /api/ugc/generate-clues-staged
 *
 * This is called after the user finalizes characters in the Characters stage
 */
export async function POST(request: NextRequest) {
  try {
    const body: CluesStagedRequest = await request.json();
    const { foundation, characters, solution } = body;

    // Validate required fields
    if (!foundation) {
      return Response.json({ error: 'Foundation is required' }, { status: 400 });
    }
    if (!characters || characters.length < 3) {
      return Response.json({ error: 'At least 3 characters are required' }, { status: 400 });
    }
    if (!solution) {
      return Response.json({ error: 'Solution is required' }, { status: 400 });
    }

    const config = loadAIConfig();
    if (!config.llm.apiKey) {
      return Response.json({ error: 'LLM API key not configured' }, { status: 500 });
    }

    const ugcEngine = new UGCEngine(config);

    // Call the engine's clue generation method directly
    // This is the same method used in fleshOutAndGenerate, but called separately
    const { clues, scoring } = await ugcEngine.generateCluesForSolvability(
      foundation,
      characters,
      solution
    );

    return Response.json({
      success: true,
      clues,
      scoring,
    });

  } catch (error) {
    console.error('Staged clues generation failed:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Clues generation failed' },
      { status: 500 }
    );
  }
}
