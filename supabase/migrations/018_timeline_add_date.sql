-- Add event_date to timeline_events for multi-day/midnight-spanning schedules
-- Migration 018
-- Oct 30, 2027 - Rehearsal dinner
-- Oct 31, 2027 - Wedding day (ceremony through 11 PM)
-- Nov 1, 2027 - After midnight (hard stop, venue cleared)

-- =====================================================
-- ADD EVENT DATE COLUMN
-- =====================================================
ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS event_date DATE;

-- =====================================================
-- CLEAR AND RE-INSERT WITH CORRECT DATES
-- =====================================================
DELETE FROM timeline_events;

-- =====================================================
-- REHEARSAL - Oct 30, 2027
-- =====================================================
INSERT INTO timeline_events (title, event_date, start_time, end_time, category, is_milestone, notes, sort_order) VALUES
  ('Rehearsal', '2027-10-30', '17:00', '18:00', 'ceremony', false, 'Wedding rehearsal at venue', 100),
  ('Rehearsal dinner', '2027-10-30', '18:30', '21:00', 'reception', false, 'TBD - Confirm location and time', 101);

-- =====================================================
-- WEDDING DAY - Oct 31, 2027
-- =====================================================

-- Key Information
INSERT INTO timeline_events (title, event_date, start_time, end_time, category, is_milestone, notes, sort_order) VALUES
  ('Sunset', '2027-10-31', '18:00', NULL, 'other', true, 'Key timing reference', 200),
  ('Golden Hour', '2027-10-31', '17:00', '18:00', 'photos', true, 'Best natural lighting for photos', 201),
  ('Civil Twilight Ends', '2027-10-31', '18:28', NULL, 'other', false, 'Last usable natural light', 202);

-- Getting Ready
INSERT INTO timeline_events (title, event_date, start_time, end_time, category, is_milestone, notes, staff_notes, sort_order) VALUES
  ('Photographer/Videographer arrives', '2027-10-31', '12:00', NULL, 'vendor_arrival', false, 'Confirm arrival time with photo/video vendor', 'TBD - Confirm with vendor', 210),
  ('Hair & makeup complete, camera-ready', '2027-10-31', '15:00', NULL, 'preparation', false, NULL, 'TBD - Confirm timing', 211);

-- Ceremony
INSERT INTO timeline_events (title, event_date, start_time, end_time, category, is_milestone, sort_order) VALUES
  ('Ceremony begins', '2027-10-31', '16:00', NULL, 'ceremony', true, 220),
  ('Ceremony concludes', '2027-10-31', '16:45', NULL, 'ceremony', true, 221);

-- Cocktail Hour & Photos
INSERT INTO timeline_events (title, event_date, start_time, end_time, category, is_milestone, notes, sort_order) VALUES
  ('Cocktail hour begins', '2027-10-31', '16:45', NULL, 'cocktail_hour', false, 'Guests transition to cocktail area', 230),
  ('Golden hour photos begin', '2027-10-31', '16:45', NULL, 'photos', true, 'Wedding party portraits', 231),
  ('Cocktail hour ends, photos wrap', '2027-10-31', '18:00', NULL, 'cocktail_hour', false, NULL, 232);

-- Reception
INSERT INTO timeline_events (title, event_date, start_time, end_time, category, is_milestone, notes, sort_order) VALUES
  ('Grand entrance', '2027-10-31', '18:00', NULL, 'reception', true, 'Guests seated in reception area', 240),
  ('First dance', '2027-10-31', '18:15', NULL, 'reception', true, NULL, 241),
  ('Welcome & blessing', '2027-10-31', '18:25', NULL, 'reception', false, 'Buffet opens', 242),
  ('Toasts & speeches', '2027-10-31', '19:15', NULL, 'reception', false, NULL, 243),
  ('Cake cutting', '2027-10-31', '19:30', NULL, 'reception', true, NULL, 244),
  ('Parent dances', '2027-10-31', '19:45', NULL, 'reception', true, NULL, 245),
  ('Dance floor opens', '2027-10-31', '20:00', NULL, 'reception', false, NULL, 246);

-- End of Evening - Still Oct 31
INSERT INTO timeline_events (title, event_date, start_time, end_time, category, is_milestone, notes, sort_order) VALUES
  ('Last dance', '2027-10-31', '22:30', NULL, 'reception', true, NULL, 250),
  ('Send-off', '2027-10-31', '22:45', NULL, 'reception', true, 'Photo/video coverage ends', 251),
  ('Photographer done', '2027-10-31', '23:00', NULL, 'vendor_arrival', false, 'Party may continue if desired', 252);

-- =====================================================
-- AFTER MIDNIGHT - Nov 1, 2027
-- =====================================================
INSERT INTO timeline_events (title, event_date, start_time, end_time, category, is_milestone, notes, sort_order) VALUES
  ('Hard stop (if extended)', '2027-11-01', '00:00', NULL, 'reception', true, 'Music stops, guests exit', 300),
  ('Venue End Time', '2027-11-01', '00:00', '01:00', 'other', true, 'Load-out by 1:00 AM', 301),
  ('Venue cleared', '2027-11-01', '01:00', NULL, 'other', false, 'All vendors loaded out', 302);

-- =====================================================
-- VENDOR NOTES REFERENCE
-- =====================================================
INSERT INTO timeline_events (title, event_date, start_time, category, is_milestone, notes, staff_notes, sort_order) VALUES
  ('Vendor Notes Reference', '2027-10-31', '00:00', 'other', false,
   'Photography Package: The Woodward (Total Package) – All day flexible coverage, two shooters, drone footage, 15-20 min wedding film, 2-week expedited delivery',
   'Dinner Service: Buffet style | Photo Coverage: Ends at send-off (~11:00 PM) – faux send-off for photos, party may continue after | Open Dancing: 2.5 hours (8:00 PM – 10:30 PM)',
   999);
