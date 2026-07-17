-- 011_fde_core_loop.sql
-- Minimal schema for vertical loop: mission → invite → session → events →
-- artifacts → evidence → work receipt → permission → decision → audit.
-- Outcomes, billing, appeals, partners deferred until core loop works.

-- Extend profiles for account types
alter table public.profiles
  add column if not exists account_type text
    check (account_type in ('employer', 'fde', 'partner', 'operator'));

alter table public.profiles
  add column if not exists display_name text;

alter table public.profiles
  add column if not exists email_verified_at timestamptz;

-- FDE profile (self-declared vs verified kept separate in app layer)
create table if not exists public.fde_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  headline text,
  location text,
  timezone text,
  availability text,
  work_preferences jsonb not null default '{}'::jsonb,
  deployment_contexts text[] not null default '{}',
  technical_tools text[] not null default '{}',
  portfolio_url text,
  github_url text,
  linkedin_url text,
  discoverability text not null default 'invited_only'
    check (discoverability in ('private', 'invited_only', 'network')),
  profile_completeness int not null default 0,
  identity_verification_state text not null default 'unverified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Missions
create table if not exists public.fde_missions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  slug text,
  objective text not null default '',
  customer_context text not null default '',
  expected_outcome text not null default '',
  systems_context text not null default '',
  technical_environment text not null default '',
  constraints text not null default '',
  security_considerations text not null default '',
  success_measures text not null default '',
  location text,
  travel_expectation text,
  work_arrangement text,
  compensation_minimum numeric,
  compensation_maximum numeric,
  currency text default 'USD',
  hiring_timeline text,
  simulation_template_key text not null default 'project-relay',
  invitation_limit int not null default 5,
  evidence_policy text not null default 'candidate_controlled',
  status text not null default 'draft'
    check (status in ('draft', 'under_review', 'active', 'paused', 'closed', 'archived')),
  published_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fde_missions_org_status_idx
  on public.fde_missions (organization_id, status);

-- Invitations (store hash only)
create table if not exists public.fde_invitations (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.fde_missions(id) on delete cascade,
  fde_user_id uuid references auth.users(id),
  invited_email text not null,
  invited_by_user_id uuid references auth.users(id),
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  declined_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'expired', 'revoked')),
  created_at timestamptz not null default now()
);

create index if not exists fde_invitations_mission_status_idx
  on public.fde_invitations (mission_id, status);
create index if not exists fde_invitations_email_idx
  on public.fde_invitations (lower(invited_email));

-- Simulation sessions (Project Relay)
create table if not exists public.relay_sessions (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.fde_missions(id) on delete cascade,
  invitation_id uuid references public.fde_invitations(id),
  fde_user_id uuid not null references auth.users(id),
  variant_key text not null default 'project-relay-known-good',
  status text not null default 'invited'
    check (status in (
      'invited', 'accepted', 'preflight', 'ready', 'active', 'recovering',
      'submitted', 'processing', 'receipt_ready', 'technical_failure', 'withdrawn'
    )),
  started_at timestamptz,
  ends_at timestamptz,
  submitted_at timestamptz,
  last_heartbeat_at timestamptz,
  technical_interruption_seconds int not null default 0,
  workspace_state jsonb not null default '{}'::jsonb,
  submission_snapshot jsonb,
  curveball_key text,
  failure_code text,
  failure_detail text,
  billable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists relay_sessions_fde_status_idx
  on public.relay_sessions (fde_user_id, status);
create index if not exists relay_sessions_mission_idx
  on public.relay_sessions (mission_id);

-- Execution events
create table if not exists public.relay_execution_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.relay_sessions(id) on delete cascade,
  sequence_number bigint not null,
  actor text not null
    check (actor in ('candidate', 'system', 'customer_simulator', 'ai_assistant', 'operator')),
  event_type text not null,
  source_surface text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (session_id, sequence_number)
);

create index if not exists relay_events_session_idx
  on public.relay_execution_events (session_id, sequence_number);

-- Artifacts
create table if not exists public.fde_artifacts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id),
  organization_id uuid references public.organizations(id),
  session_id uuid references public.relay_sessions(id) on delete set null,
  type text not null,
  storage_key text,
  content jsonb,
  checksum text,
  visibility text not null default 'private',
  created_at timestamptz not null default now()
);

