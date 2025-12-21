-- Add Microsoft sync fields to emails table

-- Microsoft message ID for deduplication
ALTER TABLE emails
ADD COLUMN IF NOT EXISTS microsoft_id TEXT;

-- Link to view email in Outlook
ALTER TABLE emails
ADD COLUMN IF NOT EXISTS outlook_link TEXT;

-- Timestamp when email was actually sent (from Microsoft)
ALTER TABLE emails
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

-- Index for faster lookups by Microsoft ID
CREATE INDEX IF NOT EXISTS idx_emails_microsoft_id ON emails(microsoft_id);
