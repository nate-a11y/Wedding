-- Add missing RLS policies for photos table (admin operations)

-- Allow reading ALL photos (for admin dashboard)
CREATE POLICY "Allow public read all photos" ON photos
  FOR SELECT USING (true);

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Allow public read visible photos" ON photos;

-- Allow updating photos (for visibility toggle)
CREATE POLICY "Allow public update photos" ON photos
  FOR UPDATE USING (true);

-- Allow deleting photos
CREATE POLICY "Allow public delete photos" ON photos
  FOR DELETE USING (true);
