-- 019_applied_roles_simulations.sql
--
-- Applied Technical Roles: versioned simulation templates, invitations,
-- sessions, events, messages, AI interactions, deliverables, submissions,
-- analysis, credentials and employer decisions.
--
-- Conventions follow 011-018: text + check enums, token_hash (never raw
-- tokens), service-role writes with member/candidate SELECT RLS, jsonb
-- payloads, idempotent DDL, immutability triggers for evidence.

-- ---------------------------------------------------------------------------
-- Helpers (defined in earlier migrations; recreated defensively)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Templates + immutable versions
-- ---------------------------------------------------------------------------
create table if not exists public.sim_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  role_key text not null check (role_key in (
    'data_analyst','bi_analyst','solutions_engineer',
    'implementation_consultant','technical_support_engineer','business_systems_analyst'
  )),
  title text not null,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  current_version_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sim_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.sim_templates(id) on delete cascade,
  version integer not null,
  content jsonb not null default '{}'::jsonb,
  change_notes text,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

alter table public.sim_templates
  drop constraint if exists sim_templates_current_version_fk;
alter table public.sim_templates
  add constraint sim_templates_current_version_fk
  foreign key (current_version_id) references public.sim_template_versions(id)
  on delete set null;

-- Published versions are immutable.
create or replace function public.sim_template_version_guard()
returns trigger language plpgsql as $$
begin
  if old.published_at is not null then
    raise exception 'published simulation template versions are immutable';
  end if;
  return new;
end $$;

drop trigger if exists sim_template_versions_immutable on public.sim_template_versions;
create trigger sim_template_versions_immutable
  before update or delete on public.sim_template_versions
  for each row execute function public.sim_template_version_guard();

