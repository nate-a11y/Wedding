-- Add additional_guests column to store array of guest objects as JSON
-- This replaces the single plus_one columns to allow multiple guests (including children)

ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS additional_guests JSONB DEFAULT '[]'::jsonb;

-- Migration note: The old plus_one columns are kept for backwards compatibility
-- but new RSVPs will use additional_guests instead
-- Structure: [{ "name": "Guest Name", "mealChoice": "chicken", "isChild": false }, ...]
