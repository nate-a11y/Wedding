-- Create photos table for tracking uploaded images
CREATE TABLE IF NOT EXISTS photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_name VARCHAR(100) NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  caption TEXT,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster ordering by date
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);

-- Create index for filtering by visibility
CREATE INDEX IF NOT EXISTS idx_photos_visible ON photos(is_visible) WHERE is_visible = true;

-- Enable Row Level Security
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read visible photos
CREATE POLICY "Allow public read visible photos" ON photos
  FOR SELECT USING (is_visible = true);

-- Allow anyone to insert photos
CREATE POLICY "Allow public insert photos" ON photos
  FOR INSERT WITH CHECK (true);

-- Storage bucket policy (run this in Supabase dashboard if not already set up)
-- Make sure the 'public.wedding' bucket exists and has public read access
