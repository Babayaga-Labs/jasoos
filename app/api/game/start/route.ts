import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { storyId } = await request.json();

    const storyDir = path.join(process.cwd(), 'stories', storyId);

    // Load story data
    const storyPath = path.join(storyDir, 'story.json');
    const charactersPath = path.join(storyDir, 'characters.json');
    const plotPointsPath = path.join(storyDir, 'plot-points.json');

    if (!fs.existsSync(storyPath)) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    const story = JSON.parse(fs.readFileSync(storyPath, 'utf-8'));
    const { characters } = JSON.parse(fs.readFileSync(charactersPath, 'utf-8'));
    const plotPointsData = JSON.parse(fs.readFileSync(plotPointsPath, 'utf-8'));

    // Calculate total possible points
    const totalPossiblePoints = plotPointsData.plotPoints.reduce(
      (sum: number, pp: any) => sum + pp.points,
      0
    );

    return NextResponse.json({
      story,
      characters: characters.map((c: any) => ({
        id: c.id,
        name: c.name,
        role: c.role,
        age: c.age,
        appearance: c.appearance,
        personality: {
          traits: c.personality.traits,
          speechStyle: c.personality.speechStyle,
        },
        // Don't send isGuilty to client!
      })),
      plotPoints: plotPointsData.plotPoints.map((pp: any) => ({
        id: pp.id,
        category: pp.category,
        description: pp.description,
        importance: pp.importance,
        points: pp.points,
        // Don't send revealedBy or detectionHints to client!
      })),
      totalPossiblePoints,
      minimumPointsToAccuse: plotPointsData.minimumPointsToAccuse,
    });
  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
  }
}
