-- Add DELETE policy for guest_addresses table
-- This allows the admin to delete address entries

CREATE POLICY "Allow public deletes" ON guest_addresses
  FOR DELETE
  USING (true);
