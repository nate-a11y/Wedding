-- Harden guestbook/photo media storage so browser clients use validated APIs only.
-- Server routes write with service_role, public clients only read finalized media.

-- Guestbook entries keep the storage object path so failed inserts and future
-- moderation tooling can safely clean up media without trusting public URLs.
ALTER TABLE public.guestbook
  ADD COLUMN IF NOT EXISTS media_path TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'guestbook_media_path_safe_check'
      AND conrelid = 'public.guestbook'::regclass
  ) THEN
    ALTER TABLE public.guestbook
      ADD CONSTRAINT guestbook_media_path_safe_check
      CHECK (
        media_path IS NULL
        OR media_path ~ '^(video|audio)/[0-9]{4}-[0-9]{2}-[0-9]{2}/[0-9a-fA-F-]{36}\.(webm|mp4|mov|mp3|m4a|aac|wav)$'
      );
  END IF;
END $$;

-- Photo variants produced by /api/photos. Existing file_path remains the display
-- image for backward compatibility with existing admin/gallery code.
ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS original_file_path TEXT,
  ADD COLUMN IF NOT EXISTS display_file_path TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_file_path TEXT,
  ADD COLUMN IF NOT EXISTS content_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS original_file_size_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS width INTEGER,
  ADD COLUMN IF NOT EXISTS height INTEGER;

CREATE INDEX IF NOT EXISTS idx_photos_thumbnail_file_path ON public.photos(thumbnail_file_path) WHERE thumbnail_file_path IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photos_display_file_path ON public.photos(display_file_path) WHERE display_file_path IS NOT NULL;

-- Buckets are public-read because gallery/guestbook media are displayed without
-- signed URL ceremony, but writes/deletes should only happen through server APIs.
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('wedding', 'wedding', true),
  ('guestbook-media', 'guestbook-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Remove legacy direct-browser storage write policies.
DROP POLICY IF EXISTS "Allow public uploads to wedding bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from wedding bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to wedding bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from wedding bucket" ON storage.objects;
DROP POLICY IF EXISTS "Wedding photos public reads" ON storage.objects;
DROP POLICY IF EXISTS "Wedding photos service role management" ON storage.objects;

DROP POLICY IF EXISTS "Allow public uploads to guestbook media" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to guestbook media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete of guestbook media" ON storage.objects;
DROP POLICY IF EXISTS "Wedding guestbook media public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Wedding guestbook media public reads" ON storage.objects;
DROP POLICY IF EXISTS "Wedding guestbook media service role management" ON storage.objects;
DROP POLICY IF EXISTS "Guestbook media public reads" ON storage.objects;
DROP POLICY IF EXISTS "Guestbook media service role management" ON storage.objects;

CREATE POLICY "Wedding photos public reads"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'wedding');

CREATE POLICY "Wedding photos service role management"
ON storage.objects
TO service_role
USING (bucket_id = 'wedding')
WITH CHECK (bucket_id = 'wedding');

CREATE POLICY "Guestbook media public reads"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'guestbook-media');

CREATE POLICY "Guestbook media service role management"
ON storage.objects
TO service_role
USING (bucket_id = 'guestbook-media')
WITH CHECK (bucket_id = 'guestbook-media');
