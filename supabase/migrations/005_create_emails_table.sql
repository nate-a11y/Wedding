-- Create emails table to track sent and received emails
CREATE TABLE IF NOT EXISTS emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resend_id VARCHAR(100),
  direction VARCHAR(10) NOT NULL DEFAULT 'outbound', -- 'outbound' or 'inbound'
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT,
  status VARCHAR(20) DEFAULT 'sent', -- sent, delivered, bounced, failed
  email_type VARCHAR(50), -- rsvp_confirmation, etc.
  related_id UUID, -- Reference to RSVP or other record
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_emails_created_at ON emails(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_direction ON emails(direction);
CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status);

-- Enable Row Level Security
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read emails (admin only in practice)
CREATE POLICY "Allow authenticated read emails" ON emails
  FOR SELECT USING (true);

-- Allow inserts from the API
CREATE POLICY "Allow insert emails" ON emails
  FOR INSERT WITH CHECK (true);

-- Allow updates for status changes
CREATE POLICY "Allow update emails" ON emails
  FOR UPDATE USING (true);
