import { NextRequest } from 'next/server';
import { validateFoundationStory, loadAIConfig, MIN_CHARACTERS } from '@/packages/ai';
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
  deepCheck?: boolean; // If true, runs LLM-based semantic validation
}

/**
 * Validate story without publishing
 * POST /api/ugc/validate
 *
 * Set deepCheck: true to run LLM-based semantic analysis (slower but more thorough)
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

    // Load AI config if deep check is requested
    const aiConfig = body.deepCheck ? loadAIConfig() : undefined;

    // Run validation (async now due to optional LLM check)
    const validationResult = await validateFoundationStory(
      {
        clues: body.clues,
        characters: body.characters,
        timeline: body.timeline || [],
        solution: body.solution,
      },
      {
        deepCheck: body.deepCheck,
        llmConfig: aiConfig?.llm,
      }
    );

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
