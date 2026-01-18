import { NextRequest } from 'next/server';
import {
  validateStoryConsistency,
  UGCGeneratedData,
  UGCGeneratedStory,
  UGCGeneratedCharacter,
  UGCGeneratedPlotPoint,
} from '@/packages/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { story, characters, plotPoints } = body as {
      story: UGCGeneratedStory;
      characters: UGCGeneratedCharacter[];
      plotPoints: {
        plotPoints: UGCGeneratedPlotPoint[];
        minimumPointsToAccuse: number;
        perfectScoreThreshold: number;
      };
    };

    // Validate required fields
    if (!story) {
      return new Response(
        JSON.stringify({ error: 'story is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!characters || !Array.isArray(characters)) {
      return new Response(
        JSON.stringify({ error: 'characters array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!plotPoints || !plotPoints.plotPoints) {
      return new Response(
        JSON.stringify({ error: 'plotPoints is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build the data structure expected by validation
    const data: UGCGeneratedData = {
      story,
      characters,
      plotPoints,
    };

    // Run validation
    const result = validateStoryConsistency(data);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in UGC validate:', error);
    return new Response(
      JSON.stringify({ error: 'Validation failed', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
