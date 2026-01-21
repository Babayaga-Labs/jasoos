import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  timeTaken: number;
  isCurrentUser: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    // Get current user (optional - for highlighting their entry)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Fetch leaderboard data
    const { data: results, error } = await serviceClient
      .from('game_results')
      .select('user_id, score, time_taken')
      .eq('story_id', storyId)
      .order('score', { ascending: false })
      .order('time_taken', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    // Fetch profiles for all users in results
    const userIds = results?.map((r) => r.user_id) || [];
    const { data: profiles } = await serviceClient
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds);

    // Create a map for quick lookup
    const profileMap = new Map(
      profiles?.map((p) => [p.id, { displayName: p.display_name, avatarUrl: p.avatar_url }]) || []
    );

    // Build leaderboard with ranks
    const leaderboard: LeaderboardEntry[] = (results || []).map((result, index) => {
      const profile = profileMap.get(result.user_id);
      return {
        rank: index + 1,
        userId: result.user_id,
        displayName: profile?.displayName || 'Anonymous Detective',
        avatarUrl: profile?.avatarUrl || null,
        score: result.score,
        timeTaken: result.time_taken,
        isCurrentUser: user?.id === result.user_id,
      };
    });

    // Find current user's entry
    let currentUserEntry: LeaderboardEntry | null = null;
    const userInLeaderboard = leaderboard.find((e) => e.isCurrentUser);

    if (user && !userInLeaderboard) {
      // User is not in top 100, fetch their result separately
      const { data: userResult } = await serviceClient
        .from('game_results')
        .select('score, time_taken')
        .eq('story_id', storyId)
        .eq('user_id', user.id)
        .single();

      if (userResult) {
        // Count how many are ahead of the user
        const { count } = await serviceClient
          .from('game_results')
          .select('*', { count: 'exact', head: true })
          .eq('story_id', storyId)
          .or(
            `score.gt.${userResult.score},and(score.eq.${userResult.score},time_taken.lt.${userResult.time_taken})`
          );

        // Fetch user's profile
        const { data: userProfile } = await serviceClient
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single();

        currentUserEntry = {
          rank: (count || 0) + 1,
          userId: user.id,
          displayName: userProfile?.display_name || 'You',
          avatarUrl: userProfile?.avatar_url || null,
          score: userResult.score,
          timeTaken: userResult.time_taken,
          isCurrentUser: true,
        };
      }
    } else if (userInLeaderboard) {
      currentUserEntry = userInLeaderboard;
    }

    return NextResponse.json({
      leaderboard,
      currentUserEntry,
      totalPlayers: results?.length || 0,
    });
  } catch (error) {
    console.error('Error in leaderboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
