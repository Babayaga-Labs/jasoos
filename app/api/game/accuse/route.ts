import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { storyId, accusedCharacterId, reasoning, unlockedPlotPoints } = await request.json();

    const storyDir = path.join(process.cwd(), 'stories', storyId);

    // Load story data
    const storyPath = path.join(storyDir, 'story.json');
    const charactersPath = path.join(storyDir, 'characters.json');
    const plotPointsPath = path.join(storyDir, 'plot-points.json');

    const story = JSON.parse(fs.readFileSync(storyPath, 'utf-8'));
    const { characters } = JSON.parse(fs.readFileSync(charactersPath, 'utf-8'));
    const plotPointsData = JSON.parse(fs.readFileSync(plotPointsPath, 'utf-8'));

    // Find the guilty character
    const guiltyCharacter = characters.find((c: any) => c.isGuilty);
    const isCorrect = guiltyCharacter?.id === accusedCharacterId;

    // Calculate evidence score
    const unlockedPoints = plotPointsData.plotPoints.filter((pp: any) =>
      unlockedPlotPoints.includes(pp.id)
    );
    const evidenceScore = unlockedPoints.reduce((sum: number, pp: any) => sum + pp.points, 0);

    // Score reasoning using Python backend
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';
    const scoreResponse = await fetch(`${pythonBackendUrl}/api/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reasoning,
        solution: story.solution,
        is_correct: isCorrect,
      }),
    });

    if (!scoreResponse.ok) {
      throw new Error('Failed to score reasoning');
    }

    const scoreData = await scoreResponse.json();
    const reasoningScore = scoreData.score;

    // Calculate total score
    // Correct culprit: 50 points base
    // Reasoning: up to 30 points
    // Evidence: up to 20 points (scaled from collected)
    const maxEvidence = plotPointsData.plotPoints.reduce((sum: number, pp: any) => sum + pp.points, 0);
    const evidencePercentage = evidenceScore / maxEvidence;

    const totalScore = Math.round(
      (isCorrect ? 50 : 0) +
      (reasoningScore * 0.3) +
      (evidencePercentage * 20)
    );

    return NextResponse.json({
      isCorrect,
      score: totalScore,
      explanation: story.solution.explanation,
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
