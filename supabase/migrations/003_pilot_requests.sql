-- ============================================================================
-- Pilot lead requests (marketing form → secure server insert only)
-- ============================================================================
-- Security model:
-- 1. RLS enabled with ZERO policies for anon/authenticated → deny by default
-- 2. Explicit revoke of table privileges from anon/authenticated
-- 3. Only service_role (used by Next.js API via SUPABASE_SERVICE_ROLE_KEY)
--    can insert/select. Browser never talks to this table directly.
-- ============================================================================

create table if not exists public.pilot_requests (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  email            text not null,
  company          text not null,
  role_title       text not null,
  candidate_volume text,
  note             text,
  source           text not null default 'request-pilot',
  status           text not null default 'new'
                   check (status in ('new', 'contacted', 'qualified', 'closed')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_pilot_requests_created
  on public.pilot_requests (created_at desc);
create index if not exists idx_pilot_requests_email
  on public.pilot_requests (email);
create index if not exists idx_pilot_requests_status
  on public.pilot_requests (status);

drop trigger if exists trg_pilot_requests_updated on public.pilot_requests;
create trigger trg_pilot_requests_updated
  before update on public.pilot_requests
  for each row execute function public.set_updated_at();

alter table public.pilot_requests enable row level security;

-- Drop any accidental public policies if re-run
drop policy if exists pilot_requests_public_insert on public.pilot_requests;
drop policy if exists pilot_requests_public_select on public.pilot_requests;
drop policy if exists pilot_requests_anon_all on public.pilot_requests;

-- Harden privileges: clients must not read or write this table via PostgREST
revoke all on table public.pilot_requests from anon, authenticated, public;
grant all on table public.pilot_requests to service_role;

comment on table public.pilot_requests is
  'Inbound pilot leads. Writable only via service role from Next.js API. Not publicly readable.';
