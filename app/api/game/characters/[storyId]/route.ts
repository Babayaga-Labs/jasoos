import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;
    const serviceClient = createServiceClient();

    // Fetch characters for this story (public info only - no secrets, guilt, etc.)
    const { data: characters, error } = await serviceClient
      .from('characters')
      .select('id, name, role, is_victim, image_url')
      .eq('story_id', storyId);

    if (error) {
      console.error('Error fetching characters:', error);
      return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 });
    }

    // Transform to safe format (no sensitive data)
    const safeCharacters = (characters || []).map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      isVictim: c.is_victim,
      imageUrl: c.image_url,
    }));

    return NextResponse.json({ characters: safeCharacters });
  } catch (error) {
    console.error('Error in characters GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
