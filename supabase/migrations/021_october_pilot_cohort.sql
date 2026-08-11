-- 021_october_pilot_cohort.sql
--
-- October 2026 pilot: cohorts, versioned consent, preflight, event schema
-- version, oral defense, receipt shares, decision influence, report status.
-- Additive only. Does not rewrite prior migrations or destroy data.

-- ---------------------------------------------------------------------------
-- Pilot cohorts (one org binds invites to one published template version)
-- ---------------------------------------------------------------------------
create table if not exists public.pilot_cohorts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft','open','paused','closed')),
  template_id uuid not null references public.sim_templates(id) on delete restrict,
  template_version_id uuid not null references public.sim_template_versions(id) on delete restrict,
  invitation_expires_days integer not null default 14 check (invitation_expires_days between 1 and 60),
  opens_at timestamptz,
  closes_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pilot_cohorts_org
  on public.pilot_cohorts(organization_id, created_at desc);

create unique index if not exists idx_pilot_cohorts_one_open_per_org_template
  on public.pilot_cohorts(organization_id, template_id)
  where status in ('open', 'paused');

alter table public.sim_invitations
  add column if not exists cohort_id uuid references public.pilot_cohorts(id) on delete set null;

create index if not exists idx_sim_invitations_cohort
  on public.sim_invitations(cohort_id)
  where cohort_id is not null;

-- ---------------------------------------------------------------------------
-- Versioned consent + preflight (applied path)
-- ---------------------------------------------------------------------------
create table if not exists public.candidate_consents (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.sim_invitations(id) on delete cascade,
  session_id uuid references public.sim_sessions(id) on delete set null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  candidate_user_id uuid not null references auth.users(id) on delete cascade,
  policy_version text not null,
  capture_policy_version text not null default 'capture_v1',
  ai_policy_version text not null default 'ai_v1',
  accepted_at timestamptz not null default now(),
  actor text not null default 'candidate',
  unique (invitation_id, policy_version)
);

create index if not exists idx_candidate_consents_session
  on public.candidate_consents(session_id)
  where session_id is not null;

