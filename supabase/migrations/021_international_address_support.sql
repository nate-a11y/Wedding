-- Migration: International Address Support
-- This migration updates the guest_addresses table to support international addresses
-- by making the state field nullable (some countries don't use states/provinces)

-- Make state nullable for international addresses
ALTER TABLE guest_addresses
  ALTER COLUMN state DROP NOT NULL;

-- Add comment explaining the field can hold state, province, region, etc.
COMMENT ON COLUMN guest_addresses.state IS 'State, province, region, or equivalent administrative division. Nullable for international addresses.';

-- Add comment explaining country field accepts any country name
COMMENT ON COLUMN guest_addresses.country IS 'Country name. Defaults to United States but accepts any country.';
