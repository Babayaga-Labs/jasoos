import { NextRequest } from 'next/server';
import { UGCEngine, loadAIConfig, MIN_CHARACTERS, MAX_CHARACTERS } from '@/packages/ai';
import type { FleshOutRequest, FleshOutProgressEvent } from '@/packages/ai/types/ugc-types';

export const maxDuration = 300; // 5 minutes max for generation

/**
 * Validate flesh-out request
 */
function validateFleshOutRequest(request: FleshOutRequest): string | null {
  // Validate foundation
  if (!request.foundation) {
    return 'Foundation data is required';
  }
  if (!request.foundation.title?.trim()) {
    return 'Title is required';
  }
  if (!request.foundation.synopsis?.trim()) {
    return 'Synopsis is required';
  }
  if (!request.foundation.crimeType) {
    return 'Crime type is required';
  }
  if (!request.foundation.setting?.location?.trim()) {
    return 'Setting location is required';
  }
  if (!request.foundation.setting?.timePeriod?.trim()) {
    return 'Time period is required';
  }
  if (!request.foundation.victimParagraph?.trim()) {
    return 'Victim paragraph is required';
  }

  // Validate characters
  if (!request.characters || request.characters.length < MIN_CHARACTERS) {
    return `At least ${MIN_CHARACTERS} characters are required`;
  }
  if (request.characters.length > MAX_CHARACTERS) {
    return `Maximum ${MAX_CHARACTERS} characters allowed`;
  }

  // Validate each character (minimal validation for foundation characters)
  for (let i = 0; i < request.characters.length; i++) {
    const char = request.characters[i];
    if (!char.id?.trim()) {
      return `Character ${i + 1}: ID is required`;
    }
    if (!char.name?.trim()) {
      return `Character ${i + 1}: Name is required`;
    }
    if (!char.role?.trim()) {
      return `Character ${i + 1}: Role is required`;
    }
  }

  // Validate culprit
  if (!request.culprit) {
    return 'Culprit information is required';
  }
  if (!request.culprit.characterId?.trim()) {
    return 'Culprit character ID is required';
  }
  const culpritExists = request.characters.some(c => c.id === request.culprit.characterId);
  if (!culpritExists) {
    return 'Selected culprit is not in the character list';
  }
  if (!request.culprit.motive?.trim()) {
    return 'Motive is required';
  }
  if (!request.culprit.method?.trim()) {
    return 'Method is required';
  }

  return null; // Valid
}

/**
 * Flesh out characters and generate full story data
 * POST /api/ugc/flesh-out
 *
 * Request body: FleshOutRequest
 * Response: SSE stream with FleshOutProgressEvent and FleshOutCompleteEvent
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as FleshOutRequest;

    // Validate request
    const validationError = validateFleshOutRequest(body);
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

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const ugcEngine = new UGCEngine(config);

          // Stage 1: Generate characters only (clues/timeline generated later after user edits)
          const result = await ugcEngine.fleshOutCharactersOnly(
            body,
            (progress: FleshOutProgressEvent) => {
              sendEvent(progress);
            }
          );

          // Send complete event with characters and solution
          // Note: clues, timeline, scoring are NOT included - generated in later stages
          sendEvent({
            type: 'complete',
            result: {
              ...result,
              // Provide empty defaults for fields that will be populated later
              clues: [],
              timeline: [],
              scoring: {
                minimumPointsToAccuse: 50,
                perfectScoreThreshold: 150,
              },
            },
          });
        } catch (error) {
          console.error('Flesh-out generation error:', error);
          sendEvent({
            type: 'error',
            message: error instanceof Error ? error.message : 'Generation failed',
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in flesh-out:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to start generation' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
