-- Tokenized RSVP edit links.
-- Raw tokens are only shown once by the app; Supabase stores SHA-256 hashes.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.rsvp_edit_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rsvp_id UUID REFERENCES public.rsvps(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  token_hint TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT '2027-11-15 23:59:59+00',
  last_used_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_by TEXT NOT NULL DEFAULT 'rsvp_api',
  CONSTRAINT rsvp_edit_tokens_email_lowercase CHECK (email = lower(email)),
  CONSTRAINT rsvp_edit_tokens_email_not_blank CHECK (length(trim(email)) > 0),
  CONSTRAINT rsvp_edit_tokens_hash_not_blank CHECK (length(trim(token_hash)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_rsvp_edit_tokens_rsvp_id
  ON public.rsvp_edit_tokens(rsvp_id)
  WHERE rsvp_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rsvp_edit_tokens_email
  ON public.rsvp_edit_tokens(email);

CREATE INDEX IF NOT EXISTS idx_rsvp_edit_tokens_active_hash
  ON public.rsvp_edit_tokens(token_hash)
  WHERE revoked_at IS NULL;

ALTER TABLE public.rsvp_edit_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.rsvp_edit_tokens FROM anon;
REVOKE ALL ON TABLE public.rsvp_edit_tokens FROM authenticated;
GRANT ALL ON TABLE public.rsvp_edit_tokens TO service_role;

DROP POLICY IF EXISTS "wedding_service_role_all" ON public.rsvp_edit_tokens;
CREATE POLICY "wedding_service_role_all"
ON public.rsvp_edit_tokens
TO service_role
USING (true)
WITH CHECK (true);
