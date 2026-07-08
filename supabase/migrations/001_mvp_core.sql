-- ============================================================================
-- Fydell Backend MVP — core schema
-- Simulation-based hiring platform: employer -> workspace -> invite ->
-- candidate attempt -> events + final work -> evidence-backed report ->
-- hiring decision -> 30/90-day outcome feedback (the execution-data moat).
--
-- Conventions: UUID primary keys, gen_random_uuid() defaults, timestamptz
-- created_at/updated_at, foreign keys with explicit on-delete behaviour.
-- RLS is enabled on every table; see policies at the bottom of this file.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- updated_at helper
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 1. profiles  (1:1 with auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  full_name    text,
  role         text not null default 'employer' check (role in ('employer', 'candidate', 'admin')),
  company_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 2. workspaces
-- ============================================================================
create table if not exists public.workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_workspaces_updated on public.workspaces;
create trigger trg_workspaces_updated before update on public.workspaces
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 3. workspace_members
-- ============================================================================
create table if not exists public.workspace_members (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  role         text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at   timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index if not exists idx_workspace_members_user on public.workspace_members (user_id);
create index if not exists idx_workspace_members_ws on public.workspace_members (workspace_id);

-- ============================================================================
-- 4. simulations
-- ============================================================================
create table if not exists public.simulations (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid references public.workspaces (id),
  title            text not null,
  role             text not null,
  industry         text,
  description      text,
  duration_minutes int,
  difficulty       text,
  status           text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  simulation_type  text,
  scenario_json    jsonb not null,
  resources_json   jsonb not null default '[]'::jsonb,
  rubric_json      jsonb not null,
  created_by       uuid references public.profiles (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_simulations_ws on public.simulations (workspace_id);
drop trigger if exists trg_simulations_updated on public.simulations;
create trigger trg_simulations_updated before update on public.simulations
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 5. candidate_invites
-- ============================================================================
create table if not exists public.candidate_invites (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces (id) on delete cascade,
  simulation_id   uuid not null references public.simulations (id) on delete cascade,
  candidate_email text,
  candidate_name  text,
  token           text unique not null,
  status          text not null default 'created' check (status in ('created', 'opened', 'started', 'completed', 'expired', 'cancelled')),
  created_by      uuid references public.profiles (id),
  created_at      timestamptz not null default now(),
  expires_at      timestamptz
);
create index if not exists idx_invites_ws on public.candidate_invites (workspace_id);
create index if not exists idx_invites_token on public.candidate_invites (token);

-- ============================================================================
-- 6. simulation_attempts
-- ============================================================================
create table if not exists public.simulation_attempts (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references public.workspaces (id) on delete cascade,
  simulation_id        uuid not null references public.simulations (id) on delete cascade,
  invite_id            uuid references public.candidate_invites (id),
  candidate_name       text,
  candidate_email      text,
  status               text not null default 'not_started' check (status in ('not_started', 'in_progress', 'submitted', 'reviewed')),
  started_at           timestamptz,
  submitted_at         timestamptz,
  completed_at         timestamptz,
  final_recommendation text,
  candidate_notes      text,
  score                int,
  score_json           jsonb,
  report_json          jsonb,
  hiring_decision      text not null default 'not_decided' check (hiring_decision in ('not_decided', 'advance', 'hold', 'reject', 'offer', 'hired')),
  hired_at             timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_attempts_ws on public.simulation_attempts (workspace_id);
create index if not exists idx_attempts_sim on public.simulation_attempts (simulation_id);
create index if not exists idx_attempts_invite on public.simulation_attempts (invite_id);
drop trigger if exists trg_attempts_updated on public.simulation_attempts;
create trigger trg_attempts_updated before update on public.simulation_attempts
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 7. simulation_events  (the granular execution trail)
-- ============================================================================
create table if not exists public.simulation_events (
  id            uuid primary key default gen_random_uuid(),
  attempt_id    uuid not null references public.simulation_attempts (id) on delete cascade,
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  event_type    text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists idx_events_attempt on public.simulation_events (attempt_id);
create index if not exists idx_events_ws on public.simulation_events (workspace_id);
comment on column public.simulation_events.event_type is
  'simulation_started | resource_opened | note_updated | chat_prompt_viewed | question_answered | assumption_added | recommendation_submitted | simulation_completed | report_viewed | reviewer_note_added';

-- ============================================================================
-- 8. candidate_reports
-- ============================================================================
create table if not exists public.candidate_reports (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid not null references public.workspaces (id) on delete cascade,
  attempt_id               uuid not null references public.simulation_attempts (id) on delete cascade,
  overall_signal           text check (overall_signal in ('strong', 'moderate', 'weak', 'insufficient')),
  summary                  text,
  strengths_json           jsonb not null default '[]'::jsonb,
  risks_json               jsonb not null default '[]'::jsonb,
  evidence_json            jsonb not null default '[]'::jsonb,
  interview_questions_json jsonb not null default '[]'::jsonb,
  reviewer_notes           text,
  reviewer_decision        text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists idx_reports_ws on public.candidate_reports (workspace_id);
create index if not exists idx_reports_attempt on public.candidate_reports (attempt_id);
drop trigger if exists trg_reports_updated on public.candidate_reports;
create trigger trg_reports_updated before update on public.candidate_reports
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 9. outcome_feedback  (the outcome-linked calibration loop)
-- ============================================================================
create table if not exists public.outcome_feedback (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references public.workspaces (id) on delete cascade,
  attempt_id          uuid not null references public.simulation_attempts (id) on delete cascade,
  feedback_stage      text not null check (feedback_stage in ('30_day', '60_day', '90_day', '6_month', '12_month')),
  manager_email       text,
  manager_role        text,
  overall_performance text check (overall_performance in ('below', 'meets', 'above', 'top')),
  would_hire_again    text check (would_hire_again in ('yes', 'no', 'unsure')),
  ramp_speed          text check (ramp_speed in ('slow', 'expected', 'fast')),
  work_quality        int check (work_quality between 1 and 5),
  communication       int check (communication between 1 and 5),
  judgment            int check (judgment between 1 and 5),
  independence        int check (independence between 1 and 5),
  notes               text,
  created_at          timestamptz not null default now()
);
create index if not exists idx_outcome_ws on public.outcome_feedback (workspace_id);
create index if not exists idx_outcome_attempt on public.outcome_feedback (attempt_id);

-- ============================================================================
-- 10. subscriptions  (Stripe billing state)
-- ============================================================================
create table if not exists public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references public.workspaces (id) on delete cascade,
  stripe_customer_id   text,
  stripe_subscription_id text,
  status               text,
  plan                 text,
  current_period_end   timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create unique index if not exists idx_subscriptions_ws on public.subscriptions (workspace_id);
drop trigger if exists trg_subscriptions_updated on public.subscriptions;
create trigger trg_subscriptions_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ----------------------------------------------------------------------------
-- All server-side data access in the app uses the service-role key, which
-- BYPASSES RLS. These policies are the safety net for any direct anon/auth
-- access and to prevent cross-workspace leakage. Candidate (token) access is
-- mediated entirely by server routes using the service role + token
-- validation, so there are intentionally no anon candidate policies here.
-- ============================================================================

-- Membership helper. SECURITY DEFINER so it can read workspace_members without
-- triggering recursive RLS evaluation on that same table.
create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_manager(ws uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

alter table public.profiles            enable row level security;
alter table public.workspaces          enable row level security;
alter table public.workspace_members   enable row level security;
alter table public.simulations         enable row level security;
alter table public.candidate_invites   enable row level security;
alter table public.simulation_attempts enable row level security;
alter table public.simulation_events   enable row level security;
alter table public.candidate_reports   enable row level security;
alter table public.outcome_feedback    enable row level security;
alter table public.subscriptions       enable row level security;

-- profiles: a user can read/update only their own profile (and insert it).
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- workspaces: members read; creator inserts; managers update.
drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member on public.workspaces
  for select using (public.is_workspace_member(id));
drop policy if exists workspaces_insert_creator on public.workspaces;
create policy workspaces_insert_creator on public.workspaces
  for insert with check (created_by = auth.uid());
drop policy if exists workspaces_update_manager on public.workspaces;
create policy workspaces_update_manager on public.workspaces
  for update using (public.is_workspace_manager(id));

-- workspace_members: a user can see rows for workspaces they belong to;
-- managers can add/remove members.
drop policy if exists members_select on public.workspace_members;
create policy members_select on public.workspace_members
  for select using (user_id = auth.uid() or public.is_workspace_member(workspace_id));
drop policy if exists members_insert_manager on public.workspace_members;
create policy members_insert_manager on public.workspace_members
  for insert with check (user_id = auth.uid() or public.is_workspace_manager(workspace_id));
drop policy if exists members_delete_manager on public.workspace_members;
create policy members_delete_manager on public.workspace_members
  for delete using (public.is_workspace_manager(workspace_id));

-- simulations: members read (plus global/null-workspace templates);
-- managers manage.
drop policy if exists simulations_select on public.simulations;
create policy simulations_select on public.simulations
  for select using (workspace_id is null or public.is_workspace_member(workspace_id));
drop policy if exists simulations_insert_manager on public.simulations;
create policy simulations_insert_manager on public.simulations
  for insert with check (workspace_id is not null and public.is_workspace_manager(workspace_id));
drop policy if exists simulations_update_manager on public.simulations;
create policy simulations_update_manager on public.simulations
  for update using (workspace_id is not null and public.is_workspace_manager(workspace_id));
drop policy if exists simulations_delete_manager on public.simulations;
create policy simulations_delete_manager on public.simulations
  for delete using (workspace_id is not null and public.is_workspace_manager(workspace_id));

-- candidate_invites: managers manage; members read.
drop policy if exists invites_select_member on public.candidate_invites;
create policy invites_select_member on public.candidate_invites
  for select using (public.is_workspace_member(workspace_id));
drop policy if exists invites_manage_manager on public.candidate_invites;
create policy invites_manage_manager on public.candidate_invites
  for all using (public.is_workspace_manager(workspace_id))
  with check (public.is_workspace_manager(workspace_id));

-- simulation_attempts: members of the workspace read; managers update.
drop policy if exists attempts_select_member on public.simulation_attempts;
create policy attempts_select_member on public.simulation_attempts
  for select using (public.is_workspace_member(workspace_id));
drop policy if exists attempts_update_manager on public.simulation_attempts;
create policy attempts_update_manager on public.simulation_attempts
  for update using (public.is_workspace_manager(workspace_id));

-- simulation_events: members read; members insert into their workspace.
drop policy if exists events_select_member on public.simulation_events;
create policy events_select_member on public.simulation_events
  for select using (public.is_workspace_member(workspace_id));
drop policy if exists events_insert_member on public.simulation_events;
create policy events_insert_member on public.simulation_events
  for insert with check (public.is_workspace_member(workspace_id));

-- candidate_reports: members read; managers write.
drop policy if exists reports_select_member on public.candidate_reports;
create policy reports_select_member on public.candidate_reports
  for select using (public.is_workspace_member(workspace_id));
drop policy if exists reports_manage_manager on public.candidate_reports;
create policy reports_manage_manager on public.candidate_reports
  for all using (public.is_workspace_manager(workspace_id))
  with check (public.is_workspace_manager(workspace_id));

-- outcome_feedback: workspace members read and submit.
drop policy if exists outcome_select_member on public.outcome_feedback;
create policy outcome_select_member on public.outcome_feedback
  for select using (public.is_workspace_member(workspace_id));
drop policy if exists outcome_insert_member on public.outcome_feedback;
create policy outcome_insert_member on public.outcome_feedback
  for insert with check (public.is_workspace_member(workspace_id));

-- subscriptions: members read (billing managed server-side via service role).
drop policy if exists subscriptions_select_member on public.subscriptions;
create policy subscriptions_select_member on public.subscriptions
  for select using (public.is_workspace_member(workspace_id));
