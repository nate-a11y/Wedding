-- Create guest book table
CREATE TABLE IF NOT EXISTS guestbook (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  message TEXT NOT NULL CHECK (char_length(message) <= 500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster ordering by date
CREATE INDEX IF NOT EXISTS idx_guestbook_created_at ON guestbook(created_at DESC);

-- Enable Row Level Security
ALTER TABLE guestbook ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read guest book entries
CREATE POLICY "Allow public read access" ON guestbook
  FOR SELECT USING (true);

-- Allow anyone to insert guest book entries
CREATE POLICY "Allow public insert access" ON guestbook
  FOR INSERT WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_guestbook_updated_at
  BEFORE UPDATE ON guestbook
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
