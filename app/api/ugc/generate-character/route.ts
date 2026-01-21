import { NextRequest } from 'next/server';
import { loadAIConfig } from '@/packages/ai/config';
import { generateText } from '@/packages/ai/llm-client';
import { ImageClient } from '@/packages/ai/image-client';
import { deriveStatementFromAlibi } from '@/packages/ai/ugc-engine';
import type {
  UGCCharacterInput,
  UGCGeneratedStory,
  UGCGeneratedCharacter,
} from '@/packages/ai/types/ugc-types';

export const maxDuration = 180; // 3 minute timeout (includes image generation)

interface CharacterGenerateRequest {
  characterInput: UGCCharacterInput;
  storyContext: UGCGeneratedStory;
  existingCharacters: UGCGeneratedCharacter[];
}

/**
 * Generate a single enhanced character with portrait (Stage 2 of wizard)
 * Reuses existing prompts from ugc-engine.ts
 */
export async function POST(request: NextRequest) {
  try {
    const body: CharacterGenerateRequest = await request.json();
    const { characterInput, storyContext, existingCharacters } = body;

    // Validate required fields
    if (!characterInput?.name?.trim()) {
      return Response.json({ error: 'Character name is required' }, { status: 400 });
    }
    if (!characterInput?.role?.trim()) {
      return Response.json({ error: 'Character role is required' }, { status: 400 });
    }
    if (!characterInput?.description?.trim()) {
      return Response.json({ error: 'Character description is required' }, { status: 400 });
    }

    const config = loadAIConfig();

    // Build existing characters context for relationships
    const existingCharsContext = existingCharacters.length > 0
      ? `\n\nEXISTING CHARACTERS (create relationships with these):\n${existingCharacters.map(c =>
        `- ${c.id}: ${c.name} (${c.role}) - ${c.isVictim ? 'VICTIM' : 'suspect'}`
      ).join('\n')}`
      : '';

    // Generate enhanced character - reusing existing prompt pattern
    const prompt = `You are developing a character for a detective mystery game. Enhance this character with gameplay-relevant details.

STORY CONTEXT:
- Title: ${storyContext.title}
- Setting: ${storyContext.setting.location}, ${storyContext.setting.timePeriod}
- Atmosphere: ${storyContext.setting.atmosphere}
${existingCharsContext}

CHARACTER TO ENHANCE:
- Name: ${characterInput.name}
- Role: ${characterInput.role}
- Description: ${characterInput.description}
- Is Victim: ${characterInput.isVictim || false}
- User's Personality Traits: ${characterInput.personalityTraits?.join(', ') || 'None provided'}
- User's Secret: ${characterInput.secret || 'None provided'}

Generate a JSON object with this structure:
{
  "id": "${characterInput.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}",
  "tempId": "${characterInput.tempId}",
  "name": "${characterInput.name}",
  "role": "${characterInput.role}",
  "age": appropriate_age_number,
  "isGuilty": false,
  "isVictim": ${characterInput.isVictim || false},
  "personality": {
    "traits": ${JSON.stringify(characterInput.personalityTraits || [])},
    "speechStyle": "How they talk - formal, casual, nervous, dramatic, etc.",
    "quirks": ["2 behavioral quirks or mannerisms"]
  },
  "appearance": {
    "description": "${characterInput.description}",
    "imagePrompt": "Detailed prompt for AI portrait generation based on description, including: physical features, clothing, expression, lighting style"
  },
  "knowledge": {
    "knowsAboutCrime": "What this character might witness or know (placeholder until crime is defined)",
    "knowsAboutOthers": ["What they know about other characters"],
    "alibi": "ONLY their claim - e.g. 'I was in the garden'. Do NOT include true/false analysis."
  },
  "secrets": [
    {
      "content": "Use user's secret if provided, or generate one appropriate to character",
      "willingnessToReveal": "low" | "medium" | "high" | "never",
      "revealCondition": "What makes them reveal this secret"
    }
  ],
  "behaviorUnderPressure": {
    "defensive": "How they act when feeling defensive",
    "whenCaughtLying": "How they react when caught in a lie",
    "whenAccused": "How they respond to direct accusation"
  },
  "relationships": {
    ${existingCharacters.map(c => `"${c.id}": "Their relationship to ${c.name}"`).join(',\n    ') || '"placeholder": "Will be filled with relationships to other characters"'}
  }
}

IMPORTANT GUIDELINES:
1. Keep isGuilty as false - culprit is determined in the clues stage
2. Generate rich, interesting personality details
3. The imagePrompt should be detailed enough for AI portrait generation
4. If this is a victim, their knowledge and alibi are less important

Respond with ONLY the JSON object, no other text.`;

    const { text } = await generateText({
      config: config.llm,
      prompt,
      maxTokens: 2000,
      temperature: 0.7,
    });

    const character = parseJSONResponse(text) as UGCGeneratedCharacter;

    // Derive statement from alibi instead of LLM generation
    const statement = deriveStatementFromAlibi(
      character.name,
      character.knowledge?.alibi || ''
    );

    // Generate portrait image if no uploaded image
    let imageUrl: string | undefined;
    if (!characterInput.uploadedImageUrl && config.image.apiKey) {
      try {
        const imageClient = new ImageClient(config.image);
        const result = await imageClient.generatePortrait(character.appearance.imagePrompt);
        imageUrl = result.url;
      } catch (imageError) {
        console.warn('Portrait generation failed:', imageError);
        // Continue without portrait - can be generated later
      }
    } else if (characterInput.uploadedImageUrl) {
      imageUrl = characterInput.uploadedImageUrl;
    }

    return Response.json({
      success: true,
      character: {
        ...character,
        statement,
        imageUrl,
      },
    });

  } catch (error) {
    console.error('Character generation failed:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Character generation failed' },
      { status: 500 }
    );
  }
}

function parseJSONResponse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }

    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) return JSON.parse(objectMatch[0]);

    throw new Error('Could not parse JSON from LLM response');
  }
}
