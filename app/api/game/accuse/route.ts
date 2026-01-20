import { NextRequest, NextResponse } from 'next/server';

// Load env
import 'dotenv/config';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { loadAIConfig, LLMClient } from '@/packages/ai';
import {
  getStoryById,
  getCharactersByStoryId,
  getCluesByStoryId,
  characterRowToGameFormat,
  clueRowToGameFormat,
} from '@/lib/supabase/queries';

export async function POST(request: NextRequest) {
  try {
    const { storyId, accusedCharacterId, reasoning, unlockedPlotPoints } = await request.json();

    // Load story data from Supabase
    const storyRow = await getStoryById(storyId);
    if (!storyRow) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Load characters from Supabase
    const characterRows = await getCharactersByStoryId(storyId);
    const characters = characterRows.map(characterRowToGameFormat);

    // Load clues from Supabase
    const clueRows = await getCluesByStoryId(storyId);
    const plotPoints = clueRows.map(clueRowToGameFormat);

    // Find the guilty character
    const guiltyCharacter = characters.find((c) => c.isGuilty);
    const isCorrect = guiltyCharacter?.id === accusedCharacterId;

    // Calculate evidence score
    const unlockedPoints = plotPoints.filter((pp) =>
      unlockedPlotPoints.includes(pp.id)
    );
    const evidenceScore = unlockedPoints.reduce((sum, pp) => sum + pp.points, 0);

    // Score reasoning using LLM
    const reasoningScore = await scoreReasoning(reasoning, storyRow.solution, isCorrect);

    // Calculate total score
    // Correct culprit: 50 points base
    // Reasoning: up to 30 points
    // Evidence: up to 20 points (scaled from collected)
    const maxEvidence = plotPoints.reduce((sum, pp) => sum + pp.points, 0);
    const evidencePercentage = maxEvidence > 0 ? evidenceScore / maxEvidence : 0;

    const totalScore = Math.round(
      (isCorrect ? 50 : 0) +
      (reasoningScore * 0.3) +
      (evidencePercentage * 20)
    );

    return NextResponse.json({
      isCorrect,
      score: totalScore,
      explanation: storyRow.solution.explanation,
      breakdown: {
        culprit: isCorrect ? 50 : 0,
        reasoning: Math.round(reasoningScore * 0.3),
        evidence: Math.round(evidencePercentage * 20),
      },
    });
  } catch (error) {
    console.error('Error in accusation:', error);
    return NextResponse.json({ error: 'Failed to process accusation' }, { status: 500 });
  }
}

async function scoreReasoning(
  reasoning: string,
  solution: any,
  isCorrect: boolean
): Promise<number> {
  if (!isCorrect) return 0;
  if (!reasoning || reasoning.length < 20) return 10;

  try {
    const config = loadAIConfig();
    const llm = new LLMClient(config.llm);

    const prompt = `You are evaluating a detective's reasoning for solving a mystery.

THE CORRECT SOLUTION:
- Culprit: ${solution.culprit}
- Method: ${solution.method}
- Motive: ${solution.motive}

THE DETECTIVE'S REASONING:
"${reasoning}"

Score the reasoning from 0-100 based on:
1. Does it identify the correct motive? (30 points)
2. Does it explain the method? (30 points)
3. Is the logic sound and well-explained? (40 points)

Respond with ONLY a number from 0-100, nothing else.`;

    const response = await llm.generate(prompt, {
      maxTokens: 10,
      temperature: 0.1,
    });

    const score = parseInt(response.content.trim(), 10);
    return isNaN(score) ? 50 : Math.min(100, Math.max(0, score));
  } catch (error) {
    console.error('Error scoring reasoning:', error);
    return 50; // Default score on error
  }
}
