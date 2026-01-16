import { NextRequest } from 'next/server';
import { UGCEngine, loadAIConfig } from '@/packages/ai';

export const maxDuration = 60; // 1 minute max for scaffold generation

/**
 * Generate story scaffold from a basic premise
 * POST /api/ugc/generate-scaffold
 *
 * Request body: { premise: string }
 * Response: { scaffold: UGCStoryScaffold }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { premise } = body;

    // Validate premise
    if (!premise || typeof premise !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Premise is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (premise.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: 'Premise should be at least 10 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (premise.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Premise should not exceed 1000 characters' }),
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

    // Generate scaffold
    const ugcEngine = new UGCEngine(config);
    const scaffold = await ugcEngine.generateStoryScaffold(premise);

    return new Response(
      JSON.stringify({ scaffold }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating scaffold:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to generate scaffold'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
