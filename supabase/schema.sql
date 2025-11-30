-- RSVPs table for wedding guest responses
CREATE TABLE IF NOT EXISTS rsvps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Guest info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  attending BOOLEAN NOT NULL,

  -- Meal preferences
  meal_choice TEXT CHECK (meal_choice IN ('chicken', 'beef', 'fish', 'vegetarian', 'vegan')),
  dietary_restrictions TEXT,

  -- Plus one info
  plus_one BOOLEAN DEFAULT FALSE,
  plus_one_name TEXT,
  plus_one_meal_choice TEXT CHECK (plus_one_meal_choice IN ('chicken', 'beef', 'fish', 'vegetarian', 'vegan')),

  -- Optional extras
  song_request TEXT,
  message TEXT
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rsvps_email ON rsvps(email);
CREATE INDEX IF NOT EXISTS idx_rsvps_attending ON rsvps(attending);

-- Enable Row Level Security
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

-- Policy: Allow inserts from anyone (public RSVP form)
CREATE POLICY "Allow public inserts" ON rsvps
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only authenticated users can read (for admin dashboard later)
CREATE POLICY "Allow authenticated reads" ON rsvps
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_rsvps_updated_at
  BEFORE UPDATE ON rsvps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