-- Evidence findings
create table if not exists public.fde_evidence_findings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.relay_sessions(id) on delete cascade,
  dimension text not null,
  observation text not null,
  interpretation text,
  confidence text not null default 'medium',
  limitation text,
  event_ids uuid[] not null default '{}',
  artifact_ids uuid[] not null default '{}',
  review_state text not null default 'generated'
    check (review_state in ('generated', 'human_reviewed', 'corrected', 'disputed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Work receipts
create table if not exists public.work_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  fde_user_id uuid not null references auth.users(id),
  session_id uuid not null references public.relay_sessions(id) on delete cascade,
  mission_id uuid not null references public.fde_missions(id),
  version int not null default 1,
  status text not null default 'draft'
    check (status in ('draft', 'candidate_review', 'issued', 'corrected', 'expired', 'revoked')),
  context_summary text,
  evidence_summary text,
  limitations text,
  issued_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists work_receipts_fde_idx on public.work_receipts (fde_user_id, status);

-- Receipt permissions
create table if not exists public.receipt_permissions (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.work_receipts(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id),
  recipient_user_id uuid references auth.users(id),
  recipient_organization_id uuid references public.organizations(id),
  share_token_hash text unique,
  purpose text not null default 'hiring_review',
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  access_count int not null default 0
);

create index if not exists receipt_permissions_receipt_idx
  on public.receipt_permissions (receipt_id);

-- Employer decisions
create table if not exists public.fde_employer_decisions (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.fde_missions(id) on delete cascade,
  fde_user_id uuid not null references auth.users(id),
  session_id uuid references public.relay_sessions(id),
  organization_id uuid not null references public.organizations(id),
  decision text not null
    check (decision in ('advance', 'hold', 'decline', 'hired', 'withdrawn')),
  structured_reason text,
  evidence_gaps text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Audit (append-only style)
create table if not exists public.fde_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists fde_audit_logs_created_idx
  on public.fde_audit_logs (created_at desc);

-- RLS helpers
create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

alter table public.fde_profiles enable row level security;
alter table public.fde_missions enable row level security;
alter table public.fde_invitations enable row level security;
alter table public.relay_sessions enable row level security;
alter table public.relay_execution_events enable row level security;
alter table public.fde_artifacts enable row level security;
alter table public.fde_evidence_findings enable row level security;
alter table public.work_receipts enable row level security;
alter table public.receipt_permissions enable row level security;
alter table public.fde_employer_decisions enable row level security;
alter table public.fde_audit_logs enable row level security;

-- Profiles: owner read/write
drop policy if exists fde_profiles_own on public.fde_profiles;
create policy fde_profiles_own on public.fde_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Missions: org members
drop policy if exists fde_missions_org on public.fde_missions;
create policy fde_missions_org on public.fde_missions
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- Invitations: org members or invited FDE
drop policy if exists fde_invitations_access on public.fde_invitations;
create policy fde_invitations_access on public.fde_invitations
  for select using (
    fde_user_id = auth.uid()
    or exists (
      select 1 from public.fde_missions m
      where m.id = mission_id and public.is_org_member(m.organization_id)
    )
  );

-- Sessions: FDE owner or mission org
drop policy if exists relay_sessions_access on public.relay_sessions;
create policy relay_sessions_access on public.relay_sessions
  for select using (
    fde_user_id = auth.uid()
    or exists (
      select 1 from public.fde_missions m
      where m.id = mission_id and public.is_org_member(m.organization_id)
    )
  );

-- Receipts: owner FDE
drop policy if exists work_receipts_owner on public.work_receipts;
create policy work_receipts_owner on public.work_receipts
  for all using (fde_user_id = auth.uid())
  with check (fde_user_id = auth.uid());

-- Service role bypasses RLS; app writes use admin client for invitation create etc.

comment on table public.fde_missions is 'FDE deployment missions — core loop';
comment on table public.relay_sessions is 'Project Relay simulation sessions';
comment on table public.work_receipts is 'Candidate-controlled portable execution evidence';
