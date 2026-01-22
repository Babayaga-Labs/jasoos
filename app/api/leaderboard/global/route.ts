import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface GlobalLeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalPoints: number;
  mysteriesSolved: number;
  isCurrentUser: boolean;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    // Get current user (optional - for highlighting their entry)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Fetch aggregated leaderboard data
    // GROUP BY user_id, SUM scores, COUNT stories
    const { data: results, error } = await serviceClient
      .from('game_results')
      .select('user_id, score, story_id');

    if (error) {
      console.error('Error fetching global leaderboard:', error);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    // Aggregate scores per user
    const userStats = new Map<string, { totalPoints: number; mysteriesSolved: Set<string> }>();

    (results || []).forEach((result) => {
      const existing = userStats.get(result.user_id);
      if (existing) {
        existing.totalPoints += result.score;
        existing.mysteriesSolved.add(result.story_id);
      } else {
        userStats.set(result.user_id, {
          totalPoints: result.score,
          mysteriesSolved: new Set([result.story_id]),
        });
      }
    });

    // Convert to array and sort by total points
    const sortedUsers = Array.from(userStats.entries())
      .map(([userId, stats]) => ({
        userId,
        totalPoints: stats.totalPoints,
        mysteriesSolved: stats.mysteriesSolved.size,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);

    // Get top 100
    const top100 = sortedUsers.slice(0, 100);
    const userIds = top100.map((u) => u.userId);

    // Fetch profiles for top 100 users
    const { data: profiles } = await serviceClient
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds);

    // Create a map for quick lookup
    const profileMap = new Map(
      profiles?.map((p) => [p.id, { displayName: p.display_name, avatarUrl: p.avatar_url }]) || []
    );

    // Build leaderboard with ranks
    const leaderboard: GlobalLeaderboardEntry[] = top100.map((userStat, index) => {
      const profile = profileMap.get(userStat.userId);
      return {
        rank: index + 1,
        userId: userStat.userId,
        displayName: profile?.displayName || 'Anonymous Detective',
        avatarUrl: profile?.avatarUrl || null,
        totalPoints: userStat.totalPoints,
        mysteriesSolved: userStat.mysteriesSolved,
        isCurrentUser: user?.id === userStat.userId,
      };
    });

    // Find current user's entry
    let currentUserEntry: GlobalLeaderboardEntry | null = null;
    const userInLeaderboard = leaderboard.find((e) => e.isCurrentUser);

    if (user && !userInLeaderboard) {
      // User is not in top 100, find their position
      const userIndex = sortedUsers.findIndex((u) => u.userId === user.id);

      if (userIndex !== -1) {
        const userStat = sortedUsers[userIndex];

        // Fetch user's profile
        const { data: userProfile } = await serviceClient
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single();

        currentUserEntry = {
          rank: userIndex + 1,
          userId: user.id,
          displayName: userProfile?.display_name || 'You',
          avatarUrl: userProfile?.avatar_url || null,
          totalPoints: userStat.totalPoints,
          mysteriesSolved: userStat.mysteriesSolved,
          isCurrentUser: true,
        };
      }
    } else if (userInLeaderboard) {
      currentUserEntry = userInLeaderboard;
    }

    return NextResponse.json({
      leaderboard,
      currentUserEntry,
      totalPlayers: sortedUsers.length,
    });
  } catch (error) {
    console.error('Error in global leaderboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
