-- Microsoft To Do Sync Integration
-- Adds fields for syncing tasks with Microsoft To Do

-- Add Microsoft To Do ID to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS microsoft_todo_id TEXT,
ADD COLUMN IF NOT EXISTS microsoft_list_id TEXT,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Index for faster lookups by Microsoft ID
CREATE INDEX IF NOT EXISTS idx_tasks_microsoft_todo_id ON tasks(microsoft_todo_id);

-- =====================================================
-- MICROSOFT AUTH TOKENS TABLE
-- Store OAuth tokens for Microsoft Graph API
-- =====================================================
CREATE TABLE IF NOT EXISTS microsoft_auth (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Store the selected To Do list ID
  todo_list_id TEXT,
  todo_list_name TEXT,

  -- Webhook subscription
  webhook_subscription_id TEXT,
  webhook_expires_at TIMESTAMP WITH TIME ZONE
);

-- Only allow one row (singleton pattern)
CREATE UNIQUE INDEX IF NOT EXISTS idx_microsoft_auth_singleton ON microsoft_auth ((true));

-- Enable RLS
ALTER TABLE microsoft_auth ENABLE ROW LEVEL SECURITY;

-- Policies (admin only, but using public for simplicity like other tables)
CREATE POLICY "Allow public read on microsoft_auth" ON microsoft_auth
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on microsoft_auth" ON microsoft_auth
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on microsoft_auth" ON microsoft_auth
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on microsoft_auth" ON microsoft_auth
  FOR DELETE USING (true);

-- Update trigger
CREATE TRIGGER update_microsoft_auth_updated_at
  BEFORE UPDATE ON microsoft_auth
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
