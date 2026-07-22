-- 018_shadow_lock.sql
-- Minimal shadow-pilot lock-and-reveal:
--   1. fde_missions.mode ∈ demo | shadow_pilot | live_assist (live_assist stays disabled in app)
--   2. employer_decision_locks — immutable record of the employer's ORIGINAL decision,
--      made before any Fydell evidence is revealed.
--   3. report_reveal_events — audited record of who revealed the report, when.
-- In shadow_pilot mode the evidence API returns a locked state until a decision
-- lock exists for the session; the reveal itself is recorded and auditable.

-- 1. Mission mode
alter table public.fde_missions
  add column if not exists mode text not null default 'demo';

do $$ begin
  alter table public.fde_missions
    add constraint fde_missions_mode_check
    check (mode in ('demo', 'shadow_pilot', 'live_assist'));
exception when duplicate_object then null;
end $$;

-- 2. Employer decision locks (immutable, one per session)
create table if not exists public.employer_decision_locks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.relay_sessions(id) on delete cascade,
  mission_id uuid not null references public.fde_missions(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  decision text not null
    check (decision in ('advance', 'hold', 'decline')),
  confidence text not null default 'medium'
    check (confidence in ('low', 'medium', 'high')),
  reasons text not null default '',
  locked_by uuid not null references auth.users(id),
  locked_at timestamptz not null default now(),
  unique (session_id)
);

create index if not exists employer_decision_locks_org_idx
  on public.employer_decision_locks (organization_id, locked_at desc);

-- Immutability: locks may never be updated or deleted (append-only evidence).
create or replace function public.reject_decision_lock_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'employer_decision_locks is append-only: % is not allowed', tg_op;
end;
$$;

drop trigger if exists employer_decision_locks_immutable on public.employer_decision_locks;
create trigger employer_decision_locks_immutable
  before update or delete on public.employer_decision_locks
  for each row execute function public.reject_decision_lock_mutation();

-- 3. Report reveal events (append-only audit)
create table if not exists public.report_reveal_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.relay_sessions(id) on delete cascade,
  mission_id uuid not null references public.fde_missions(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  decision_lock_id uuid not null references public.employer_decision_locks(id),
  revealed_by uuid not null references auth.users(id),
  revealed_at timestamptz not null default now()
);

create index if not exists report_reveal_events_session_idx
  on public.report_reveal_events (session_id, revealed_at desc);

drop trigger if exists report_reveal_events_immutable on public.report_reveal_events;
create trigger report_reveal_events_immutable
  before update or delete on public.report_reveal_events
  for each row execute function public.reject_decision_lock_mutation();

-- RLS: org members may read their own org's locks/reveals; writes go through
-- the service role only (server routes validate membership + sequencing).
alter table public.employer_decision_locks enable row level security;
alter table public.report_reveal_events enable row level security;

drop policy if exists employer_decision_locks_org_read on public.employer_decision_locks;
create policy employer_decision_locks_org_read on public.employer_decision_locks
  for select using (public.is_org_member(organization_id));

drop policy if exists report_reveal_events_org_read on public.report_reveal_events;
create policy report_reveal_events_org_read on public.report_reveal_events
  for select using (public.is_org_member(organization_id));
