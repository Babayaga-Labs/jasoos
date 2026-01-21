import { NextRequest } from 'next/server';
import { UGCEngine, loadAIConfig } from '@/packages/ai';
import type {
  UGCGeneratedCharacter,
  UGCGeneratedClue,
  UGCSolution,
} from '@/packages/ai/types/ugc-types';

export const maxDuration = 60; // 1 minute timeout

interface CaseFileRequest {
  timeline: string[];
  clues: UGCGeneratedClue[];
  characters: UGCGeneratedCharacter[];
  solution: UGCSolution;
  setting: {
    location: string;
    timePeriod: string;
    atmosphere?: string;
  };
}

/**
 * Generate case file as a post-processing step after story generation
 * POST /api/ugc/generate-case-file
 *
 * This creates the newspaper-style case file shown to players at game start
 */
export async function POST(request: NextRequest) {
  try {
    const body: CaseFileRequest = await request.json();
    const { timeline, clues, characters, solution, setting } = body;

    // Validate required fields
    if (!timeline || timeline.length === 0) {
      return Response.json({ error: 'Timeline is required' }, { status: 400 });
    }
    if (!clues || clues.length === 0) {
      return Response.json({ error: 'Clues are required' }, { status: 400 });
    }
    if (!characters || characters.length === 0) {
      return Response.json({ error: 'Characters are required' }, { status: 400 });
    }
    if (!solution) {
      return Response.json({ error: 'Solution is required' }, { status: 400 });
    }
    if (!setting) {
      return Response.json({ error: 'Setting is required' }, { status: 400 });
    }

    const config = loadAIConfig();
    if (!config.llm.apiKey) {
      return Response.json({ error: 'LLM API key not configured' }, { status: 500 });
    }

    const ugcEngine = new UGCEngine(config);

    // Generate the case file
    const caseFile = await ugcEngine.generateCaseFile(
      timeline,
      clues,
      characters,
      solution,
      setting
    );

    return Response.json({
      success: true,
      caseFile,
    });

  } catch (error) {
    console.error('Case file generation failed:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Case file generation failed' },
      { status: 500 }
    );
  }
}
