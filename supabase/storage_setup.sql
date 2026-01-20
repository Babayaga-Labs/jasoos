-- Create the story-assets bucket with public read access
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-assets', 'story-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access to all files in the bucket
CREATE POLICY "Public read access for story assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'story-assets');

-- Allow service role to upload files
CREATE POLICY "Service role can upload story assets"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'story-assets');

-- Allow service role to update files
CREATE POLICY "Service role can update story assets"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'story-assets');

-- Allow service role to delete files
CREATE POLICY "Service role can delete story assets"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'story-assets');

-- Allow authenticated users to upload files for their stories
CREATE POLICY "Authenticated users can upload story assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'story-assets');
