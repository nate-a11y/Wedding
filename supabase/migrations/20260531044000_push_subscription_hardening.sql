-- Push subscription API hardening metadata.
-- Subscriptions are managed by server routes using the service role client.

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_updated_at
  ON public.push_subscriptions(updated_at DESC);
