import { NextRequest } from 'next/server';
import { validateFoundationStory, MIN_CHARACTERS } from '@/packages/ai';
import type {
  UGCGeneratedCharacter,
  UGCGeneratedClue,
  UGCSolution,
} from '@/packages/ai/types/ugc-types';

interface ValidateRequest {
  characters: UGCGeneratedCharacter[];
  clues: UGCGeneratedClue[];
  timeline: string[];
  solution: UGCSolution;
  scoring: {
    minimumPointsToAccuse: number;
    perfectScoreThreshold: number;
  };
}

/**
 * Validate story without publishing
 * POST /api/ugc/validate
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ValidateRequest;

    // Basic validation
    if (!body.characters || body.characters.length < MIN_CHARACTERS) {
      return Response.json({ error: `At least ${MIN_CHARACTERS} characters are required` }, { status: 400 });
    }
    if (!body.clues || body.clues.length === 0) {
      return Response.json({ error: 'At least one clue is required' }, { status: 400 });
    }
    if (!body.solution) {
      return Response.json({ error: 'Solution is required' }, { status: 400 });
    }

    // Run validation
    const validationResult = validateFoundationStory({
      clues: body.clues,
      characters: body.characters,
      timeline: body.timeline || [],
      solution: body.solution,
      minimumPointsToAccuse: body.scoring?.minimumPointsToAccuse || 50,
      perfectScoreThreshold: body.scoring?.perfectScoreThreshold || 150,
    });

    return Response.json({
      warnings: validationResult.warnings,
      isPublishable: validationResult.isPublishable,
    });
  } catch (error) {
    console.error('Validation error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Validation failed' },
      { status: 500 }
    );
  }
}
