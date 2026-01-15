import { NextRequest } from 'next/server';
import { loadAIConfig } from '@/packages/ai/config';
import { generateText } from '@/packages/ai/llm-client';
import type {
  UGCCrimeInput,
  UGCGeneratedStory,
  UGCGeneratedCharacter,
  UGCGeneratedPlotPoint,
} from '@/packages/ai/types/ugc-types';

export const maxDuration = 120; // 2 minute timeout

interface CluesGenerateRequest {
  crimeInput: UGCCrimeInput;
  story: UGCGeneratedStory;
  characters: UGCGeneratedCharacter[];
}

interface CluesGenerateResponse {
  plotPoints: UGCGeneratedPlotPoint[];
  minimumPointsToAccuse: number;
  perfectScoreThreshold: number;
  updatedStory: UGCGeneratedStory;
  updatedCharacters: UGCGeneratedCharacter[];
}

/**
 * Generate plot points/clues based on crime details (Stage 3 of wizard)
 * Also updates the story solution and character guilt status
 * Reuses existing prompts from ugc-engine.ts
 */
export async function POST(request: NextRequest) {
  try {
    const body: CluesGenerateRequest = await request.json();
    const { crimeInput, story, characters } = body;

    // Validate required fields
    if (!crimeInput?.crimeType) {
      return Response.json({ error: 'Crime type is required' }, { status: 400 });
    }
    if (!crimeInput?.culpritId) {
      return Response.json({ error: 'Culprit must be selected' }, { status: 400 });
    }
    if (!crimeInput?.motive?.trim()) {
      return Response.json({ error: 'Motive is required' }, { status: 400 });
    }
    if (!crimeInput?.method?.trim()) {
      return Response.json({ error: 'Method is required' }, { status: 400 });
    }

    const culprit = characters.find(c => c.tempId === crimeInput.culpritId || c.id === crimeInput.culpritId);
    if (!culprit) {
      return Response.json({ error: 'Invalid culprit selection' }, { status: 400 });
    }

    const config = loadAIConfig();

    // Filter out victims - they can't reveal clues
    const interactableCharacters = characters.filter(c => !c.isVictim);
    const victimCharacters = characters.filter(c => c.isVictim);

    const victimInfo = victimCharacters.length > 0
      ? `\nVICTIM(S) - Cannot be interrogated:\n${victimCharacters.map(v => `- ${v.name} (${v.role})`).join('\n')}`
      : '';

    const characterInfo = interactableCharacters.map(c => ({
      id: c.id,
      name: c.name,
      role: c.role,
      isGuilty: c.tempId === crimeInput.culpritId || c.id === crimeInput.culpritId,
      knowsAboutCrime: c.knowledge.knowsAboutCrime,
      knowsAboutOthers: c.knowledge.knowsAboutOthers,
    }));

    // Generate plot points - reusing existing prompt pattern
    const prompt = `You are creating clues and evidence for a detective mystery game where the ONLY way to discover information is through CHARACTER INTERROGATION.
${victimInfo}

STORY:
- Title: ${story.title}
- Setting: ${story.setting.location}, ${story.setting.timePeriod}
- Atmosphere: ${story.setting.atmosphere}

CRIME DETAILS:
- Type: ${crimeInput.crimeType}
- Culprit: ${culprit.name} (${culprit.role})
- Motive: ${crimeInput.motive}
- Method: ${crimeInput.method}

TIMELINE:
${story.actualEvents.join('\n')}

CHARACTERS AND THEIR KNOWLEDGE:
${JSON.stringify(characterInfo, null, 2)}

Create 8-12 plot points (clues) that form a solvable mystery. Generate a JSON object:

{
  "plotPoints": [
    {
      "id": "pp_snake_case_id",
      "category": "motive" | "alibi" | "evidence" | "relationship",
      "description": "What the player learns when this clue is revealed",
      "importance": "low" | "medium" | "high" | "critical",
      "points": 10-30,
      "revealedBy": ["character_id_who_can_reveal_this"],
      "detectionHints": ["keywords", "phrases", "topics that trigger this clue"]
    }
  ],
  "minimumPointsToAccuse": 50,
  "perfectScoreThreshold": calculated_total_of_all_points,
  "solutionExplanation": "Full 3-4 sentence explanation for the player after they solve it, connecting the culprit, method, and motive"
}

CRITICAL RULES FOR CLUE GENERATION:
1. EVERY clue MUST be assigned to at least one LIVING character who can reveal it
2. NEVER include victims in revealedBy - they are dead/missing and cannot be interrogated!
3. Characters can only reveal clues they would realistically know:
   - They witnessed the event directly
   - They overheard a conversation
   - They have expertise to notice something
   - They know the culprit/victim personally
   - Another character told them
4. The player solves this ONLY through interrogation - NO physical evidence found randomly
5. Critical clues pointing to the culprit must be discoverable through conversation
6. Include clues that:
   - Point to the culprit's motive (at least 2)
   - Expose the culprit's false alibi (at least 1-2)
   - Show the culprit's opportunity (at least 1)
   - Provide corroborating evidence (at least 2)

DETECTION HINTS should include:
- Direct question keywords ("where were you", "what did you see")
- Topic triggers ("alibi", "that night", "relationship")
- Character name mentions that might reveal info about them

Respond with ONLY the JSON object, no other text.`;

    const { text } = await generateText({
      config: config.llm,
      prompt,
      maxTokens: 3000,
      temperature: 0.7,
    });

    const result = parseJSONResponse(text) as {
      plotPoints: UGCGeneratedPlotPoint[];
      minimumPointsToAccuse: number;
      perfectScoreThreshold: number;
      solutionExplanation: string;
    };

    // Update story with solution
    const updatedStory: UGCGeneratedStory = {
      ...story,
      solution: {
        culprit: culprit.name,
        method: crimeInput.method,
        motive: crimeInput.motive,
        explanation: result.solutionExplanation,
      },
    };

    // Update characters with guilt status and refined knowledge
    const updatedCharacters = characters.map(c => ({
      ...c,
      isGuilty: c.tempId === crimeInput.culpritId || c.id === crimeInput.culpritId,
    }));

    return Response.json({
      success: true,
      plotPoints: result.plotPoints,
      minimumPointsToAccuse: result.minimumPointsToAccuse,
      perfectScoreThreshold: result.perfectScoreThreshold,
      updatedStory,
      updatedCharacters,
    });

  } catch (error) {
    console.error('Clues generation failed:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Clues generation failed' },
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
