-- Enhance Budget Tracking and Add Wedding Day Timeline
-- Migration 016

-- =====================================================
-- ENHANCE EXPENSES TABLE
-- Add amount_paid for partial payment tracking
-- =====================================================
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0;

-- Update payment_status based on amounts
-- (Run this after adding data to sync status)

-- =====================================================
-- ENHANCE VENDORS TABLE
-- Add amount_paid for deposit/payment tracking
-- =====================================================
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payment_due_date DATE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS final_payment_date DATE;

-- =====================================================
-- WEDDING DAY TIMELINE TABLE
-- Full day-of schedule for staff and planning
-- =====================================================
CREATE TABLE IF NOT EXISTS timeline_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Event details
  title TEXT NOT NULL,
  description TEXT,

  -- Timing
  start_time TIME NOT NULL,
  end_time TIME,
  duration_minutes INTEGER, -- Auto-calculated or manual

  -- Location & logistics
  location TEXT,
  location_notes TEXT, -- "Meet at back entrance", etc.

  -- People
  responsible_person TEXT, -- Who is in charge
  participants TEXT, -- Who needs to be there (comma-separated or notes)
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,

  -- Categorization
  category TEXT CHECK (category IN (
    'preparation', 'ceremony', 'cocktail_hour', 'reception',
    'photos', 'transportation', 'vendor_arrival', 'other'
  )) DEFAULT 'other',

  -- Visual/priority
  is_milestone BOOLEAN DEFAULT FALSE, -- Key moments (ceremony, first dance, etc.)
  color TEXT, -- For visual timeline display

  -- Notes
  notes TEXT,
  staff_notes TEXT, -- Private notes for staff only

  -- Ordering
  sort_order INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_timeline_events_start_time ON timeline_events(start_time);
CREATE INDEX IF NOT EXISTS idx_timeline_events_category ON timeline_events(category);

-- Enable RLS
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read on timeline_events" ON timeline_events
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on timeline_events" ON timeline_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on timeline_events" ON timeline_events
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on timeline_events" ON timeline_events
  FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_timeline_events_updated_at
  BEFORE UPDATE ON timeline_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DEFAULT TIMELINE EVENTS
-- Common wedding day events as a starting template
-- =====================================================
INSERT INTO timeline_events (title, start_time, end_time, category, is_milestone, sort_order) VALUES
  ('Vendor Setup Begins', '10:00', '11:00', 'vendor_arrival', false, 1),
  ('Hair & Makeup - Bride', '11:00', '14:00', 'preparation', false, 2),
  ('Hair & Makeup - Bridesmaids', '11:00', '14:00', 'preparation', false, 3),
  ('Groom & Groomsmen Arrive', '14:00', '14:30', 'preparation', false, 4),
  ('Photographer Arrives', '14:00', NULL, 'vendor_arrival', false, 5),
  ('First Look Photos', '14:30', '15:00', 'photos', true, 6),
  ('Wedding Party Photos', '15:00', '16:00', 'photos', false, 7),
  ('Family Photos', '16:00', '16:30', 'photos', false, 8),
  ('Guests Begin Arriving', '16:30', '17:00', 'ceremony', false, 9),
  ('Wedding Party Lines Up', '16:45', '17:00', 'ceremony', false, 10),
  ('Ceremony Begins', '17:00', '17:30', 'ceremony', true, 11),
  ('Cocktail Hour', '17:30', '18:30', 'cocktail_hour', false, 12),
  ('Couple Photos During Cocktails', '17:30', '18:15', 'photos', false, 13),
  ('Guests Seated for Reception', '18:30', '18:45', 'reception', false, 14),
  ('Grand Entrance', '18:45', '19:00', 'reception', true, 15),
  ('First Dance', '19:00', '19:10', 'reception', true, 16),
  ('Welcome & Blessing', '19:10', '19:20', 'reception', false, 17),
  ('Dinner Service', '19:20', '20:30', 'reception', false, 18),
  ('Toasts & Speeches', '20:00', '20:30', 'reception', false, 19),
  ('Parent Dances', '20:30', '20:45', 'reception', true, 20),
  ('Cake Cutting', '20:45', '21:00', 'reception', true, 21),
  ('Open Dancing', '21:00', '22:30', 'reception', false, 22),
  ('Bouquet & Garter Toss', '22:00', '22:15', 'reception', false, 23),
  ('Last Dance', '22:30', '22:35', 'reception', true, 24),
  ('Grand Exit', '22:35', '22:45', 'reception', true, 25);
