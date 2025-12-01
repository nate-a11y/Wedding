-- Storage policies for the wedding bucket
-- Run this in your Supabase SQL editor

-- Allow anyone to upload files to the wedding bucket
CREATE POLICY "Allow public uploads to wedding bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'wedding');

-- Allow anyone to read files from the wedding bucket
CREATE POLICY "Allow public reads from wedding bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'wedding');

-- Allow anyone to update files in the wedding bucket
CREATE POLICY "Allow public updates to wedding bucket"
ON storage.objects FOR UPDATE
USING (bucket_id = 'wedding');

-- Allow anyone to delete files (for admin use via API)
CREATE POLICY "Allow public deletes from wedding bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'wedding');
