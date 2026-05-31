-- Vendor portal token hardening and OAuth/security follow-ups.
-- Stores only high-entropy token hashes at rest while keeping existing links
-- usable by backfilling token_hash from the legacy plaintext token value.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.vendor_portal_tokens
  ADD COLUMN IF NOT EXISTS token_hash TEXT,
  ADD COLUMN IF NOT EXISTS token_preview TEXT,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS access_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS revoked_by TEXT,
  ADD COLUMN IF NOT EXISTS revoked_reason TEXT,
  ADD COLUMN IF NOT EXISTS legacy_plaintext_migrated_at TIMESTAMP WITH TIME ZONE;

-- Backfill hashes for legacy rows that still store raw magic-link tokens.
UPDATE public.vendor_portal_tokens
SET
  token_hash = encode(digest(token, 'sha256'), 'hex'),
  token_preview = CASE
    WHEN length(token) > 12 THEN left(token, 6) || '…' || right(token, 4)
    ELSE 'legacy'
  END,
  last_used_at = COALESCE(last_used_at, last_accessed)
WHERE token_hash IS NULL
  AND token IS NOT NULL
  AND token !~ '^sha256:[0-9a-f]{64}$';

-- Remove plaintext token material from the legacy token column. The column is
-- retained for old code/schema compatibility, but now contains only a hash label.
UPDATE public.vendor_portal_tokens
SET
  token = 'sha256:' || token_hash,
  legacy_plaintext_migrated_at = COALESCE(legacy_plaintext_migrated_at, NOW())
WHERE token_hash IS NOT NULL
  AND token IS DISTINCT FROM 'sha256:' || token_hash;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_portal_tokens_token_hash
  ON public.vendor_portal_tokens(token_hash)
  WHERE token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vendor_portal_tokens_active
  ON public.vendor_portal_tokens(expires_at, revoked_at)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vendor_portal_tokens_last_used
  ON public.vendor_portal_tokens(last_used_at DESC);

COMMENT ON COLUMN public.vendor_portal_tokens.token IS
  'Compatibility field only. New rows store sha256:<token_hash>; raw vendor portal tokens must never be stored.';
COMMENT ON COLUMN public.vendor_portal_tokens.token_hash IS
  'SHA-256 hash of the high-entropy vendor portal magic-link token.';
COMMENT ON COLUMN public.vendor_portal_tokens.token_preview IS
  'Non-secret display hint for a token. Raw token is only shown once at creation.';
COMMENT ON COLUMN public.vendor_portal_tokens.revoked_at IS
  'Soft revocation timestamp. Revoked tokens are denied without deleting audit metadata.';
