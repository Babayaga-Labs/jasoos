import { NextRequest } from 'next/server';
import { loadAIConfig, ImageClient } from '@/packages/ai';
import type { RegenerateImageRequest, RegenerateImageResponse } from '@/packages/ai/types/ugc-types';

export const maxDuration = 60; // 1 minute max for image generation

/**
 * Validate regenerate image request
 */
function validateRequest(request: RegenerateImageRequest): string | null {
  if (!request.characterId?.trim()) {
    return 'Character ID is required';
  }
  if (!request.appearanceDescription?.trim()) {
    return 'Appearance description is required';
  }
  if (!request.setting) {
    return 'Setting is required';
  }

  return null; // Valid
}

/**
 * Regenerate character portrait image
 * POST /api/ugc/regenerate-image
 *
 * Request body: RegenerateImageRequest
 * Response: { imageUrl: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as RegenerateImageRequest;

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
    if (!config.image.apiKey) {
      return new Response(
        JSON.stringify({ error: 'Image API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build image prompt from appearance description and setting
    const imagePrompt = `Portrait of a person: ${body.appearanceDescription}. Setting: ${body.setting.location}, ${body.setting.timePeriod}. Professional headshot style, detailed face, high quality.`;

    // Generate image
    const imageClient = new ImageClient(config.image);
    const result = await imageClient.generatePortrait(imagePrompt);

    const response: RegenerateImageResponse = { imageUrl: result.url };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error regenerating image:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to regenerate image'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
