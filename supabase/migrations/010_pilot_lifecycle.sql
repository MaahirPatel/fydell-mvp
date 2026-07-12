-- ============================================================================
-- 010 Pilot lifecycle (additive)
-- Employer onboarding, hiring roles, consent, outcomes, reserved-name helpers.
-- No destructive drops. Safe to rehearse on staging first.
-- ============================================================================

-- Organizations: optional owner link safety
alter table public.organizations
  add column if not exists owner_id uuid references auth.users(id);
alter table public.organizations
  add column if not exists owner_email text;

-- Profiles: account typing + onboarding state
alter table public.profiles
  add column if not exists account_type text
    check (account_type in ('platform','employer','candidate','unresolved'));
alter table public.profiles
  add column if not exists onboarding_state text;
alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;
alter table public.profiles
  add column if not exists last_seen_at timestamptz;

-- Employer onboarding (resume-safe)
create table if not exists public.employer_onboarding (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id),
  current_step integer not null default 1,
  company_name text,
  company_website text,
  job_title text,
  company_size text,
  industry text,
  timezone text,
  primary_hiring_need text,
  role_title text,
  role_seniority text,
  role_location text,
  employment_type text,
  first_90_day_outcomes jsonb not null default '[]'::jsonb,
  referral_source text,
  domain_mismatch boolean not null default false,
  approval_status text not null default 'pending'
    check (approval_status in ('pending','approved','rejected','not_required')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_employer_onboarding_updated on public.employer_onboarding;
create trigger trg_employer_onboarding_updated
  before update on public.employer_onboarding
  for each row execute function public.set_updated_at();

-- Hiring roles (org-scoped)
create table if not exists public.hiring_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  department text not null default 'Finance',
  seniority text,
  location text,
  employment_type text,
  status text not null default 'draft'
    check (status in ('draft','configuring','active','paused','filled','archived')),
  description text,
  first_90_day_outcomes jsonb not null default '[]'::jsonb,
  competency_configuration jsonb not null default '{}'::jsonb,
  simulation_template_key text not null default 'project-meridian',
  candidate_limit integer,
  invites_enabled boolean not null default false,
  created_by uuid references auth.users(id),
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hiring_roles_org_status
  on public.hiring_roles (organization_id, status);

drop trigger if exists trg_hiring_roles_updated on public.hiring_roles;
create trigger trg_hiring_roles_updated
  before update on public.hiring_roles
  for each row execute function public.set_updated_at();

-- Simulation templates (versioned Meridian)
create table if not exists public.simulation_templates (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  version integer not null default 1,
  role_family text not null default 'FP&A',
  duration_minutes integer not null default 25,
  status text not null default 'published'
    check (status in ('draft','published','archived')),
  configuration jsonb not null default '{}'::jsonb,
  published_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.simulation_templates (key, name, description, version, duration_minutes, status)
values (
  'project-meridian',
  'Project Meridian — FP&A Forecast Review',
  'Evidence-backed FP&A work trial: brief, data room, forecast, assumptions, manager update, recommendation.',
  1,
  25,
  'published'
)
on conflict (key) do nothing;

-- Pilot candidates (org-scoped; distinct from auth.users until linked)
create table if not exists public.pilot_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  hiring_role_id uuid references public.hiring_roles(id) on delete set null,
  auth_user_id uuid references auth.users(id),
  email text not null,
  full_name text,
  status text not null default 'prospect'
    check (status in ('prospect','invited','invitation_accepted','active','completed','withdrawn','archived')),
  source text not null default 'employer_invite',
  consent_status text not null default 'pending'
    check (consent_status in ('pending','accepted','withdrawn')),
  consent_version text,
  consent_at timestamptz,
  withdrawn_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_pilot_candidates_org_email
  on public.pilot_candidates (organization_id, lower(email));
create index if not exists idx_pilot_candidates_auth
  on public.pilot_candidates (auth_user_id);

drop trigger if exists trg_pilot_candidates_updated on public.pilot_candidates;
create trigger trg_pilot_candidates_updated
  before update on public.pilot_candidates
  for each row execute function public.set_updated_at();

-- Candidate invitations (no raw token stored — token_hash only)
create table if not exists public.candidate_invitations (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.pilot_candidates(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  hiring_role_id uuid not null references public.hiring_roles(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  status text not null default 'pending'
    check (status in ('pending','queued','sent','accepted','expired','revoked','failed')),
  invited_by uuid references auth.users(id),
  sent_at timestamptz,
  expires_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id),
  revoked_at timestamptz,
  send_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_candidate_invitations_status_exp
  on public.candidate_invitations (status, expires_at);

drop trigger if exists trg_candidate_invitations_updated on public.candidate_invitations;
create trigger trg_candidate_invitations_updated
  before update on public.candidate_invitations
  for each row execute function public.set_updated_at();

-- Simulation assignments
create table if not exists public.simulation_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  hiring_role_id uuid not null references public.hiring_roles(id) on delete cascade,
  candidate_id uuid not null references public.pilot_candidates(id) on delete cascade,
  invitation_id uuid references public.candidate_invitations(id) on delete set null,
  simulation_template_id uuid not null references public.simulation_templates(id),
  template_version integer not null default 1,
  status text not null default 'invited'
    check (status in (
      'invited','accepted','available','in_progress','submitted',
      'report_processing','report_ready','reviewed','expired','cancelled'
    )),
  available_from timestamptz,
  expires_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_sim_assignments_active_unique
  on public.simulation_assignments (candidate_id, hiring_role_id)
  where status not in ('cancelled','expired');

create index if not exists idx_sim_assignments_org_status
  on public.simulation_assignments (organization_id, status);

drop trigger if exists trg_simulation_assignments_updated on public.simulation_assignments;
create trigger trg_simulation_assignments_updated
  before update on public.simulation_assignments
  for each row execute function public.set_updated_at();

-- Durable simulation sessions (server timer)
create table if not exists public.pilot_simulation_sessions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid unique not null references public.simulation_assignments(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  hiring_role_id uuid not null references public.hiring_roles(id),
  candidate_id uuid not null references public.pilot_candidates(id),
  template_id uuid not null references public.simulation_templates(id),
  template_version integer not null default 1,
  status text not null default 'not_started'
    check (status in (
      'not_started','active','submitting','submitted','under_review',
      'completed','expired','cancelled'
    )),
  started_at timestamptz,
  deadline_at timestamptz,
  last_saved_at timestamptz,
  submitted_at timestamptz,
  locked_at timestamptz,
  current_stage text,
  state_version integer not null default 1,
  session_state jsonb not null default '{}'::jsonb,
  submission_reference text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pilot_sessions_org_status
  on public.pilot_simulation_sessions (organization_id, status);

drop trigger if exists trg_pilot_sessions_updated on public.pilot_simulation_sessions;
create trigger trg_pilot_sessions_updated
  before update on public.pilot_simulation_sessions
  for each row execute function public.set_updated_at();

create table if not exists public.pilot_session_stage_progress (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.pilot_simulation_sessions(id) on delete cascade,
  stage_key text not null,
  status text not null default 'not_started'
    check (status in ('not_started','in_progress','completed')),
  first_opened_at timestamptz,
  completed_at timestamptz,
  last_saved_at timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, stage_key)
);

create table if not exists public.pilot_session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.pilot_simulation_sessions(id) on delete cascade,
  candidate_id uuid not null references public.pilot_candidates(id),
  organization_id uuid not null references public.organizations(id),
  event_type text not null,
  stage_key text,
  event_sequence bigint not null,
  event_data jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  client_event_id text not null,
  unique (client_event_id)
);

create index if not exists idx_pilot_session_events_session
  on public.pilot_session_events (session_id, event_sequence);

create table if not exists public.pilot_session_submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid unique not null references public.pilot_simulation_sessions(id) on delete cascade,
  candidate_id uuid not null references public.pilot_candidates(id),
  organization_id uuid not null references public.organizations(id),
  final_recommendation text not null,
  executive_memo text not null,
  forecast_snapshot jsonb not null default '{}'::jsonb,
  assumption_snapshot jsonb not null default '[]'::jsonb,
  risk_snapshot jsonb not null default '[]'::jsonb,
  submission_snapshot jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.evidence_reports_v2 (
  id uuid primary key default gen_random_uuid(),
  session_id uuid unique not null references public.pilot_simulation_sessions(id) on delete cascade,
  organization_id uuid not null references public.organizations(id),
  candidate_id uuid not null references public.pilot_candidates(id),
  hiring_role_id uuid not null references public.hiring_roles(id),
  status text not null default 'pending'
    check (status in (
      'pending','processing','draft','awaiting_human_review','ready','released','failed'
    )),
  report_version integer not null default 1,
  recommendation text,
  confidence text,
  executive_summary text,
  observed_strengths jsonb not null default '[]'::jsonb,
  needs_review jsonb not null default '[]'::jsonb,
  critical_moments jsonb not null default '[]'::jsonb,
  interview_questions jsonb not null default '[]'::jsonb,
  evidence_dimensions jsonb not null default '{}'::jsonb,
  generated_at timestamptz,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_evidence_reports_v2_org_status
  on public.evidence_reports_v2 (organization_id, status);

-- Employer decisions + outcomes
create table if not exists public.employer_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  hiring_role_id uuid not null references public.hiring_roles(id),
  candidate_id uuid not null references public.pilot_candidates(id),
  report_id uuid references public.evidence_reports_v2(id),
  decision text not null
    check (decision in ('advance','hold','reject','hired','withdrew')),
  reason text,
  decided_by uuid not null references auth.users(id),
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.hiring_outcomes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  hiring_role_id uuid not null references public.hiring_roles(id),
  candidate_id uuid not null references public.pilot_candidates(id),
  decision_id uuid references public.employer_decisions(id),
  hired boolean,
  hire_date date,
  check_in_30_due date,
  check_in_30_completed_at timestamptz,
  check_in_90_due date,
  check_in_90_completed_at timestamptz,
  feedback_30 jsonb,
  feedback_90 jsonb,
  overdue boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ops health table for last cron / worker runs
create table if not exists public.system_heartbeats (
  key text primary key,
  last_run_at timestamptz,
  last_status text,
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- RLS enable
alter table public.employer_onboarding enable row level security;
alter table public.hiring_roles enable row level security;
alter table public.simulation_templates enable row level security;
alter table public.pilot_candidates enable row level security;
alter table public.candidate_invitations enable row level security;
alter table public.simulation_assignments enable row level security;
alter table public.pilot_simulation_sessions enable row level security;
alter table public.pilot_session_stage_progress enable row level security;
alter table public.pilot_session_events enable row level security;
alter table public.pilot_session_submissions enable row level security;
alter table public.evidence_reports_v2 enable row level security;
alter table public.employer_decisions enable row level security;
alter table public.hiring_outcomes enable row level security;

-- Org membership helper (reuse if exists from 009)
create or replace function public.is_active_organization_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_org
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

revoke all on function public.is_active_organization_member(uuid) from public;
grant execute on function public.is_active_organization_member(uuid) to authenticated;

-- Policies (employer members read own org; service role bypasses)
drop policy if exists employer_onboarding_own on public.employer_onboarding;
create policy employer_onboarding_own on public.employer_onboarding
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists hiring_roles_member on public.hiring_roles;
create policy hiring_roles_member on public.hiring_roles
  for all using (public.is_active_organization_member(organization_id))
  with check (public.is_active_organization_member(organization_id));

drop policy if exists sim_templates_read on public.simulation_templates;
create policy sim_templates_read on public.simulation_templates
  for select using (status = 'published' or auth.role() = 'authenticated');

drop policy if exists pilot_candidates_member on public.pilot_candidates;
create policy pilot_candidates_member on public.pilot_candidates
  for all using (
    public.is_active_organization_member(organization_id)
    or auth_user_id = auth.uid()
  )
  with check (
    public.is_active_organization_member(organization_id)
    or auth_user_id = auth.uid()
  );

drop policy if exists candidate_invitations_member on public.candidate_invitations;
create policy candidate_invitations_member on public.candidate_invitations
  for all using (public.is_active_organization_member(organization_id))
  with check (public.is_active_organization_member(organization_id));

drop policy if exists simulation_assignments_access on public.simulation_assignments;
create policy simulation_assignments_access on public.simulation_assignments
  for all using (
    public.is_active_organization_member(organization_id)
    or exists (
      select 1 from public.pilot_candidates c
      where c.id = candidate_id and c.auth_user_id = auth.uid()
    )
  )
  with check (public.is_active_organization_member(organization_id));

drop policy if exists pilot_sessions_access on public.pilot_simulation_sessions;
create policy pilot_sessions_access on public.pilot_simulation_sessions
  for all using (
    public.is_active_organization_member(organization_id)
    or exists (
      select 1 from public.pilot_candidates c
      where c.id = candidate_id and c.auth_user_id = auth.uid()
    )
  );

drop policy if exists evidence_reports_member on public.evidence_reports_v2;
create policy evidence_reports_member on public.evidence_reports_v2
  for select using (
    public.is_active_organization_member(organization_id)
    and status in ('ready','released')
  );
