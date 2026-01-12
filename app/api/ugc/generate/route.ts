import { NextRequest } from 'next/server';
import { UGCEngine, loadAIConfig, GenerationProgress } from '@/packages/ai';

export const maxDuration = 300; // 5 minutes max for story generation

export async function POST(request: NextRequest) {
  try {
    const { synopsis } = await request.json();

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
  } catch (error) {
    console.error('Error in UGC generate:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to start generation' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
