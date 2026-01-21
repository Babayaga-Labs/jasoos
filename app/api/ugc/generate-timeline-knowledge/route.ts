import { NextRequest } from 'next/server';
import { UGCEngine, loadAIConfig } from '@/packages/ai';
import type {
  UGCFoundation,
  UGCGeneratedCharacter,
  UGCGeneratedClue,
  UGCSolution,
} from '@/packages/ai/types/ugc-types';

export const maxDuration = 120; // 2 minute timeout

interface TimelineKnowledgeRequest {
  foundation: UGCFoundation;
  characters: UGCGeneratedCharacter[];
  clues: UGCGeneratedClue[];
  solution: UGCSolution;
}

/**
 * Generate timeline and character knowledge based on finalized clues (staged flow)
 * POST /api/ugc/generate-timeline-knowledge
 *
 * This is called after the user finalizes clues in the Clues stage
 */
export async function POST(request: NextRequest) {
  try {
    const body: TimelineKnowledgeRequest = await request.json();
    const { foundation, characters, clues, solution } = body;

    // Validate required fields
    if (!foundation) {
      return Response.json({ error: 'Foundation is required' }, { status: 400 });
    }
    if (!characters || characters.length < 3) {
      return Response.json({ error: 'At least 3 characters are required' }, { status: 400 });
    }
    if (!clues || clues.length === 0) {
      return Response.json({ error: 'At least 1 clue is required' }, { status: 400 });
    }
    if (!solution) {
      return Response.json({ error: 'Solution is required' }, { status: 400 });
    }

    const config = loadAIConfig();
    if (!config.llm.apiKey) {
      return Response.json({ error: 'LLM API key not configured' }, { status: 500 });
    }

    const ugcEngine = new UGCEngine(config);

    // Step 1: Generate timeline from clues
    const timeline = await ugcEngine.regenerateTimelineFromClues({
      clues,
      characters,
      solution,
      setting: foundation.setting,
    });

    // Step 2: Add character knowledge based on timeline and clues
    const charactersWithKnowledge = await ugcEngine.addCharacterKnowledge(
      characters,
      timeline,
      solution,
      clues
    );

    return Response.json({
      success: true,
      timeline,
      characters: charactersWithKnowledge,
    });

  } catch (error) {
    console.error('Timeline/knowledge generation failed:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Timeline generation failed' },
      { status: 500 }
    );
  }
}
