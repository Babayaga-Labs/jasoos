import { NextRequest } from 'next/server';
import {
  UGCEngine,
  loadAIConfig,
  GenerationProgress,
  UGCFormInput,
  MIN_CHARACTERS,
  MAX_CHARACTERS,
} from '@/packages/ai';

export const maxDuration = 300; // 5 minutes max for story generation

/**
 * Validate structured form input
 */
function validateFormInput(formInput: UGCFormInput): string | null {
  if (!formInput.title?.trim()) {
    return 'Title is required';
  }
  if (!formInput.settingLocation?.trim()) {
    return 'Setting location is required';
  }
  if (!formInput.timePeriod) {
    return 'Time period is required';
  }
  if (formInput.timePeriod === 'other' && !formInput.customTimePeriod?.trim()) {
    return 'Custom time period is required when "Other" is selected';
  }
  if (!formInput.premise?.trim()) {
    return 'Premise is required';
  }
  if (formInput.premise.length < 20) {
    return 'Premise should be at least 20 characters';
  }
  if (!formInput.characters || formInput.characters.length < MIN_CHARACTERS) {
    return `At least ${MIN_CHARACTERS} characters are required`;
  }
  if (formInput.characters.length > MAX_CHARACTERS) {
    return `Maximum ${MAX_CHARACTERS} characters allowed`;
  }

  // Validate each character
  for (let i = 0; i < formInput.characters.length; i++) {
    const char = formInput.characters[i];
    if (!char.name?.trim()) {
      return `Character ${i + 1}: Name is required`;
    }
    if (!char.role?.trim()) {
      return `Character ${i + 1}: Role is required`;
    }
    if (!char.description?.trim()) {
      return `Character ${i + 1}: Description is required`;
    }
  }

  // Validate crime
  if (!formInput.crime) {
    return 'Crime details are required';
  }
  if (!formInput.crime.culpritId) {
    return 'Culprit must be selected';
  }
  const culpritExists = formInput.characters.some(c => c.tempId === formInput.crime.culpritId);
  if (!culpritExists) {
    return 'Selected culprit is not in the character list';
  }
  if (!formInput.crime.motive?.trim()) {
    return 'Motive is required';
  }
  if (!formInput.crime.method?.trim()) {
    return 'Method is required';
  }

  return null; // Valid
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if this is a structured input (new flow) or synopsis (legacy flow)
    const isStructuredInput = body.formInput !== undefined;

    if (isStructuredInput) {
      // New structured input flow
      const { formInput } = body as { formInput: UGCFormInput };

      // Validate form input
      const validationError = validateFormInput(formInput);
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

            const result = await ugcEngine.generateFromInput(
              formInput,
              (progress: GenerationProgress) => {
                sendEvent({
                  type: 'progress',
                  step: progress.step,
                  message: progress.message,
                  progress: progress.progress,
                });
              }
            );

            // Send complete event with full generated data for review
            sendEvent({
              type: 'complete',
              storyId: result.storyId,
              data: result.data,
              promptTraces: result.promptTraces,
            });
          } catch (error) {
            console.error('UGC generation error:', error);
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
    } else {
      // Legacy synopsis flow
      const { synopsis } = body;

      // Validate synopsis
      if (!synopsis || typeof synopsis !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Synopsis is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (synopsis.length < 50) {
        return new Response(
          JSON.stringify({ error: 'Synopsis should be at least 50 characters' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (synopsis.length > 5000) {
        return new Response(
          JSON.stringify({ error: 'Synopsis should not exceed 5000 characters' }),
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

            const result = await ugcEngine.generateFromSynopsis(
              synopsis,
              (progress: GenerationProgress) => {
                sendEvent({
                  type: 'progress',
                  step: progress.step,
                  message: progress.message,
                  progress: progress.progress,
                });
              }
            );

            sendEvent({
              type: 'complete',
              storyId: result.storyId,
              title: result.story.title,
            });
          } catch (error) {
            console.error('UGC generation error:', error);
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
    }
  } catch (error) {
    console.error('Error in UGC generate:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to start generation' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
