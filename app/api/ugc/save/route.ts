import { NextRequest } from 'next/server';
import {
  UGCEngine,
  loadAIConfig,
  GenerationProgress,
  UGCFormInput,
  UGCDraftState,
  PromptTrace,
} from '@/packages/ai';

export const maxDuration = 300; // 5 minutes for saving with image generation

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storyId, formInput, draft, promptTraces } = body as {
      storyId: string;
      formInput: UGCFormInput;
      draft: UGCDraftState;
      promptTraces?: PromptTrace[];
    };

    // Validate required fields
    if (!storyId) {
      return new Response(
        JSON.stringify({ error: 'storyId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!formInput) {
      return new Response(
        JSON.stringify({ error: 'formInput is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!draft || !draft.story || !draft.characters || !draft.plotPoints) {
      return new Response(
        JSON.stringify({ error: 'draft with story, characters, and plotPoints is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load AI config
    const config = loadAIConfig();

    // Create SSE stream for progress updates during image generation
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const ugcEngine = new UGCEngine(config);

          sendEvent({
            type: 'progress',
            step: 'story',
            message: 'Saving story files...',
            progress: 20,
          });

          const savedStoryId = await ugcEngine.saveFinalStory(
            storyId,
            draft,
            formInput,
            (progress: GenerationProgress) => {
              sendEvent({
                type: 'progress',
                step: progress.step,
                message: progress.message,
                progress: Math.min(progress.progress, 100),
              });
            },
            promptTraces
          );

          sendEvent({
            type: 'complete',
            storyId: savedStoryId,
            success: true,
          });
        } catch (error) {
          console.error('Save error:', error);
          sendEvent({
            type: 'error',
            message: error instanceof Error ? error.message : 'Save failed',
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
    console.error('Error in UGC save:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to save story' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
