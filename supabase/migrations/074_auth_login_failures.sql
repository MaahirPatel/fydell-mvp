-- Shared sign-in lockout counter.
--
-- The in-process lockout in src/lib/security/route-limits.ts counts failures
-- per server instance, so a fleet multiplies the attempt budget. This table
-- holds one row per hashed identity (IP or email, HMAC'd by the app; raw
-- values are never stored) so every instance sees the same count.
-- Only the service role can touch it.

create table if not exists public.auth_login_failures (
  key_hash text primary key check (char_length(key_hash) between 16 and 128),
  failures integer not null default 0 check (failures >= 0),
  reset_at timestamptz not null
);

create index if not exists auth_login_failures_reset_at_idx
  on public.auth_login_failures (reset_at);

alter table public.auth_login_failures enable row level security;

revoke all on table public.auth_login_failures from public, anon, authenticated;
grant select, insert, update, delete on table public.auth_login_failures to service_role;

-- Atomically count one failure for each key. A key whose window has passed
-- starts a new window. Rows that expired more than a day ago are swept.
create or replace function public.record_auth_login_failures(p_keys text[], p_window_seconds integer)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid window';
  end if;
  if p_keys is null or cardinality(p_keys) = 0 or cardinality(p_keys) > 8 then
    raise exception 'invalid keys';
  end if;

  insert into public.auth_login_failures as f (key_hash, failures, reset_at)
  select k, 1, now() + make_interval(secs => p_window_seconds)
  from unnest(p_keys) as k
  on conflict (key_hash) do update
    set failures = case when f.reset_at <= now() then 1 else f.failures + 1 end,
        reset_at = case when f.reset_at <= now() then excluded.reset_at else f.reset_at end;

  delete from public.auth_login_failures where reset_at < now() - interval '1 day';
end;
$$;

revoke execute on function public.record_auth_login_failures(text[], integer) from public, anon, authenticated;
grant execute on function public.record_auth_login_failures(text[], integer) to service_role;
