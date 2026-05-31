-- Serverless-safe rate limiting for public wedding endpoints.
-- Public callers never access this table directly; API routes call the RPC with the service role key.

create table if not exists public.wedding_rate_limits (
  identifier text primary key,
  request_count integer not null default 0 check (request_count >= 0),
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists wedding_rate_limits_reset_at_idx
  on public.wedding_rate_limits (reset_at);

alter table public.wedding_rate_limits enable row level security;

revoke all on table public.wedding_rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.wedding_rate_limits to service_role;

drop policy if exists "Service role can manage wedding rate limits" on public.wedding_rate_limits;
create policy "Service role can manage wedding rate limits"
  on public.wedding_rate_limits
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.check_wedding_rate_limit(
  p_identifier text,
  p_window_ms integer default 60000,
  p_max_requests integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window interval;
  v_count integer;
  v_reset_at timestamptz;
begin
  if p_identifier is null or length(trim(p_identifier)) = 0 then
    raise exception 'p_identifier is required';
  end if;

  if p_window_ms is null or p_window_ms < 1000 or p_window_ms > 86400000 then
    raise exception 'p_window_ms must be between 1000 and 86400000';
  end if;

  if p_max_requests is null or p_max_requests < 1 or p_max_requests > 10000 then
    raise exception 'p_max_requests must be between 1 and 10000';
  end if;

  v_window := (p_window_ms::text || ' milliseconds')::interval;

  insert into public.wedding_rate_limits as wrl (
    identifier,
    request_count,
    reset_at,
    updated_at
  )
  values (
    p_identifier,
    1,
    v_now + v_window,
    v_now
  )
  on conflict (identifier) do update
    set request_count = case
          when wrl.reset_at <= v_now then 1
          else wrl.request_count + 1
        end,
        reset_at = case
          when wrl.reset_at <= v_now then v_now + v_window
          else wrl.reset_at
        end,
        updated_at = v_now
  returning request_count, reset_at
  into v_count, v_reset_at;

  return jsonb_build_object(
    'allowed', v_count <= p_max_requests,
    'remaining', greatest(p_max_requests - v_count, 0),
    'resetIn', greatest(ceil(extract(epoch from (v_reset_at - v_now)) * 1000)::integer, 0)
  );
end;
$$;

revoke all on function public.check_wedding_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_wedding_rate_limit(text, integer, integer) to service_role;
