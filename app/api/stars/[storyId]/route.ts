import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    // Get current user (optional)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get star count for this story
    const { count: starCount, error: countError } = await serviceClient
      .from('mystery_stars')
      .select('*', { count: 'exact', head: true })
      .eq('story_id', storyId);

    if (countError) {
      console.error('Error fetching star count:', countError);
      return NextResponse.json({ error: 'Failed to fetch star count' }, { status: 500 });
    }

    // Check if current user has starred this story
    let isStarred = false;
    if (user) {
      const { data: userStar } = await serviceClient
        .from('mystery_stars')
        .select('id')
        .eq('story_id', storyId)
        .eq('user_id', user.id)
        .single();

      isStarred = !!userStar;
    }

    return NextResponse.json({
      starCount: starCount || 0,
      isStarred,
    });
  } catch (error) {
    console.error('Error in stars GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Insert star
    const { error } = await supabase.from('mystery_stars').insert({
      user_id: user.id,
      story_id: storyId,
    });

    if (error) {
      // If already starred, just return success
      if (error.code === '23505') {
        return NextResponse.json({ success: true, alreadyStarred: true });
      }
      console.error('Error starring mystery:', error);
      return NextResponse.json({ error: 'Failed to star mystery' }, { status: 500 });
    }

    // Revalidate home page to update star counts on cards
    revalidatePath('/');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in stars POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete star
    const { error } = await supabase
      .from('mystery_stars')
      .delete()
      .eq('user_id', user.id)
      .eq('story_id', storyId);

    if (error) {
      console.error('Error unstarring mystery:', error);
      return NextResponse.json({ error: 'Failed to unstar mystery' }, { status: 500 });
    }

    // Revalidate home page to update star counts on cards
    revalidatePath('/');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in stars DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
