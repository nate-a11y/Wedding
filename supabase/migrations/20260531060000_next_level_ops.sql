-- Next-level admin/vendor operations for the wedding hub.
-- Adds scheduled live push delivery metadata, soft-delete rollback controls,
-- guest ops indexes, and vendor portal check-in/checklist state.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.live_updates
  ADD COLUMN IF NOT EXISTS push_requested BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS push_status TEXT,
  ADD COLUMN IF NOT EXISTS push_error TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT,
  ADD COLUMN IF NOT EXISTS deleted_reason TEXT,
  ADD COLUMN IF NOT EXISTS restored_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_live_updates_active_created
  ON public.live_updates (pinned DESC, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_live_updates_due_push
  ON public.live_updates (scheduled_for)
  WHERE scheduled_for IS NOT NULL
    AND push_sent_at IS NULL
    AND deleted_at IS NULL
    AND push_requested = true;

CREATE INDEX IF NOT EXISTS idx_live_updates_deleted
  ON public.live_updates (deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

ALTER TABLE public.vendor_portal_tokens
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS check_in_note TEXT;

CREATE TABLE IF NOT EXISTS public.vendor_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_token_id UUID NOT NULL REFERENCES public.vendor_portal_tokens(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  details TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_checklist_items_token
  ON public.vendor_checklist_items (vendor_token_id, sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_vendor_checklist_items_vendor
  ON public.vendor_checklist_items (vendor_id)
  WHERE vendor_id IS NOT NULL;

ALTER TABLE public.vendor_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on vendor_checklist_items" ON public.vendor_checklist_items;
DROP POLICY IF EXISTS "Allow public insert on vendor_checklist_items" ON public.vendor_checklist_items;
DROP POLICY IF EXISTS "Allow public update on vendor_checklist_items" ON public.vendor_checklist_items;
DROP POLICY IF EXISTS "Allow public delete on vendor_checklist_items" ON public.vendor_checklist_items;

CREATE POLICY "Allow public read on vendor_checklist_items" ON public.vendor_checklist_items
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on vendor_checklist_items" ON public.vendor_checklist_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on vendor_checklist_items" ON public.vendor_checklist_items
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete on vendor_checklist_items" ON public.vendor_checklist_items
  FOR DELETE USING (true);

DROP TRIGGER IF EXISTS update_vendor_checklist_items_updated_at ON public.vendor_checklist_items;
CREATE TRIGGER update_vendor_checklist_items_updated_at
  BEFORE UPDATE ON public.vendor_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN public.live_updates.push_requested IS
  'Whether this update should send web push immediately or when scheduled_for becomes due.';
COMMENT ON COLUMN public.live_updates.deleted_at IS
  'Soft-delete timestamp for admin rollback/recovery controls.';
COMMENT ON TABLE public.vendor_checklist_items IS
  'Per-token vendor portal checklist items vendors can complete from their magic link.';
