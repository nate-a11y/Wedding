-- Correct Timeline Events to Match Actual Wedding Schedule
-- Migration 017
-- Nate & Blake Wedding - October 31, 2027 - Fulton, Missouri

-- Clear the default seeded events
DELETE FROM timeline_events;

-- =====================================================
-- INSERT CORRECT TIMELINE EVENTS
-- =====================================================

-- Key Information (stored as reference/milestone events)
INSERT INTO timeline_events (title, start_time, end_time, category, is_milestone, notes, sort_order) VALUES
  ('Sunset', '18:00', NULL, 'other', true, 'Key timing reference', 1),
  ('Golden Hour', '17:00', '18:00', 'photos', true, 'Best natural lighting for photos', 2),
  ('Civil Twilight Ends', '18:28', NULL, 'other', false, 'Last usable natural light', 3),
  ('Venue End Time', '00:00', '01:00', 'other', true, 'Load-out by 1:00 AM', 4);

-- Getting Ready
INSERT INTO timeline_events (title, start_time, end_time, category, is_milestone, notes, staff_notes, sort_order) VALUES
  ('Photographer/Videographer arrives', '12:00', NULL, 'vendor_arrival', false, 'Confirm arrival time with photo/video vendor', 'TBD - Confirm with vendor', 10),
  ('Hair & makeup complete, camera-ready', '15:00', NULL, 'preparation', false, NULL, 'TBD - Confirm timing', 11);

-- Ceremony
INSERT INTO timeline_events (title, start_time, end_time, category, is_milestone, sort_order) VALUES
  ('Ceremony begins', '16:00', NULL, 'ceremony', true, 20),
  ('Ceremony concludes', '16:45', NULL, 'ceremony', true, 21);

-- Cocktail Hour & Photos
INSERT INTO timeline_events (title, start_time, end_time, category, is_milestone, notes, sort_order) VALUES
  ('Cocktail hour begins', '16:45', NULL, 'cocktail_hour', false, 'Guests transition to cocktail area', 30),
  ('Golden hour photos begin', '16:45', NULL, 'photos', true, 'Wedding party portraits', 31),
  ('Cocktail hour ends, photos wrap', '18:00', NULL, 'cocktail_hour', false, NULL, 32);

-- Reception
INSERT INTO timeline_events (title, start_time, end_time, category, is_milestone, notes, sort_order) VALUES
  ('Grand entrance', '18:00', NULL, 'reception', true, 'Guests seated in reception area', 40),
  ('First dance', '18:15', NULL, 'reception', true, NULL, 41),
  ('Welcome & blessing', '18:25', NULL, 'reception', false, 'Buffet opens', 42),
  ('Toasts & speeches', '19:15', NULL, 'reception', false, NULL, 43),
  ('Cake cutting', '19:30', NULL, 'reception', true, NULL, 44),
  ('Parent dances', '19:45', NULL, 'reception', true, NULL, 45),
  ('Dance floor opens', '20:00', NULL, 'reception', false, NULL, 46);

-- End of Evening
INSERT INTO timeline_events (title, start_time, end_time, category, is_milestone, notes, sort_order) VALUES
  ('Last dance', '22:30', NULL, 'reception', true, NULL, 50),
  ('Send-off', '22:45', NULL, 'reception', true, 'Photo/video coverage ends', 51),
  ('Photographer done', '23:00', NULL, 'vendor_arrival', false, 'Party may continue if desired', 52),
  ('Hard stop (if extended)', '00:00', NULL, 'reception', true, 'Music stops, guests exit', 53),
  ('Venue cleared', '01:00', NULL, 'other', false, 'All vendors loaded out', 54);

-- =====================================================
-- VENDOR NOTES (stored as a special timeline entry)
-- =====================================================
INSERT INTO timeline_events (title, start_time, category, is_milestone, notes, staff_notes, sort_order) VALUES
  ('Vendor Notes Reference', '00:00', 'other', false,
   'Photography Package: The Woodward (Total Package) – All day flexible coverage, two shooters, drone footage, 15-20 min wedding film, 2-week expedited delivery',
   'Dinner Service: Buffet style | Photo Coverage: Ends at send-off (~11:00 PM) – faux send-off for photos, party may continue after | Open Dancing: 2.5 hours (8:00 PM – 10:30 PM)',
   99);
