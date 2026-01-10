-- Add media support to guestbook table
ALTER TABLE guestbook
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('video', 'audio')),
  ADD COLUMN IF NOT EXISTS media_duration INTEGER CHECK (media_duration > 0 AND media_duration <= 120);

-- Make message field nullable since media can be submitted without text
ALTER TABLE guestbook
  ALTER COLUMN message DROP NOT NULL;

-- Add constraint: must have either message or media
ALTER TABLE guestbook
  ADD CONSTRAINT guestbook_content_check
  CHECK (
    (message IS NOT NULL AND char_length(trim(message)) > 0)
    OR
    (media_url IS NOT NULL)
  );

-- Create storage bucket for guestbook media
INSERT INTO storage.buckets (id, name, public)
VALUES ('guestbook-media', 'guestbook-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public uploads to guestbook media bucket (with size limit handled by app)
CREATE POLICY "Allow public uploads to guestbook media"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'guestbook-media');

-- Allow public read access to guestbook media
CREATE POLICY "Allow public read access to guestbook media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'guestbook-media');

-- Allow authenticated users to delete guestbook media (for admin cleanup)
CREATE POLICY "Allow authenticated delete of guestbook media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'guestbook-media');
