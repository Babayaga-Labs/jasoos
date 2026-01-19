import { NextRequest } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
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

export const maxDuration = 300; // 5 minutes for publish with image generation

/**
 * Build the roleplay prompt for a character
 */
function buildCharacterPrompt(character: UGCGeneratedCharacter): string {
  const { personality, knowledge, secrets, behaviorUnderPressure, relationships } = character;

  const quirksStr = personality?.quirks?.join('; ') || 'None';
  const knowsAboutOthersStr = knowledge?.knowsAboutOthers?.map((k: string) => `  - ${k}`).join('\n') || '  - Nothing specific';
  const secretsStr = secrets?.map((s: { content: string; willingnessToReveal: string; revealCondition: string }) =>
    `- ${s.content} [Will reveal: ${s.willingnessToReveal}] [Condition: ${s.revealCondition}]`
  ).join('\n') || '- None';
  const relationshipsStr = Object.entries(relationships || {}).map(([id, rel]) => `- ${id}: ${rel}`).join('\n') || '- No specific relationships defined';

  const guiltyInstructions = character.isGuilty
    ? 'You ARE guilty. Be subtle in your deception. Deflect, redirect, but never outright confess unless given absolutely undeniable proof.'
    : 'You are innocent. Cooperate with the investigation while protecting your minor secrets.';

  return `You are ${character.name}, ${character.role}. You are being interrogated by a detective investigating a crime.

## YOUR IDENTITY
- Name: ${character.name}
- Role: ${character.role}
- Age: ${character.age}
- Personality: ${personality?.traits?.join(', ') || 'Unknown'}
- Speech style: ${personality?.speechStyle || 'Normal'}
- Quirks: ${quirksStr}

## WHAT YOU KNOW
- About the crime: ${knowledge?.knowsAboutCrime || 'Nothing'}
- Your alibi: ${knowledge?.alibi || 'None provided'}
- About others:
${knowsAboutOthersStr}

## YOUR SECRETS (Never reveal these directly, only if truly cornered)
${secretsStr}

## HOW YOU BEHAVE
- When defensive: ${behaviorUnderPressure?.defensive || 'Get evasive'}
- When caught in a lie: ${behaviorUnderPressure?.whenCaughtLying || 'Deflect'}
- When directly accused: ${behaviorUnderPressure?.whenAccused || 'Deny firmly'}

## YOUR RELATIONSHIPS
${relationshipsStr}

## ROLEPLAY RULES
1. Stay in character at ALL times. Never break character or acknowledge you're an AI.
2. Speak naturally in first person as ${character.name}.
3. Be cooperative but protective of your secrets.
4. If asked something you don't know, say you don't know - don't make things up.
5. Show appropriate emotions - nervousness when pressed on lies, indignation when falsely accused.
6. Keep responses concise (2-4 sentences typically).
7. ${guiltyInstructions}

Respond only as ${character.name}. Begin.
`;
}

/**
 * Generate roleplay prompt files for each character
 */
function generateRoleplayPrompts(
  characters: UGCGeneratedCharacter[],
  storyDir: string
): void {
  const promptsDir = path.join(storyDir, 'roleplay_prompts');
  fs.mkdirSync(promptsDir, { recursive: true });

  for (const character of characters) {
    // Skip victims - they can't be interrogated
    if (character.isVictim) continue;

    const promptContent = buildCharacterPrompt(character);
    const promptPath = path.join(promptsDir, `${character.id}.txt`);
    fs.writeFileSync(promptPath, promptContent);
  }
}

/**
 * Download an image from URL and save it locally
 */
