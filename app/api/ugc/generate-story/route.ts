import { NextRequest } from 'next/server';
import { loadAIConfig } from '@/packages/ai/config';
import { generateText } from '@/packages/ai/llm-client';
import type { UGCGeneratedStory } from '@/packages/ai/types/ugc-types';

export const maxDuration = 120; // 2 minute timeout

interface StoryGenerateRequest {
  title: string;
  settingLocation: string;
  timePeriod: string;
  customTimePeriod?: string;
  premise: string;
}

/**
 * Generate story structure from user input (Stage 1 of wizard)
 * Reuses existing prompts from ugc-engine.ts
 */
export async function POST(request: NextRequest) {
  try {
    const body: StoryGenerateRequest = await request.json();
    const { title, settingLocation, timePeriod, customTimePeriod, premise } = body;

    // Validate required fields
    if (!title?.trim()) {
      return Response.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!settingLocation?.trim()) {
      return Response.json({ error: 'Setting location is required' }, { status: 400 });
    }
    if (!timePeriod) {
      return Response.json({ error: 'Time period is required' }, { status: 400 });
    }
    if (!premise?.trim() || premise.length < 20) {
      return Response.json({ error: 'Premise must be at least 20 characters' }, { status: 400 });
    }

    const config = loadAIConfig();
    const resolvedTimePeriod = timePeriod === 'other' ? (customTimePeriod || 'Present day') : timePeriod;

    // Generate story ID from title
    const storyId = generateStoryIdFromTitle(title);

    // Generate story structure - reusing existing prompt pattern
    const prompt = `You are a mystery story writer. Create the story structure for a detective game based on the following user-provided details.

USER'S STORY DETAILS:
- Title: ${title}
- Setting: ${settingLocation}
- Time Period: ${resolvedTimePeriod}
- Premise: ${premise}

Generate a JSON object with this structure:
{
  "id": "${storyId}",
  "title": "${title}",
  "difficulty": "easy" | "medium" | "hard",
  "estimatedMinutes": 20-40,
  "setting": {
    "location": "${settingLocation}",
    "timePeriod": "${resolvedTimePeriod}",
    "atmosphere": "Describe the mood and tone fitting the setting - be evocative and immersive"
  },
  "premise": "Polish the user's premise into 2-3 compelling sentences shown to the player at the start",
  "actualEvents": [
    "Timeline of what happened, step by step",
    "Include times if relevant (e.g., '7:00 PM - Event happens')",
    "Show what different people were doing",
    "Build up to the incident being discovered"
  ],
  "solution": {
    "culprit": "TBD - will be set after characters stage",
    "method": "TBD - will be set after clues stage",
    "motive": "TBD - will be set after clues stage",
    "explanation": "TBD - will be set after clues stage"
  }
}

IMPORTANT:
- The actualEvents timeline should be detailed (6-10 events minimum)
- The atmosphere should be rich and evocative
- The premise should hook players and set up mystery
- Leave solution fields as "TBD" since crime details come in a later stage

Respond with ONLY the JSON object, no other text.`;

    const { text } = await generateText({
      config: config.llm,
      prompt,
      maxTokens: 2000,
      temperature: 0.7,
    });

    const story = parseJSONResponse(text) as UGCGeneratedStory;

    return Response.json({
      success: true,
      storyId,
      story,
    });

  } catch (error) {
    console.error('Story generation failed:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Story generation failed' },
      { status: 500 }
    );
  }
}

function generateStoryIdFromTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 40);

  const suffix = Math.random().toString(36).substring(2, 6);
  return `${slug}-${suffix}`;
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
    const arrayMatch = text.match(/\[[\s\S]*\]/);

    if (objectMatch) return JSON.parse(objectMatch[0]);
    if (arrayMatch) return JSON.parse(arrayMatch[0]);

    throw new Error('Could not parse JSON from LLM response');
  }
}
