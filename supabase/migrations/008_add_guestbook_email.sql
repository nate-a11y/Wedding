-- Add optional email column to guestbook for thank you emails
ALTER TABLE guestbook ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_guestbook_email ON guestbook(email) WHERE email IS NOT NULL;
