-- Seating chart tables for managing table assignments

-- Tables (physical tables at the venue)
CREATE TABLE IF NOT EXISTS seating_tables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  name TEXT NOT NULL,              -- e.g., "Table 1", "Head Table", "Sweetheart Table"
  capacity INTEGER NOT NULL DEFAULT 8,
  table_type TEXT DEFAULT 'round', -- 'round', 'rectangular', 'sweetheart'
  position_x INTEGER DEFAULT 0,    -- For visual layout (optional)
  position_y INTEGER DEFAULT 0,
  notes TEXT
);

-- Seating assignments (which guest sits at which table)
CREATE TABLE IF NOT EXISTS seating_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  table_id UUID NOT NULL REFERENCES seating_tables(id) ON DELETE CASCADE,

  -- Can be linked to RSVP or just a name (for flexibility)
  rsvp_id UUID REFERENCES rsvps(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,        -- Denormalized for display
  is_additional_guest BOOLEAN DEFAULT FALSE,  -- If this is a +1/additional guest
  seat_number INTEGER,             -- Optional specific seat at table

  UNIQUE(table_id, guest_name)     -- Prevent duplicate assignments
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seating_tables_name ON seating_tables(name);
CREATE INDEX IF NOT EXISTS idx_seating_assignments_table ON seating_assignments(table_id);
CREATE INDEX IF NOT EXISTS idx_seating_assignments_rsvp ON seating_assignments(rsvp_id);

-- Enable Row Level Security
ALTER TABLE seating_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE seating_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for seating_tables
CREATE POLICY "Allow public read for seating_tables" ON seating_tables
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert for seating_tables" ON seating_tables
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update for seating_tables" ON seating_tables
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete for seating_tables" ON seating_tables
  FOR DELETE USING (true);

-- Policies for seating_assignments
CREATE POLICY "Allow public read for seating_assignments" ON seating_assignments
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert for seating_assignments" ON seating_assignments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update for seating_assignments" ON seating_assignments
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete for seating_assignments" ON seating_assignments
  FOR DELETE USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_seating_tables_updated_at
  BEFORE UPDATE ON seating_tables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seating_assignments_updated_at
  BEFORE UPDATE ON seating_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
