import { NextRequest } from 'next/server';
import { UGCEngine, loadAIConfig } from '@/packages/ai';
import type { RegenerateTimelineRequest, RegenerateTimelineResponse } from '@/packages/ai/types/ugc-types';

export const maxDuration = 60; // 1 minute max for timeline regeneration

/**
 * Validate regenerate timeline request
 */
function validateRequest(request: RegenerateTimelineRequest): string | null {
  if (!request.clues || request.clues.length === 0) {
    return 'At least one clue is required';
  }

  if (!request.characters || request.characters.length === 0) {
    return 'At least one character is required';
  }

  if (!request.solution) {
    return 'Solution is required';
  }
  if (!request.solution.culprit?.trim()) {
    return 'Solution culprit is required';
  }
  if (!request.solution.method?.trim()) {
    return 'Solution method is required';
  }
  if (!request.solution.motive?.trim()) {
    return 'Solution motive is required';
  }

  if (!request.setting) {
    return 'Setting is required';
  }
  if (!request.setting.location?.trim()) {
    return 'Setting location is required';
  }
  if (!request.setting.timePeriod?.trim()) {
    return 'Time period is required';
  }

  return null; // Valid
}

/**
 * Regenerate timeline from edited clues
 * POST /api/ugc/regenerate-timeline
 *
 * Request body: RegenerateTimelineRequest
 * Response: { timeline: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as RegenerateTimelineRequest;

    // Validate request
    const validationError = validateRequest(body);
    if (validationError) {
      return new Response(
        JSON.stringify({ error: validationError }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load AI config
    const config = loadAIConfig();
    if (!config.llm.apiKey) {
      return new Response(
        JSON.stringify({ error: 'LLM API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Regenerate timeline
    const ugcEngine = new UGCEngine(config);
    const timeline = await ugcEngine.regenerateTimelineFromClues(body);

    const response: RegenerateTimelineResponse = { timeline };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error regenerating timeline:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to regenerate timeline'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
