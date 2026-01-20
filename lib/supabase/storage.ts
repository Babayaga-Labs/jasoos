import { createServiceClient } from './server';

const BUCKET_NAME = 'story-assets';

/**
 * Upload an image to Supabase Storage from a URL
 */
export async function uploadImageFromUrl(
  url: string,
  storagePath: string
): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch image from URL: ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabase = createServiceClient();

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (error) {
      console.error('Failed to upload image to Supabase:', error);
      return null;
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
}

/**
 * Upload a buffer directly to Supabase Storage
 */
export async function uploadImageBuffer(
  buffer: Buffer,
  storagePath: string,
  contentType: string = 'image/png'
): Promise<string | null> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('Failed to upload image buffer to Supabase:', error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image buffer:', error);
    return null;
  }
}

/**
 * Delete all assets for a story
 */
export async function deleteStoryAssets(storyId: string): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    // List all files in the story folder
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(storyId);

    if (listError) {
      console.error('Failed to list story assets:', listError);
      return false;
    }

    if (!files || files.length === 0) {
      return true;
    }

    // Delete all files
    const filePaths = files.map(file => `${storyId}/${file.name}`);
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(filePaths);

    if (deleteError) {
      console.error('Failed to delete story assets:', deleteError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting story assets:', error);
    return false;
  }
}

/**
 * Get the public URL for a story asset
 */
export function getAssetUrl(storagePath: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`;
}