create table if not exists public.preflight_checks (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.sim_invitations(id) on delete cascade,
  session_id uuid references public.sim_sessions(id) on delete set null,
  candidate_user_id uuid not null references auth.users(id) on delete cascade,
  result jsonb not null default '{}'::jsonb,
  desktop_suitable boolean not null default false,
  network_ok boolean not null default false,
  browser_ok boolean not null default false,
  limitations text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_preflight_checks_invitation
  on public.preflight_checks(invitation_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Session / event extensions
-- ---------------------------------------------------------------------------
alter table public.sim_session_events
  add column if not exists schema_version integer not null default 1;

alter table public.sim_sessions
  add column if not exists consent_id uuid references public.candidate_consents(id) on delete set null;

alter table public.sim_sessions
  add column if not exists report_status text not null default 'not_available'
  check (report_status in (
    'not_available','pending','human_review_required','ready','failed','superseded'
  ));

alter table public.sim_sessions
  add column if not exists review_status text not null default 'unreviewed'
  check (review_status in ('unreviewed','in_review','follow_up_needed','reviewed'));

alter table public.sim_analysis_runs
  add column if not exists report_version integer not null default 1;

alter table public.sim_analysis_runs
  add column if not exists is_current boolean not null default true;

alter table public.sim_analysis_runs
  add column if not exists supersedes_run_id uuid references public.sim_analysis_runs(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Oral defense
-- ---------------------------------------------------------------------------
create table if not exists public.oral_defense_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sim_sessions(id) on delete cascade,
  analysis_run_id uuid references public.sim_analysis_runs(id) on delete set null,
  generator_version text not null default 'defense_v1',
  status text not null default 'pending' check (status in (
    'pending','in_progress','completed','unavailable'
  )),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (session_id)
);

create table if not exists public.oral_defense_questions (
  id uuid primary key default gen_random_uuid(),
  defense_set_id uuid not null references public.oral_defense_sets(id) on delete cascade,
  sort_order integer not null default 0,
  question_text text not null,
  purpose text not null default '',
  source_evidence_ids jsonb not null default '[]'::jsonb,
  expected_understanding text not null default '',
  generator_version text not null default 'defense_v1',
  created_at timestamptz not null default now()
);

create table if not exists public.oral_defense_responses (
  id uuid primary key default gen_random_uuid(),
  defense_set_id uuid not null references public.oral_defense_sets(id) on delete cascade,
  question_id uuid not null references public.oral_defense_questions(id) on delete cascade,
  response_text text not null default '',
  collection_method text not null check (collection_method in (
    'candidate_typed','facilitator_notes'
  )),
  collected_by uuid references auth.users(id) on delete set null,
  attestation text,
  created_at timestamptz not null default now(),
  unique (question_id)
);

-- ---------------------------------------------------------------------------
-- Receipt shares (field-scoped, expiring, revocable)
-- ---------------------------------------------------------------------------
create table if not exists public.sim_receipt_shares (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null references public.sim_credentials(id) on delete cascade,
  session_id uuid not null references public.sim_sessions(id) on delete cascade,
  candidate_user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  audience_label text not null default '',
  allowed_fields jsonb not null default '[]'::jsonb,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_sim_receipt_shares_credential
  on public.sim_receipt_shares(credential_id, created_at desc);

create table if not exists public.sim_receipt_share_access (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.sim_receipt_shares(id) on delete cascade,
  accessed_at timestamptz not null default now(),
  result text not null check (result in ('allowed','expired','revoked','denied')),
  viewer_label text
);

-- ---------------------------------------------------------------------------
-- Employer decision influence
-- ---------------------------------------------------------------------------
alter table public.sim_employer_decisions
  add column if not exists evidence_influence text
  check (evidence_influence is null or evidence_influence in (
    'changed','confirmed','no_effect'
  ));

alter table public.sim_employer_decisions
  add column if not exists reviewer_notes text not null default '';

-- ---------------------------------------------------------------------------
-- Audit events for sensitive pilot actions
-- ---------------------------------------------------------------------------
create table if not exists public.pilot_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_pilot_audit_events_org
  on public.pilot_audit_events(organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
drop trigger if exists set_updated_at_pilot_cohorts on public.pilot_cohorts;
create trigger set_updated_at_pilot_cohorts
  before update on public.pilot_cohorts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.pilot_cohorts enable row level security;
alter table public.candidate_consents enable row level security;
alter table public.preflight_checks enable row level security;
alter table public.oral_defense_sets enable row level security;
alter table public.oral_defense_questions enable row level security;
alter table public.oral_defense_responses enable row level security;
alter table public.sim_receipt_shares enable row level security;
alter table public.sim_receipt_share_access enable row level security;
alter table public.pilot_audit_events enable row level security;

drop policy if exists pilot_cohorts_org_select on public.pilot_cohorts;
create policy pilot_cohorts_org_select on public.pilot_cohorts
  for select to authenticated using (public.is_organization_member(organization_id));

drop policy if exists candidate_consents_select on public.candidate_consents;
create policy candidate_consents_select on public.candidate_consents
  for select to authenticated using (
    candidate_user_id = auth.uid()
    or public.is_organization_member(organization_id)
  );

drop policy if exists preflight_checks_select on public.preflight_checks;
create policy preflight_checks_select on public.preflight_checks
  for select to authenticated using (candidate_user_id = auth.uid());

drop policy if exists oral_defense_sets_select on public.oral_defense_sets;
create policy oral_defense_sets_select on public.oral_defense_sets
  for select to authenticated using (public.sim_session_owned(session_id));

drop policy if exists oral_defense_questions_select on public.oral_defense_questions;
create policy oral_defense_questions_select on public.oral_defense_questions
  for select to authenticated using (
    exists (
      select 1 from public.oral_defense_sets s
      where s.id = defense_set_id and public.sim_session_owned(s.session_id)
    )
  );

drop policy if exists oral_defense_responses_select on public.oral_defense_responses;
create policy oral_defense_responses_select on public.oral_defense_responses
  for select to authenticated using (
    exists (
      select 1 from public.oral_defense_sets s
      where s.id = defense_set_id and public.sim_session_owned(s.session_id)
    )
  );

drop policy if exists sim_receipt_shares_owner_select on public.sim_receipt_shares;
create policy sim_receipt_shares_owner_select on public.sim_receipt_shares
  for select to authenticated using (candidate_user_id = auth.uid());

-- Access log and audit: org members / owners via service role writes only for inserts.
drop policy if exists pilot_audit_events_org_select on public.pilot_audit_events;
create policy pilot_audit_events_org_select on public.pilot_audit_events
  for select to authenticated using (
    organization_id is not null and public.is_organization_member(organization_id)
  );
