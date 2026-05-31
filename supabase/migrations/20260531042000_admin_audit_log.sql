-- Admin audit log for authenticated admin mutations.
-- API routes write through the server-only service-role Supabase client.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.admin_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  status text NOT NULL CHECK (status IN ('success', 'failure')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_events_created_at_idx
  ON public.admin_audit_events (created_at DESC);

CREATE INDEX IF NOT EXISTS admin_audit_events_entity_idx
  ON public.admin_audit_events (entity, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS admin_audit_events_action_status_idx
  ON public.admin_audit_events (action, status, created_at DESC);

ALTER TABLE public.admin_audit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_audit_events FROM anon;
REVOKE ALL ON TABLE public.admin_audit_events FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_audit_events TO service_role;

DROP POLICY IF EXISTS "Admin audit service role access" ON public.admin_audit_events;
CREATE POLICY "Admin audit service role access"
ON public.admin_audit_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
