-- Ensure RLS is enabled on rsvps table
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

-- Drop existing insert policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public inserts" ON rsvps;

-- Create INSERT policy for public RSVP submissions
CREATE POLICY "Allow public inserts" ON rsvps
  FOR INSERT
  WITH CHECK (true);

-- Also add SELECT policy for anon users to check for duplicates
DROP POLICY IF EXISTS "Allow public select" ON rsvps;
CREATE POLICY "Allow public select" ON rsvps
  FOR SELECT
  USING (true);

-- Add DELETE policy for admin operations
DROP POLICY IF EXISTS "Allow public delete rsvps" ON rsvps;
CREATE POLICY "Allow public delete rsvps" ON rsvps
  FOR DELETE
  USING (true);
