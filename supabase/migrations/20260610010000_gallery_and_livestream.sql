-- Couple-curated gallery photos and livestream go-live controls.
-- Both tables are accessed exclusively through Next.js API routes using the
-- service-role client, so RLS is enabled with no public policies.

create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'couple',
  caption text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  file_name text not null,
  original_file_path text not null,
  display_file_path text not null,
  thumbnail_file_path text not null,
  content_type text,
  file_size_bytes bigint,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_gallery_photos_visible_order
  on public.gallery_photos (is_visible, sort_order, created_at);

alter table public.gallery_photos enable row level security;

create table if not exists public.livestream_settings (
  id uuid primary key default gen_random_uuid(),
  video_id text,
  status_mode text not null default 'auto'
    check (status_mode in ('auto', 'upcoming', 'live', 'ended')),
  go_live_at timestamptz,
  end_at timestamptz,
  live_notified_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.livestream_settings enable row level security;