-- ---------------------------------------------------------------------------
-- Invitations (pinned to the template version active at creation)
-- ---------------------------------------------------------------------------
create table if not exists public.sim_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid not null references public.sim_templates(id) on delete restrict,
  template_version_id uuid not null references public.sim_template_versions(id) on delete restrict,
  candidate_email text not null,
  candidate_name text,
  token_hash text not null unique,
  status text not null default 'sent' check (status in (
    'sent','opened','accepted','started','completed','expired','revoked'
  )),
  email_delivery text not null default 'not_configured' check (email_delivery in (
    'queued','sent','failed','not_configured'
  )),
  invited_by uuid references auth.users(id) on delete set null,
  resend_count integer not null default 0,
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sim_invitations_org on public.sim_invitations(organization_id, created_at desc);
create index if not exists idx_sim_invitations_email on public.sim_invitations(candidate_email);

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------
create table if not exists public.sim_sessions (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null unique references public.sim_invitations(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid not null references public.sim_templates(id) on delete restrict,
  template_version_id uuid not null references public.sim_template_versions(id) on delete restrict,
  candidate_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'accepted' check (status in (
    'accepted','active','submitted','analyzed','report_ready'
  )),
  duration_minutes integer not null default 60,
  started_at timestamptz,
  ends_at timestamptz,
  submitted_at timestamptz,
  curveball_presented_at timestamptz,
  curveball_acknowledged_at timestamptz,
  external_ai_disclosed boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sim_sessions_org on public.sim_sessions(organization_id, created_at desc);
create index if not exists idx_sim_sessions_candidate on public.sim_sessions(candidate_user_id);

-- Session working state: one row per session, CAS via revision.
create table if not exists public.sim_session_state (
  session_id uuid primary key references public.sim_sessions(id) on delete cascade,
  revision integer not null default 0,
  current_task_id text,
  open_resource_id text,
  notes text not null default '',
  deliverable jsonb not null default '{}'::jsonb,
  workspace jsonb not null default '{}'::jsonb,
  completed_task_ids jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Append-only event stream with idempotency.
create table if not exists public.sim_session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sim_sessions(id) on delete cascade,
  seq bigint generated always as identity,
  event_type text not null,
  actor text not null default 'candidate' check (actor in ('candidate','stakeholder','assistant','system')),
  resource_id text,
  task_id text,
  payload jsonb not null default '{}'::jsonb,
  client_event_id text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_sim_session_events_idem
  on public.sim_session_events(session_id, client_event_id)
  where client_event_id is not null;
create index if not exists idx_sim_session_events_session
  on public.sim_session_events(session_id, seq);

-- Stakeholder + assistant conversations.
create table if not exists public.sim_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sim_sessions(id) on delete cascade,
  thread text not null check (thread in ('stakeholder','assistant')),
  stakeholder_id text,
  sender text not null check (sender in ('candidate','stakeholder','assistant')),
  body text not null,
  client_msg_id text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_sim_messages_idem
  on public.sim_messages(session_id, client_msg_id)
  where client_msg_id is not null;
create index if not exists idx_sim_messages_session
  on public.sim_messages(session_id, created_at);

-- Observable in-product AI interactions.
create table if not exists public.sim_ai_interactions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sim_sessions(id) on delete cascade,
  prompt text not null,
  response text not null default '',
  context_resource_ids jsonb not null default '[]'::jsonb,
  inserted_into text check (inserted_into in ('notes','deliverable')),
  edited_after_insert boolean,
  created_at timestamptz not null default now()
);

create index if not exists idx_sim_ai_interactions_session
  on public.sim_ai_interactions(session_id, created_at);

-- ---------------------------------------------------------------------------
-- Submissions (immutable snapshot)
-- ---------------------------------------------------------------------------
create table if not exists public.sim_submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sim_sessions(id) on delete cascade,
  snapshot jsonb not null,
  external_ai_disclosed boolean not null default false,
  submitted_at timestamptz not null default now()
);

create or replace function public.sim_submission_guard()
returns trigger language plpgsql as $$
begin
  raise exception 'submission snapshots are immutable';
end $$;

drop trigger if exists sim_submissions_immutable on public.sim_submissions;
create trigger sim_submissions_immutable
  before update or delete on public.sim_submissions
  for each row execute function public.sim_submission_guard();

-- ---------------------------------------------------------------------------
-- Analysis
-- ---------------------------------------------------------------------------
create table if not exists public.sim_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sim_sessions(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','running','complete','failed')),
  engine_version text not null default 'v1',
  overall numeric(5,4),
  recommendation text check (recommendation in ('advance','review','further_evidence_required')),
  capped_by_critical text,
  ai_use_summary jsonb not null default '{}'::jsonb,
  interview_questions jsonb not null default '[]'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_sim_analysis_runs_session
  on public.sim_analysis_runs(session_id, created_at desc);

create table if not exists public.sim_competency_results (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null references public.sim_analysis_runs(id) on delete cascade,
  competency_key text not null,
  label text not null,
  band text not null check (band in ('strong','established','developing','limited','insufficient')),
  adjusted_score numeric(5,4) not null,
  confidence numeric(5,4) not null,
  coverage numeric(5,4) not null,
  consistency numeric(5,4) not null,
  evidence_quality numeric(5,4) not null,
  critical boolean not null default false,
  summary text not null default '',
  created_at timestamptz not null default now(),
  unique (analysis_run_id, competency_key)
);

create table if not exists public.sim_evidence_items (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null references public.sim_analysis_runs(id) on delete cascade,
  competency_key text not null,
  indicator text not null,
  source text not null check (source in ('deterministic','authored_rule','ai_rubric')),
  quality numeric(5,4) not null,
  weight numeric(8,4) not null,
  relevance numeric(5,4) not null,
  independence numeric(5,4) not null,
  event_ids jsonb not null default '[]'::jsonb,
  excerpts jsonb not null default '[]'::jsonb,
  counterevidence text,
  explanation text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sim_evidence_items_run
  on public.sim_evidence_items(analysis_run_id, competency_key);

-- ---------------------------------------------------------------------------
-- Credentials + employer decisions
-- ---------------------------------------------------------------------------
create table if not exists public.sim_credentials (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sim_sessions(id) on delete cascade,
  candidate_user_id uuid not null references auth.users(id) on delete cascade,
  credential_number text not null unique,
  status text not null default 'active' check (status in ('active','revoked')),
  visibility text not null default 'private' check (visibility in ('private','link')),
  share_token_hash text unique,
  display_name text,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.sim_employer_decisions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sim_sessions(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  decision text not null check (decision in (
    'advance','hold','do_not_advance','needs_further_evidence'
  )),
  notes text not null default '',
  decided_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_sim_employer_decisions_session
  on public.sim_employer_decisions(session_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['sim_templates','sim_invitations','sim_sessions','sim_credentials'] loop
    execute format('drop trigger if exists set_updated_at_%s on public.%s', t, t);
    execute format(
      'create trigger set_updated_at_%s before update on public.%s for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS: service-role writes; scoped SELECT for candidates and org members.
-- ---------------------------------------------------------------------------
alter table public.sim_templates enable row level security;
alter table public.sim_template_versions enable row level security;
alter table public.sim_invitations enable row level security;
alter table public.sim_sessions enable row level security;
alter table public.sim_session_state enable row level security;
alter table public.sim_session_events enable row level security;
alter table public.sim_messages enable row level security;
alter table public.sim_ai_interactions enable row level security;
alter table public.sim_submissions enable row level security;
alter table public.sim_analysis_runs enable row level security;
alter table public.sim_competency_results enable row level security;
alter table public.sim_evidence_items enable row level security;
alter table public.sim_credentials enable row level security;
alter table public.sim_employer_decisions enable row level security;

-- Published templates and their published versions are readable by any
-- authenticated user (they power the catalog). Content includes answer keys,
-- so raw version content is NOT selectable by candidates: catalog surfaces
-- are served by the app server which strips evaluator-only fields.
drop policy if exists sim_templates_select on public.sim_templates;
create policy sim_templates_select on public.sim_templates
  for select to authenticated using (status = 'published');

-- Candidate: own sessions and their children.
drop policy if exists sim_sessions_candidate_select on public.sim_sessions;
create policy sim_sessions_candidate_select on public.sim_sessions
  for select to authenticated using (candidate_user_id = auth.uid());

drop policy if exists sim_sessions_org_select on public.sim_sessions;
create policy sim_sessions_org_select on public.sim_sessions
  for select to authenticated using (public.is_organization_member(organization_id));

create or replace function public.sim_session_owned(p_session_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.sim_sessions s
    where s.id = p_session_id
      and (s.candidate_user_id = auth.uid() or public.is_organization_member(s.organization_id))
  );
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'sim_session_state','sim_session_events','sim_messages',
    'sim_ai_interactions','sim_submissions','sim_analysis_runs'
  ] loop
    execute format('drop policy if exists %s_select on public.%s', t, t);
    execute format(
      'create policy %s_select on public.%s for select to authenticated using (public.sim_session_owned(session_id))',
      t, t
    );
  end loop;
end $$;

drop policy if exists sim_competency_results_select on public.sim_competency_results;
create policy sim_competency_results_select on public.sim_competency_results
  for select to authenticated using (
    exists (
      select 1 from public.sim_analysis_runs r
      where r.id = analysis_run_id and public.sim_session_owned(r.session_id)
    )
  );

drop policy if exists sim_evidence_items_select on public.sim_evidence_items;
create policy sim_evidence_items_select on public.sim_evidence_items
  for select to authenticated using (
    exists (
      select 1 from public.sim_analysis_runs r
      where r.id = analysis_run_id and public.sim_session_owned(r.session_id)
    )
  );

drop policy if exists sim_invitations_org_select on public.sim_invitations;
create policy sim_invitations_org_select on public.sim_invitations
  for select to authenticated using (public.is_organization_member(organization_id));

drop policy if exists sim_credentials_owner_select on public.sim_credentials;
create policy sim_credentials_owner_select on public.sim_credentials
  for select to authenticated using (candidate_user_id = auth.uid());

drop policy if exists sim_employer_decisions_org_select on public.sim_employer_decisions;
create policy sim_employer_decisions_org_select on public.sim_employer_decisions
  for select to authenticated using (public.is_organization_member(organization_id));

-- All writes happen through the app server (service role). No insert/update/
-- delete policies are defined for anon/authenticated.