async function downloadImage(url: string, destPath: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to download image: ${response.status}`);
      return false;
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure directory exists
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(destPath, buffer);
    return true;
  } catch (error) {
    console.error(`Failed to download image from ${url}:`, error);
    return false;
  }
}

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
 * 3. Saves story files
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

        const validationResult = validateFoundationStory({
          clues,
          characters,
          timeline,
          solution,
          minimumPointsToAccuse: scoring.minimumPointsToAccuse,
          perfectScoreThreshold: scoring.perfectScoreThreshold,
        });

        // Send validation warnings (but don't block)
        sendEvent({
          type: 'validation',
          warnings: validationResult.warnings,
          isPublishable: validationResult.isPublishable,
        });

        // Step 2: Regenerate timeline and knowledge from clues (internal consistency)
        // This ensures the timeline supports the user-edited clues and character knowledge aligns
        sendEvent({
          type: 'progress',
          step: 'regeneration',
          message: 'Ensuring story consistency...',
          progress: 15,
        });

        const config = loadAIConfig();
        const ugcEngine = new UGCEngine(config);

        // Regenerate timeline from current clues
        const regeneratedTimeline = await ugcEngine.generateTimelineFromClues({
          clues,
          characters,
          solution,
          setting: foundation.setting,
        });

        sendEvent({
          type: 'progress',
          step: 'regeneration',
          message: 'Aligning character knowledge...',
          progress: 22,
        });

        // Regenerate character knowledge to align with clues and new timeline
        const updatedCharacters = await ugcEngine.addCharacterKnowledge(
          characters,
          regeneratedTimeline,
          solution,
          clues
        );

        // Use the regenerated data for saving
        const finalTimeline = regeneratedTimeline;
        const finalCharacters = updatedCharacters;

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

        // Step 3: Create directories and download images
        sendEvent({
          type: 'progress',
          step: 'assets',
          message: 'Downloading assets...',
          progress: 50,
        });

        const storiesDir = path.join(process.cwd(), 'stories', storyId);
        const assetsDir = path.join(storiesDir, 'assets');
        const charactersAssetsDir = path.join(assetsDir, 'characters');

        // Create directories
        if (!fs.existsSync(charactersAssetsDir)) {
          fs.mkdirSync(charactersAssetsDir, { recursive: true });
        }

        // Download scene image
        if (sceneImageUrl) {
          sendEvent({
            type: 'progress',
            step: 'assets',
            message: 'Saving scene image...',
            progress: 55,
          });
          await downloadImage(sceneImageUrl, path.join(assetsDir, 'scene.png'));
        }

        // Download character images
        sendEvent({
          type: 'progress',
          step: 'assets',
          message: 'Saving character images...',
          progress: 60,
        });

        for (const char of finalCharacters) {
          if (char.imageUrl) {
            await downloadImage(char.imageUrl, path.join(charactersAssetsDir, `${char.id}.png`));
          }
        }

        sendEvent({
          type: 'progress',
          step: 'saving',
          message: 'Saving story files...',
          progress: 70,
        });

        // Step 4: Build story data structure for saving
        const storyData = {
          id: storyId,
          title: foundation.title,
          premise: foundation.synopsis, // Game expects 'premise'
          synopsis: foundation.synopsis, // Keep for backwards compatibility
          crimeType: foundation.crimeType,
          setting: foundation.setting,
          victimParagraph: foundation.victimParagraph,
          sceneImageUrl,
          timeline: finalTimeline, // Use regenerated timeline
          solution,
          scoring,
          createdAt: new Date().toISOString(),
        };

        // Save story.json
        fs.writeFileSync(
          path.join(storiesDir, 'story.json'),
          JSON.stringify(storyData, null, 2)
        );

        sendEvent({
          type: 'progress',
          step: 'saving',
          message: 'Saving characters...',
          progress: 75,
        });

        // Save characters.json (wrapped in object to match expected format)
        fs.writeFileSync(
          path.join(storiesDir, 'characters.json'),
          JSON.stringify({ characters: finalCharacters }, null, 2)
        );

        sendEvent({
          type: 'progress',
          step: 'saving',
          message: 'Saving clues...',
          progress: 82,
        });

        // Save plot-points.json (game expects this format)
        const plotPoints = clues.map(clue => ({
          ...clue,
          category: 'evidence', // Default category
          importance: clue.points >= 25 ? 'critical' : clue.points >= 15 ? 'high' : 'medium',
        }));
        fs.writeFileSync(
          path.join(storiesDir, 'plot-points.json'),
          JSON.stringify({
            plotPoints,
            minimumPointsToAccuse: scoring.minimumPointsToAccuse,
            perfectScoreThreshold: scoring.perfectScoreThreshold,
          }, null, 2)
        );

        sendEvent({
          type: 'progress',
          step: 'saving',
          message: 'Generating roleplay prompts...',
          progress: 85,
        });

        // Generate roleplay prompts for each character
        generateRoleplayPrompts(finalCharacters, storiesDir);

        sendEvent({
          type: 'progress',
          step: 'saving',
          message: 'Finalizing...',
          progress: 90,
        });

        // Save manifest
        const manifest = {
          id: storyId,
          title: foundation.title,
          crimeType: foundation.crimeType,
          characterCount: finalCharacters.length,
          clueCount: clues.length,
          sceneImageUrl,
          createdAt: storyData.createdAt,
        };

        fs.writeFileSync(
          path.join(storiesDir, 'manifest.json'),
          JSON.stringify(manifest, null, 2)
        );

        // Step 5: Register story in stories.config.json
        sendEvent({
          type: 'progress',
          step: 'registering',
          message: 'Registering story...',
          progress: 95,
        });

        const configPath = path.join(process.cwd(), 'stories.config.json');
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

        // Check if story already exists
        const existingIndex = configData.stories.findIndex((s: { id: string }) => s.id === storyId);
        if (existingIndex === -1) {
          // Add new story entry
          configData.stories.push({
            id: storyId,
            enabled: true,
            description: `${foundation.title} (User Generated)`,
            isUGC: true,
            createdAt: storyData.createdAt,
          });
        } else {
          // Update existing entry
          configData.stories[existingIndex].enabled = true;
          configData.stories[existingIndex].description = `${foundation.title} (User Generated)`;
        }

        fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));

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
          sceneImageUrl,
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
