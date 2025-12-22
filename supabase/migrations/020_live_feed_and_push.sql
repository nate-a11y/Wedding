-- Live Feed, Push Notifications, Song Requests, and Vendor Portal
-- Migration for day-of wedding features

-- =====================================================
-- LIVE UPDATES TABLE
-- Real-time updates posted during the wedding
-- =====================================================
CREATE TABLE IF NOT EXISTS live_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'info', 'celebration', 'action', 'alert'
  posted_by TEXT, -- 'nate', 'blake', 'wedding_party'
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_live_updates_pinned ON live_updates(pinned) WHERE pinned = true;
CREATE INDEX IF NOT EXISTS idx_live_updates_created_at ON live_updates(created_at DESC);

-- Enable RLS
ALTER TABLE live_updates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read on live_updates" ON live_updates
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on live_updates" ON live_updates
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on live_updates" ON live_updates
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on live_updates" ON live_updates
  FOR DELETE USING (true);

-- Update trigger
CREATE TRIGGER update_live_updates_updated_at
  BEFORE UPDATE ON live_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PUSH SUBSCRIPTIONS TABLE
-- Web push notification subscriptions
-- =====================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  guest_email TEXT, -- optional email association
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_email ON push_subscriptions(guest_email) WHERE guest_email IS NOT NULL;

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read on push_subscriptions" ON push_subscriptions
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on push_subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on push_subscriptions" ON push_subscriptions
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on push_subscriptions" ON push_subscriptions
  FOR DELETE USING (true);

-- Update trigger
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SONG REQUESTS TABLE
-- Guest song requests and DJ playlist management
-- =====================================================
CREATE TABLE IF NOT EXISTS song_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  submitted_by_email TEXT,
  submitted_by_name TEXT,
  source TEXT NOT NULL DEFAULT 'request', -- 'request', 'rsvp', 'admin'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'played'
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_song_requests_status ON song_requests(status);
CREATE INDEX IF NOT EXISTS idx_song_requests_votes ON song_requests(votes DESC);
CREATE INDEX IF NOT EXISTS idx_song_requests_email ON song_requests(submitted_by_email) WHERE submitted_by_email IS NOT NULL;

-- Enable RLS
ALTER TABLE song_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read on song_requests" ON song_requests
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on song_requests" ON song_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on song_requests" ON song_requests
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on song_requests" ON song_requests
  FOR DELETE USING (true);

-- Update trigger
CREATE TRIGGER update_song_requests_updated_at
  BEFORE UPDATE ON song_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SONG VOTES TABLE
-- Track who voted for which songs (one vote per email per song)
-- =====================================================
CREATE TABLE IF NOT EXISTS song_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id UUID NOT NULL REFERENCES song_requests(id) ON DELETE CASCADE,
  voter_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(song_id, voter_email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_song_votes_song ON song_votes(song_id);
CREATE INDEX IF NOT EXISTS idx_song_votes_email ON song_votes(voter_email);

-- Enable RLS
ALTER TABLE song_votes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read on song_votes" ON song_votes
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on song_votes" ON song_votes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public delete on song_votes" ON song_votes
  FOR DELETE USING (true);

-- =====================================================
-- VENDOR PORTAL TOKENS TABLE
-- Magic link access tokens for vendors
-- =====================================================
CREATE TABLE IF NOT EXISTS vendor_portal_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  vendor_name TEXT NOT NULL, -- Fallback name if vendor_id is null
  role TEXT NOT NULL DEFAULT 'vendor', -- 'vendor', 'coordinator', 'staff'
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_accessed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vendor_portal_tokens_token ON vendor_portal_tokens(token);
CREATE INDEX IF NOT EXISTS idx_vendor_portal_tokens_expires ON vendor_portal_tokens(expires_at);

-- Enable RLS
ALTER TABLE vendor_portal_tokens ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read on vendor_portal_tokens" ON vendor_portal_tokens
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on vendor_portal_tokens" ON vendor_portal_tokens
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on vendor_portal_tokens" ON vendor_portal_tokens
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on vendor_portal_tokens" ON vendor_portal_tokens
  FOR DELETE USING (true);
