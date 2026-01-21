import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { storyId, score, timeTaken, reasoningScore, isCorrect } = await request.json();

    // Validate input
    if (!storyId || score === undefined || timeTaken === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user already has a result for this story
    const { data: existingResult } = await supabase
      .from('game_results')
      .select('id, score, time_taken')
      .eq('user_id', user.id)
      .eq('story_id', storyId)
      .single();

    // Determine if this is a better score
    // Better = higher score, or same score with lower time
    const shouldUpdate =
      !existingResult ||
      score > existingResult.score ||
      (score === existingResult.score && timeTaken < existingResult.time_taken);

    if (!shouldUpdate) {
      return NextResponse.json({
        saved: false,
        message: 'Existing score is better',
        existingScore: existingResult?.score,
        existingTime: existingResult?.time_taken,
      });
    }

    // Upsert the result
    const { data, error } = await supabase
      .from('game_results')
      .upsert(
        {
          user_id: user.id,
          story_id: storyId,
          score,
          time_taken: timeTaken,
          reasoning_score: reasoningScore,
          is_correct: isCorrect,
        },
        {
          onConflict: 'user_id,story_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving result:', error);
      return NextResponse.json({ error: 'Failed to save result' }, { status: 500 });
    }

    return NextResponse.json({
      saved: true,
      result: data,
      isNewBest: !existingResult || score > existingResult.score,
    });
  } catch (error) {
    console.error('Error in save-result:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
