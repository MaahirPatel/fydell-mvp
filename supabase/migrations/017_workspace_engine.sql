-- 017_workspace_engine.sql
-- Event-sourced Project Relay workspace: versions, outbox, requirements, snapshots.
-- Candidates never read evaluator-only columns (enforced in app + RLS).

-- Workspace head (monotone version per session)
create table if not exists public.workspace_heads (
  session_id uuid primary key references public.relay_sessions(id) on delete cascade,
  head_version bigint not null default 0,
  head_hash text not null default 'genesis',
  company_name text not null default 'Northbeam Logistics',
  submitted boolean not null default false,
  submission_head_hash text,
  updated_at timestamptz not null default now()
);

-- Versioned artifacts (CAS on version)
create table if not exists public.artifact_versions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.relay_sessions(id) on delete cascade,
  artifact_path text not null,
  version int not null,
  content text not null,
  content_hash text not null,
  kind text not null default 'other',
  actor_type text not null default 'candidate',
  chain_hash text not null,
  created_at timestamptz not null default now(),
  unique (session_id, artifact_path, version)
);

create index if not exists artifact_versions_session_path_idx
  on public.artifact_versions (session_id, artifact_path, version desc);

-- Dataset cell patches (atomic batches referenced by command_id)
create table if not exists public.dataset_patches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.relay_sessions(id) on delete cascade,
  command_id text not null,
  artifact_path text not null,
  base_version int not null,
  patch jsonb not null,
  created_at timestamptz not null default now(),
  unique (session_id, command_id)
);

-- Runtime / test / preview runs tied to workspace version
create table if not exists public.runtime_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.relay_sessions(id) on delete cascade,
  run_kind text not null check (run_kind in ('command', 'tests', 'preview')),
  command text not null,
  workspace_version bigint not null,
  exit_code int not null,
  ok boolean not null,
  stdout text not null default '',
  stderr text not null default '',
  started_at timestamptz not null default now(),
  completed_at timestamptz not null default now()
);

create index if not exists runtime_runs_session_idx
  on public.runtime_runs (session_id, completed_at desc);

-- Requirement state (server-computed)
create table if not exists public.requirement_states (
  session_id uuid not null references public.relay_sessions(id) on delete cascade,
  requirement_id text not null,
  description text not null,
  blocking boolean not null default false,
  status text not null,
  last_verified_at_workspace_version bigint,
  updated_at timestamptz not null default now(),
  primary key (session_id, requirement_id)
);

-- AI proposals
create table if not exists public.ai_proposals (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.relay_sessions(id) on delete cascade,
  proposal_id text not null,
  artifact_path text not null,
  base_version int not null,
  patch_after text not null,
  explanation text not null default '',
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'rejected', 'stale')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (session_id, proposal_id)
);

-- Scenario / curveball events (server-side trigger logic — not candidate-readable detail)
create table if not exists public.scenario_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.relay_sessions(id) on delete cascade,
  event_key text not null,
  utility_score numeric,
  triggered_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  candidate_visible_text text not null,
  evaluator_only jsonb not null default '{}'::jsonb,
  unique (session_id, event_key)
);

-- Command outbox ack (server mirror of client idempotency)
create table if not exists public.command_outbox (
  session_id uuid not null references public.relay_sessions(id) on delete cascade,
  command_id text not null,
  command_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'acked'
    check (status in ('pending', 'acked', 'failed')),
  created_at timestamptz not null default now(),
  acked_at timestamptz,
  primary key (session_id, command_id)
);

-- Immutable submission snapshots
create table if not exists public.submission_snapshots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.relay_sessions(id) on delete cascade,
  submission_version int not null default 1,
  workspace_head_hash text not null,
  artifact_version_map jsonb not null,
  message_sequence_end bigint not null default 0,
  test_run_ids uuid[] not null default '{}',
  preview_run_id uuid,
  requirement_state jsonb not null,
  handoff_version int not null default 0,
  evidence_sequence_end bigint not null default 0,
  submitted_at timestamptz not null default now(),
  unique (session_id, submission_version)
);

-- Session recovery buffers
create table if not exists public.session_recovery (
  session_id uuid primary key references public.relay_sessions(id) on delete cascade,
  local_buffers jsonb not null default '{}'::jsonb,
  downtime_seconds int not null default 0,
  last_failure_at timestamptz,
  updated_at timestamptz not null default now()
);

-- RLS: candidates read/write only their own session rows
alter table public.workspace_heads enable row level security;
alter table public.artifact_versions enable row level security;
alter table public.dataset_patches enable row level security;
alter table public.runtime_runs enable row level security;
alter table public.requirement_states enable row level security;
alter table public.ai_proposals enable row level security;
alter table public.scenario_events enable row level security;
alter table public.command_outbox enable row level security;
alter table public.submission_snapshots enable row level security;
alter table public.session_recovery enable row level security;

-- Helper: session owned by auth.uid()
create or replace function public.relay_session_is_owner(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.relay_sessions s
    where s.id = p_session_id and s.fde_user_id = auth.uid()
  );
$$;

create policy workspace_heads_owner on public.workspace_heads
  for all using (public.relay_session_is_owner(session_id))
  with check (public.relay_session_is_owner(session_id));

create policy artifact_versions_owner on public.artifact_versions
  for all using (public.relay_session_is_owner(session_id))
  with check (public.relay_session_is_owner(session_id));

create policy dataset_patches_owner on public.dataset_patches
  for all using (public.relay_session_is_owner(session_id))
  with check (public.relay_session_is_owner(session_id));

create policy runtime_runs_owner on public.runtime_runs
  for all using (public.relay_session_is_owner(session_id))
  with check (public.relay_session_is_owner(session_id));

create policy requirement_states_owner on public.requirement_states
  for all using (public.relay_session_is_owner(session_id))
  with check (public.relay_session_is_owner(session_id));

create policy ai_proposals_owner on public.ai_proposals
  for all using (public.relay_session_is_owner(session_id))
  with check (public.relay_session_is_owner(session_id));

-- scenario_events: candidates may SELECT only candidate_visible_text columns via view;
-- block direct select of evaluator_only by denying select on base table for non-service.
create policy scenario_events_owner_select on public.scenario_events
  for select using (public.relay_session_is_owner(session_id));

create policy scenario_events_no_client_write on public.scenario_events
  for insert with check (false);

create policy command_outbox_owner on public.command_outbox
  for all using (public.relay_session_is_owner(session_id))
  with check (public.relay_session_is_owner(session_id));

create policy submission_snapshots_owner_select on public.submission_snapshots
  for select using (public.relay_session_is_owner(session_id));

create policy session_recovery_owner on public.session_recovery
  for all using (public.relay_session_is_owner(session_id))
  with check (public.relay_session_is_owner(session_id));

-- Candidate-safe view (hides evaluator_only)
create or replace view public.scenario_events_candidate as
  select id, session_id, event_key, triggered_at, acknowledged_at, candidate_visible_text
  from public.scenario_events;

grant select on public.scenario_events_candidate to authenticated;
