-- Guest addresses table for collecting mailing addresses before RSVP
-- This is a public form that can be shared without authentication

CREATE TABLE IF NOT EXISTS guest_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Guest info
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,

  -- Address fields
  street_address TEXT NOT NULL,
  street_address_2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'United States',

  -- Link to RSVP (populated when guest RSVPs with matching email)
  linked_rsvp_id UUID REFERENCES rsvps(id) ON DELETE SET NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_guest_addresses_email ON guest_addresses(email);
CREATE INDEX IF NOT EXISTS idx_guest_addresses_linked_rsvp ON guest_addresses(linked_rsvp_id);

-- Enable Row Level Security
ALTER TABLE guest_addresses ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public inserts (public address form)
CREATE POLICY "Allow public inserts" ON guest_addresses
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow public updates (for updating existing address)
CREATE POLICY "Allow public updates" ON guest_addresses
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Allow reads for admin (via anon key with RLS bypass in API)
CREATE POLICY "Allow public reads" ON guest_addresses
  FOR SELECT
  USING (true);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_guest_addresses_updated_at
  BEFORE UPDATE ON guest_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
