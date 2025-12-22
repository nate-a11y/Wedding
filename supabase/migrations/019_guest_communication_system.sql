-- Guest Communication & Event Management System
-- Includes: guest_events, guest_tags, email_campaigns, email_sends, reminder_settings

-- =====================================================
-- GUEST EVENTS TABLE
-- Track which guests are invited to specific events
-- =====================================================
CREATE TABLE IF NOT EXISTS guest_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  event_slug TEXT NOT NULL, -- 'rehearsal_dinner', 'sunday_brunch', etc.
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_by TEXT, -- 'nate' or 'blake' for tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email, event_slug)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_guest_events_email ON guest_events(email);
CREATE INDEX IF NOT EXISTS idx_guest_events_event_slug ON guest_events(event_slug);

-- Enable RLS
ALTER TABLE guest_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read on guest_events" ON guest_events
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on guest_events" ON guest_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on guest_events" ON guest_events
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on guest_events" ON guest_events
  FOR DELETE USING (true);

-- =====================================================
-- GUEST TAGS TABLE
-- For guest segmentation and communication targeting
-- =====================================================
CREATE TABLE IF NOT EXISTS guest_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  tag TEXT NOT NULL, -- 'wedding_party', 'family_nate', 'family_blake', 'out_of_town', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email, tag)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_guest_tags_email ON guest_tags(email);
CREATE INDEX IF NOT EXISTS idx_guest_tags_tag ON guest_tags(tag);

-- Enable RLS
ALTER TABLE guest_tags ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read on guest_tags" ON guest_tags
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on guest_tags" ON guest_tags
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on guest_tags" ON guest_tags
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on guest_tags" ON guest_tags
  FOR DELETE USING (true);

-- =====================================================
-- EMAIL CAMPAIGNS TABLE
-- Bulk email campaigns management
-- =====================================================
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, -- 'Save the Date', 'RSVP Reminder 30 Day', etc.
  type TEXT NOT NULL, -- 'save_the_date', 'rsvp_reminder', 'announcement', 'custom'
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT, -- plain text fallback
  segment JSONB NOT NULL DEFAULT '{"all": true}', -- targeting rules
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'cancelled'
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by TEXT, -- 'nate' or 'blake'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_type ON email_campaigns(type);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled ON email_campaigns(scheduled_for) WHERE status = 'scheduled';

-- Enable RLS
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read on email_campaigns" ON email_campaigns
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on email_campaigns" ON email_campaigns
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on email_campaigns" ON email_campaigns
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on email_campaigns" ON email_campaigns
  FOR DELETE USING (true);

-- Update trigger
CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- EMAIL SENDS TABLE
-- Individual email send tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  guest_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'opened', 'clicked'
  outlook_message_id TEXT, -- Microsoft Graph message ID for tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign ON email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_email ON email_sends(email);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(status);
CREATE INDEX IF NOT EXISTS idx_email_sends_outlook_id ON email_sends(outlook_message_id) WHERE outlook_message_id IS NOT NULL;

-- Enable RLS
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read on email_sends" ON email_sends
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on email_sends" ON email_sends
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on email_sends" ON email_sends
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on email_sends" ON email_sends
  FOR DELETE USING (true);

-- =====================================================
-- REMINDER SETTINGS TABLE
-- Configuration for automated RSVP reminders
-- =====================================================
CREATE TABLE IF NOT EXISTS reminder_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  reminder_days JSONB DEFAULT '[30, 14, 7]', -- Days before deadline to send reminders
  min_interval_days INTEGER DEFAULT 7, -- Minimum days between reminders per guest
  last_manual_send TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings row
INSERT INTO reminder_settings (enabled, reminder_days, min_interval_days)
VALUES (false, '[30, 14, 7]', 7)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read on reminder_settings" ON reminder_settings
  FOR SELECT USING (true);

CREATE POLICY "Allow public update on reminder_settings" ON reminder_settings
  FOR UPDATE USING (true);

-- Update trigger
CREATE TRIGGER update_reminder_settings_updated_at
  BEFORE UPDATE ON reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- GUEST REMINDER LOG TABLE
-- Track when reminders were sent to each guest
-- =====================================================
CREATE TABLE IF NOT EXISTS guest_reminder_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  reminder_type TEXT NOT NULL, -- 'auto_30', 'auto_14', 'auto_7', 'manual'
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guest_reminder_log_email ON guest_reminder_log(email);
CREATE INDEX IF NOT EXISTS idx_guest_reminder_log_sent_at ON guest_reminder_log(sent_at);

-- Enable RLS
ALTER TABLE guest_reminder_log ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read on guest_reminder_log" ON guest_reminder_log
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on guest_reminder_log" ON guest_reminder_log
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- RSVP EVENT RESPONSES TABLE
-- Track which events each guest is attending
-- =====================================================
CREATE TABLE IF NOT EXISTS rsvp_event_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rsvp_id UUID REFERENCES rsvps(id) ON DELETE CASCADE,
  event_slug TEXT NOT NULL, -- 'rehearsal_dinner', 'ceremony', 'cocktail', 'reception', 'sendoff', 'sunday_brunch'
  attending BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(rsvp_id, event_slug)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rsvp_event_responses_rsvp ON rsvp_event_responses(rsvp_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_event_responses_event ON rsvp_event_responses(event_slug);

-- Enable RLS
ALTER TABLE rsvp_event_responses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read on rsvp_event_responses" ON rsvp_event_responses
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on rsvp_event_responses" ON rsvp_event_responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on rsvp_event_responses" ON rsvp_event_responses
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on rsvp_event_responses" ON rsvp_event_responses
  FOR DELETE USING (true);
