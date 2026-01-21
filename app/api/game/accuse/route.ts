import { NextRequest, NextResponse } from 'next/server';

// Load env
import 'dotenv/config';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { loadAIConfig, LLMClient } from '@/packages/ai';
import {
  getStoryById,
  getCharactersByStoryId,
  characterRowToGameFormat,
} from '@/lib/supabase/queries';

export async function POST(request: NextRequest) {
  try {
    const { storyId, accusedCharacterId, reasoning } = await request.json();

    // Load story data from Supabase
    const storyRow = await getStoryById(storyId);
    if (!storyRow) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Load characters from Supabase
    const characterRows = await getCharactersByStoryId(storyId);
    const characters = characterRows.map(characterRowToGameFormat);

    // Find the guilty character
    let guiltyCharacter = characters.find((c) => c.isGuilty);

    // Fallback for legacy stories: match by culprit name from solution
    if (!guiltyCharacter && storyRow.solution?.culprit) {
      guiltyCharacter = characters.find(
        (c) => c.name.toLowerCase() === storyRow.solution.culprit.toLowerCase()
      );
      if (guiltyCharacter) {
        console.log('[Accusation] Used fallback culprit matching by name:', guiltyCharacter.name);
      }
    }

    if (!guiltyCharacter) {
      console.error('[Accusation Error] No guilty character found in story:', storyId);
      return NextResponse.json({
        error: 'Story configuration error: no culprit found',
        debug: { characterCount: characters.length, storyId }
      }, { status: 500 });
    }

    const isCorrect = guiltyCharacter.id === accusedCharacterId;

    // Score reasoning using LLM (includes timeline for context)
    const reasoningScore = await scoreReasoning(
      reasoning,
      storyRow.solution,
      storyRow.timeline || [],
      isCorrect
    );

    // Calculate total score: 60 (correct culprit) + 40 (reasoning quality)
    const totalScore = Math.round(
      (isCorrect ? 60 : 0) +
      (reasoningScore * 0.4)
    );

    return NextResponse.json({
      isCorrect,
      score: totalScore,
      reasoningScore,
      explanation: storyRow.solution.explanation,
      breakdown: {
        culprit: isCorrect ? 60 : 0,
        reasoning: Math.round(reasoningScore * 0.4),
      },
    });
  } catch (error) {
    console.error('Error in accusation:', error);
    return NextResponse.json({ error: 'Failed to process accusation' }, { status: 500 });
  }
}

async function scoreReasoning(
  reasoning: string,
  solution: { culprit: string; method: string; motive: string; explanation: string },
  timeline: string[],
  isCorrect: boolean
): Promise<number> {
  if (!isCorrect) return 0;

  const config = loadAIConfig();
  const llm = new LLMClient(config.llm);

  const timelineSection = timeline.length > 0
    ? `\nTIMELINE OF EVENTS:\n${timeline.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n`
    : '';

  const prompt = `You are evaluating a detective's reasoning for solving a mystery case.

THE CASE SOLUTION:
- Culprit: ${solution.culprit}
- Method: ${solution.method}
- Motive: ${solution.motive}
${timelineSection}
THE DETECTIVE'S REASONING:
"${reasoning || '(no reasoning provided)'}"

Score the detective's reasoning from 0-100 based on how well they solved the case:
1. Did they identify the correct motive? (30 points)
2. Did they explain how the crime was committed? (30 points)
3. Is the logic sound, coherent, and well-explained? (40 points)

Be fair but rigorous. A good detective should demonstrate understanding of WHY and HOW the crime happened.

Respond with ONLY a number from 0-100, nothing else.`;

  const response = await llm.generate(prompt, {
    maxTokens: 10,
    temperature: 0.1,
  });

  const score = parseInt(response.content.trim(), 10);
  return isNaN(score) ? 0 : Math.min(100, Math.max(0, score));
}
