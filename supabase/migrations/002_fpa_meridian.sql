-- ============================================================================
-- Fydell FP&A Meridian — supplemental schema (extends 001_mvp_core.sql)
-- Adds fine-grained tables for the FP&A workroom: model edits, AI prompts,
-- and structured final submissions; extends existing tables with FP&A columns.
--
-- Run AFTER 001_mvp_core.sql. Safe to re-run (all DDL uses IF NOT EXISTS /
-- ADD COLUMN IF NOT EXISTS).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. model_assumption_changes
--    Tracks every cell edit a candidate makes in the forecast model.
-- ----------------------------------------------------------------------------
create table if not exists public.model_assumption_changes (
  id           uuid primary key default gen_random_uuid(),
  attempt_id   uuid not null references public.simulation_attempts (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  field_key    text not null,   -- e.g. "revenue_q3e", "headcount_additions"
  old_value    text,
  new_value    text not null,
  rationale    text,            -- optional free-text the candidate provides
  created_at   timestamptz not null default now()
);
create index if not exists idx_mac_attempt on public.model_assumption_changes (attempt_id);
create index if not exists idx_mac_ws      on public.model_assumption_changes (workspace_id);

comment on table public.model_assumption_changes is
  'Granular audit trail of every forecast cell a candidate edits during the FP&A simulation.';
comment on column public.model_assumption_changes.field_key is
  'Stable key identifying which model field was changed (snake_case, matches WorkroomRunner fieldKeys).';

-- ----------------------------------------------------------------------------
-- 2. ai_interactions
--    Records any AI-assist prompts triggered during the simulation (future).
-- ----------------------------------------------------------------------------
create table if not exists public.ai_interactions (
  id            uuid primary key default gen_random_uuid(),
  attempt_id    uuid not null references public.simulation_attempts (id) on delete cascade,
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  stage         text not null,  -- brief | data_room | forecast | assumptions | manager_update | recommendation
  prompt_text   text not null,
  response_text text,
  tokens_used   int,
  created_at    timestamptz not null default now()
);
create index if not exists idx_ai_attempt on public.ai_interactions (attempt_id);
create index if not exists idx_ai_ws      on public.ai_interactions (workspace_id);

comment on column public.ai_interactions.stage is
  'Workroom stage where the prompt was triggered: brief | data_room | forecast | assumptions | manager_update | recommendation';

-- ----------------------------------------------------------------------------
-- 3. final_submissions
--    Structured FP&A submission that supplements simulation_attempts.final_recommendation.
-- ----------------------------------------------------------------------------
create table if not exists public.final_submissions (
  id                  uuid primary key default gen_random_uuid(),
  attempt_id          uuid not null references public.simulation_attempts (id) on delete cascade,
  workspace_id        uuid not null references public.workspaces (id) on delete cascade,
  verdict             text not null check (verdict in ('go', 'hold', 'revise')),
  risks_identified    jsonb not null default '[]'::jsonb,
  key_assumptions     jsonb not null default '[]'::jsonb,
  questions_for_mgmt  jsonb not null default '[]'::jsonb,
  executive_memo      text,
  model_changes_count int  not null default 0,
  flags_raised        jsonb not null default '[]'::jsonb,  -- assumption flags from workroom
  submitted_at        timestamptz not null default now()
);
create unique index if not exists idx_final_submissions_attempt on public.final_submissions (attempt_id);

comment on table public.final_submissions is
  'Structured FP&A submission: verdict + risks + assumptions + questions + memo.';
comment on column public.final_submissions.verdict is
  'Candidate decision: go (proceed with plan) | hold (pause) | revise (modify scope).';
comment on column public.final_submissions.flags_raised is
  'Array of {field, assessment} objects from the Assumptions stage.';

-- ----------------------------------------------------------------------------
-- 4. Extend simulation_attempts with FP&A-specific columns
-- ----------------------------------------------------------------------------
alter table public.simulation_attempts
  add column if not exists fpa_verdict         text check (fpa_verdict in ('go', 'hold', 'revise')),
  add column if not exists stage_reached        text,
  add column if not exists model_edits_count    int not null default 0,
  add column if not exists flags_raised_count   int not null default 0;

comment on column public.simulation_attempts.fpa_verdict is
  'Denormalized from final_submissions.verdict for fast dashboard queries.';
comment on column public.simulation_attempts.stage_reached is
  'Last workroom stage the candidate reached (brief|data_room|forecast|assumptions|manager_update|recommendation).';

-- ----------------------------------------------------------------------------
-- 5. Extend candidate_reports with exec summary + missed signals + compare
-- ----------------------------------------------------------------------------
alter table public.candidate_reports
  add column if not exists exec_summary_json   jsonb,
  add column if not exists missed_signals_json jsonb not null default '[]'::jsonb,
  add column if not exists compare_json        jsonb;

comment on column public.candidate_reports.exec_summary_json is
  'Structured executive summary: {headline, signal_label, score, verdict}.';
comment on column public.candidate_reports.missed_signals_json is
  'Array of {signal, description} objects for signals the candidate missed.';
comment on column public.candidate_reports.compare_json is
  'Cohort comparison data: {percentile, avg_score, top_score, n}.';

-- ============================================================================
-- Row Level Security — same patterns as 001_mvp_core.sql
-- (service-role bypasses RLS; these policies guard direct auth access)
-- ============================================================================

alter table public.model_assumption_changes enable row level security;
alter table public.ai_interactions          enable row level security;
alter table public.final_submissions        enable row level security;

-- model_assumption_changes: members read; insert guarded by workspace membership
drop policy if exists mac_select_member on public.model_assumption_changes;
create policy mac_select_member on public.model_assumption_changes
  for select using (public.is_workspace_member(workspace_id));

drop policy if exists mac_insert_member on public.model_assumption_changes;
create policy mac_insert_member on public.model_assumption_changes
  for insert with check (public.is_workspace_member(workspace_id));

drop policy if exists mac_delete_manager on public.model_assumption_changes;
create policy mac_delete_manager on public.model_assumption_changes
  for delete using (public.is_workspace_manager(workspace_id));

-- ai_interactions: members read; members insert
drop policy if exists ai_select_member on public.ai_interactions;
create policy ai_select_member on public.ai_interactions
  for select using (public.is_workspace_member(workspace_id));

drop policy if exists ai_insert_member on public.ai_interactions;
create policy ai_insert_member on public.ai_interactions
  for insert with check (public.is_workspace_member(workspace_id));

-- final_submissions: members read; members insert (one per attempt)
drop policy if exists fs_select_member on public.final_submissions;
create policy fs_select_member on public.final_submissions
  for select using (public.is_workspace_member(workspace_id));

drop policy if exists fs_insert_member on public.final_submissions;
create policy fs_insert_member on public.final_submissions
  for insert with check (public.is_workspace_member(workspace_id));

drop policy if exists fs_update_manager on public.final_submissions;
create policy fs_update_manager on public.final_submissions
  for update using (public.is_workspace_manager(workspace_id));
