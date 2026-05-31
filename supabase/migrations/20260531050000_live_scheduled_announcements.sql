-- Scheduled live announcements for the wedding-day command center.
-- Public feed only shows unscheduled updates or updates whose schedule time has passed.

alter table public.live_updates
  add column if not exists scheduled_for timestamptz;

create index if not exists idx_live_updates_scheduled_for
  on public.live_updates (scheduled_for)
  where scheduled_for is not null;
