import { NextRequest } from 'next/server';
import {
  loadAIConfig,
  ImageClient,
  validateFoundationStory,
  UGCEngine,
} from '@/packages/ai';
import type {
  UGCGeneratedCharacter,
  UGCGeneratedClue,
  UGCSolution,
  UGCFoundation,
} from '@/packages/ai/types/ugc-types';
import {
  insertStory,
  insertCharacters,
  insertClues,
  deleteCharactersByStoryId,
  deleteCluesByStoryId,
  getStoryById,
} from '@/lib/supabase/queries';
import { uploadImageFromUrl } from '@/lib/supabase/storage';

export const maxDuration = 300; // 5 minutes for publish with image generation

/**
 * Publish request from the new foundation-based flow
 */
interface PublishRequest {
  storyId: string;
  foundation: UGCFoundation;
  characters: UGCGeneratedCharacter[];
  clues: UGCGeneratedClue[];
  timeline: string[];
  solution: UGCSolution;
  scoring: {
    minimumPointsToAccuse: number;
    perfectScoreThreshold: number;
  };
  caseFile?: {
    victimName: string;
    victimDescription: string;
    causeOfDeath: string;
    lastSeen: string;
    locationFound: string;
    discoveredBy: string;
    timeOfDiscovery: string;
    timeOfDeath: string;
    initialEvidence: string[];
  };
}

/**
 * Validate publish request
 */
function validateRequest(request: PublishRequest): string | null {
  if (!request.storyId?.trim()) {
    return 'Story ID is required';
  }
  if (!request.foundation) {
    return 'Foundation is required';
  }
  if (!request.characters || request.characters.length < 3) {
    return 'At least 3 characters are required';
  }
  if (!request.clues || request.clues.length === 0) {
    return 'At least one clue is required';
  }
  if (!request.timeline || request.timeline.length === 0) {
    return 'Timeline is required';
  }
  if (!request.solution) {
    return 'Solution is required';
  }
  return null;
}

/**
 * Publish story endpoint
 * POST /api/ugc/publish
 *
 * 1. Validates the story
 * 2. Generates scene image
 * 3. Saves story to Supabase
 * 4. Returns the published story ID
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const body = await request.json() as PublishRequest;

        // Validate request
        const validationError = validateRequest(body);
        if (validationError) {
          sendEvent({ type: 'error', error: validationError });
          controller.close();
          return;
        }

        const {
          storyId,
          foundation,
          characters,
          clues,
          timeline,
          solution,
          scoring,
        } = body;

        // Step 1: Run validation
        sendEvent({
          type: 'progress',
          step: 'validation',
          message: 'Validating story...',
          progress: 10,
        });

        const validationResult = await validateFoundationStory({
          clues,
          characters,
          timeline,
          solution,
        });

        // Send validation warnings (but don't block)
        sendEvent({
          type: 'validation',
          warnings: validationResult.warnings,
          isPublishable: validationResult.isPublishable,
        });

        // Step 2: Generate character knowledge (single LLM call)
        // Timeline and case file are already generated from the review step
        sendEvent({
          type: 'progress',
          step: 'knowledge',
          message: 'Generating character knowledge...',
          progress: 20,
        });

        const config = loadAIConfig();
        const ugcEngine = new UGCEngine(config);

        // Generate character knowledge based on the timeline from review step
        const updatedCharacters = await ugcEngine.addCharacterKnowledge(
          characters,
          timeline,
          solution,
          clues
        );

        // Use timeline and case file from request (generated during review)
        const finalTimeline = timeline;
        const finalCharacters = updatedCharacters;
        const caseFile = body.caseFile;

        if (!caseFile) {
          throw new Error('Case file is required - should be generated during review step');
        }

        // Step 3: Generate scene image
        sendEvent({
          type: 'progress',
          step: 'scene',
          message: 'Generating scene image...',
          progress: 30,
        });
        let sceneImageUrl: string | null = null;

        if (config.image.apiKey) {
          try {
            const imageClient = new ImageClient(config.image);
            const scenePrompt = `${foundation.setting.location}, ${foundation.setting.timePeriod}, ${foundation.setting.atmosphere}, cinematic wide shot, dramatic lighting, detailed environment, atmospheric, mystery setting`;
            const result = await imageClient.generateScene(scenePrompt);
            sceneImageUrl = result.url;
          } catch (imageError) {
            console.error('Scene image generation failed:', imageError);
            // Continue without scene image
          }
        }

        // Step 4: Upload images to Supabase Storage
        sendEvent({
          type: 'progress',
          step: 'assets',
          message: 'Uploading assets...',
          progress: 50,
        });

        let finalSceneImageUrl: string | null = null;

        // Upload scene image
        if (sceneImageUrl) {
          sendEvent({
            type: 'progress',
            step: 'assets',
            message: 'Saving scene image...',
            progress: 55,
          });
          finalSceneImageUrl = await uploadImageFromUrl(
            sceneImageUrl,
            `${storyId}/scene.png`
          );
        }

        // Upload character images
        sendEvent({
          type: 'progress',
          step: 'assets',
          message: 'Saving character images...',
          progress: 60,
        });

        const charactersWithStorageUrls = await Promise.all(
          finalCharacters.map(async (char) => {
            if (char.imageUrl) {
              const storageUrl = await uploadImageFromUrl(
                char.imageUrl,
                `${storyId}/characters/${char.id}.png`
              );
              return { ...char, imageUrl: storageUrl || char.imageUrl };
            }
            return char;
          })
        );

        sendEvent({
          type: 'progress',
          step: 'saving',
          message: 'Saving to database...',
          progress: 70,
        });

        // Step 5: Check if story exists (update vs insert)
        const existingStory = await getStoryById(storyId);

        if (existingStory) {
          // Delete existing characters and clues for republish
          await deleteCharactersByStoryId(storyId);
          await deleteCluesByStoryId(storyId);
        }

        // Step 6: Insert story to Supabase
        const storyInserted = await insertStory({
          id: storyId,
          user_id: null, // Anonymous for now, can be set from session
          title: foundation.title,
          synopsis: foundation.synopsis,
          crime_type: foundation.crimeType,
          setting: foundation.setting,
          victim_paragraph: foundation.victimParagraph,
          timeline: finalTimeline,
          solution,
          scoring,
          scene_image_url: finalSceneImageUrl,
          case_file: caseFile,
          is_published: true,
        });

        if (!storyInserted) {
          throw new Error('Failed to save story to database');
        }

        sendEvent({
          type: 'progress',
          step: 'saving',
          message: 'Saving characters...',
          progress: 80,
        });

        // Step 7: Insert characters
        const charactersInserted = await insertCharacters(storyId, charactersWithStorageUrls);
        if (!charactersInserted) {
          throw new Error('Failed to save characters to database');
        }

        sendEvent({
          type: 'progress',
          step: 'saving',
          message: 'Saving clues...',
          progress: 90,
        });

        // Step 8: Insert clues
        const cluesInserted = await insertClues(storyId, clues);
        if (!cluesInserted) {
          throw new Error('Failed to save clues to database');
        }

        sendEvent({
          type: 'progress',
          step: 'complete',
          message: 'Story published!',
          progress: 100,
        });

        // Send completion event
        sendEvent({
          type: 'complete',
          storyId,
          sceneImageUrl: finalSceneImageUrl,
          success: true,
        });

      } catch (error) {
        console.error('Publish error:', error);
        sendEvent({
          type: 'error',
          error: error instanceof Error ? error.message : 'Publish failed',
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
