import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { storyId, accusedCharacterId, reasoning } = await request.json();

    const storyDir = path.join(process.cwd(), 'stories', storyId);

    // Load story data
    const storyPath = path.join(storyDir, 'story.json');
    const charactersPath = path.join(storyDir, 'characters.json');

    const story = JSON.parse(fs.readFileSync(storyPath, 'utf-8'));
    const { characters } = JSON.parse(fs.readFileSync(charactersPath, 'utf-8'));

    // Find the guilty character
    const guiltyCharacter = characters.find((c: any) => c.isGuilty);
    const isCorrect = guiltyCharacter?.id === accusedCharacterId;

    console.log(`[Accuse] Accused: ${accusedCharacterId}, Guilty: ${guiltyCharacter?.id}, Correct: ${isCorrect}`);

    // Score the reasoning using Python backend
    let reasoningScore = 0;
    try {
      const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';
      const scoreResponse = await fetch(`${pythonBackendUrl}/api/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reasoning,
          solution: story.solution,
          is_correct: isCorrect,
        }),
      });

      if (scoreResponse.ok) {
        const scoreData = await scoreResponse.json();
        reasoningScore = Math.round(scoreData.score || 0);
      }
    } catch (err) {
      console.warn('[Accuse] Failed to score reasoning, using default:', err);
      // Fallback: give partial credit for length/effort
      reasoningScore = Math.min(50, Math.round(reasoning.length / 5));
    }

    // Calculate weighted total score
    // Correct answer: 60 points max
    // Reasoning quality: 40 points max
    const correctPoints = isCorrect ? 60 : 0;
    const reasoningPoints = Math.round((reasoningScore / 100) * 40);
    const totalScore = correctPoints + reasoningPoints;

    console.log(`[Accuse] Score breakdown - Correct: ${correctPoints}, Reasoning: ${reasoningPoints} (${reasoningScore}%), Total: ${totalScore}`);

    return NextResponse.json({
      isCorrect,
      score: totalScore,
      reasoningScore,
    });
  } catch (error) {
    console.error('[Accuse] Error:', error);
    return NextResponse.json({ error: 'Failed to process accusation' }, { status: 500 });
  }
}
