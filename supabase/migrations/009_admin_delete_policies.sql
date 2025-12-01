-- Add DELETE policy to guestbook table
CREATE POLICY "Allow public delete guestbook" ON guestbook
  FOR DELETE USING (true);

-- Add UPDATE policy to guestbook table (if needed)
CREATE POLICY "Allow public update guestbook" ON guestbook
  FOR UPDATE USING (true);

-- Ensure emails table has DELETE policy
CREATE POLICY "Allow public delete emails" ON emails
  FOR DELETE USING (true);
