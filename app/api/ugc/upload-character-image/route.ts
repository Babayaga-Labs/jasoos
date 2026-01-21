import { NextRequest } from 'next/server';
import { uploadImageBuffer } from '@/lib/supabase/storage';

export const maxDuration = 30;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Upload a character image
 * POST /api/ugc/upload-character-image
 *
 * Request body: FormData with:
 *   - file: Image file (jpg, png, webp, < 5MB)
 *   - characterId: string
 *   - storyId: string (optional, for organizing uploads)
 *
 * Response: { imageUrl: string } or { error: string }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const characterId = formData.get('characterId') as string | null;
    const storyId = formData.get('storyId') as string | null;

    // Validate file exists
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate character ID
    if (!characterId?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Character ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Please upload a JPG, PNG, or WebP image.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'File too large. Maximum size is 5MB.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine storage path (temp-uploads for unpublished, or story-specific)
    const storagePath = storyId
      ? `${storyId}/characters/${characterId}.png`
      : `temp-uploads/${characterId}.png`;

    // Upload to Supabase
    const imageUrl = await uploadImageBuffer(buffer, storagePath, file.type);

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Failed to upload image' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ imageUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error uploading character image:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to upload image'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
