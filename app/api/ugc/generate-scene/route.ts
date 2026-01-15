import { NextRequest } from 'next/server';
import { loadAIConfig } from '@/packages/ai/config';
import { ImageClient } from '@/packages/ai/image-client';
import type { UGCGeneratedStory } from '@/packages/ai/types/ugc-types';

export const maxDuration = 120; // 2 minute timeout

interface SceneGenerateRequest {
  story: UGCGeneratedStory;
}

/**
 * Generate scene image for the story (Stage 4 of wizard)
 */
export async function POST(request: NextRequest) {
  try {
    const body: SceneGenerateRequest = await request.json();
    const { story } = body;

    if (!story?.setting) {
      return Response.json({ error: 'Story with setting is required' }, { status: 400 });
    }

    const config = loadAIConfig();

    if (!config.image.apiKey) {
      // Return placeholder if no image API key
      return Response.json({
        success: true,
        imageUrl: null,
        message: 'Image generation skipped - no API key configured',
      });
    }

    const imageClient = new ImageClient(config.image);

    // Build scene prompt from story setting
    const scenePrompt = `${story.setting.location}, ${story.setting.timePeriod}, ${story.setting.atmosphere}, cinematic wide shot, dramatic lighting, detailed environment, atmospheric, mystery setting`;

    const result = await imageClient.generateScene(scenePrompt);

    return Response.json({
      success: true,
      imageUrl: result.url,
    });

  } catch (error) {
    console.error('Scene generation failed:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Scene generation failed' },
      { status: 500 }
    );
  }
}
