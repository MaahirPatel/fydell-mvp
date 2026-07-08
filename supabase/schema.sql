-- ============================================================================
-- Fydell — Supabase schema (faithful to index.html localStorage model)
-- ----------------------------------------------------------------------------
-- This migration mirrors the exact data the shipped single-file app
-- (index.html) keeps in localStorage today:
--
--   Legacy per-user keys
--     fydell_users             -> profiles (auth) + organizations
--     fydell_session           -> Supabase Auth session (no table)
--     fydell_data_<email>      -> (per-user practice sims/attempts/activity;
--                                  the "authored simulations" are NOT modelled
--                                  here because the shipped app ships 4 fixed
--                                  simulations by key: meridian/atlas/sentinel/
--                                  harbor. See simulation_key columns.)
--     fydell_invites[].messages-> chat_messages
--     fydell_events            -> simulation_events
--     fydell_decisions         -> hiring_decisions
--
--   Unified data model keys (fydell_dm_*)
--     organizations            -> organizations
--     pilots                   -> pilots
--     candidateInvites         -> candidate_invites
--     simulationAttempts       -> simulation_attempts
--     evidenceReports          -> evidence_reports
--     hiringDecisions          -> hiring_decisions
--     activity                 -> activity_log
--
-- Conventions: uuid primary keys (gen_random_uuid()), timestamptz
-- created_at/updated_at, explicit foreign keys, RLS enabled on every table.
--
-- NOTE: A previous exploratory migration (migrations/001_mvp_core.sql) modelled
-- a different "workspaces / workspace_members" shape. This file intentionally
-- models the ACTUAL shipped app (organizations + role on profiles). Do NOT run
-- both against the same database without reconciling; this schema.sql is the
-- source of truth for the localStorage -> Supabase migration described in
-- INTEGRATION_PLAN.md. Paste this whole file into the Supabase SQL editor.
--
-- Idempotent: safe to re-run (create ... if not exists, drop policy if exists).
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
-- 1. organizations   (fydell_dm_organizations)
--    Legacy shape: { id, name, ownerEmail, createdAt }
-- ============================================================================
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid references auth.users (id) on delete set null,
  owner_email text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_organizations_updated on public.organizations;
create trigger trg_organizations_updated before update on public.organizations
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 2. profiles   (fydell_users, 1:1 with auth.users)
--    Legacy shape: { id, email, username, password(*), role, workspace,
--                    avatar, createdAt, organizationId }
--    (*) password is handled by Supabase Auth and is intentionally NOT stored.
--    role distinguishes company users from candidates.
-- ============================================================================
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text not null,
  username        text,
  role            text not null default 'company'
                    check (role in ('company', 'candidate', 'admin')),
  workspace       text,                              -- company / workspace name
  avatar_url      text,                              -- was a data URL in localStorage
  organization_id uuid references public.organizations (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_profiles_org on public.profiles (organization_id);
create index if not exists idx_profiles_email on public.profiles (lower(email));
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 3. pilots   (fydell_dm_pilots)
--    Legacy shape: { id, organizationId, title, roleTitle, simulationId,
--      simKey, simTitle, department, dueDate, priorities[], status, createdAt }
-- ============================================================================
create table if not exists public.pilots (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  title            text not null,
  role_title       text,
  simulation_key   text not null default 'meridian'
                     check (simulation_key in ('meridian', 'atlas', 'sentinel', 'harbor')),
  simulation_title text,
  department       text,
  due_date         date,
  priorities       jsonb not null default '[]'::jsonb,   -- array of priority labels
  status           text not null default 'active'
                     check (status in ('active', 'paused', 'closed', 'archived')),
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_pilots_org on public.pilots (organization_id);
create index if not exists idx_pilots_status on public.pilots (organization_id, status);
drop trigger if exists trg_pilots_updated on public.pilots;
create trigger trg_pilots_updated before update on public.pilots
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 4. candidate_invites   (fydell_dm_candidateInvites + fydell_invites token)
--    Legacy shape: { id, pilotId, organizationId, candidateName, candidateEmail,
--      token, simKey, status, progress, fit, reportId, decision,
--      createdAt, acceptedAt, startedAt, completedAt }
-- ============================================================================
create table if not exists public.candidate_invites (
  id              uuid primary key default gen_random_uuid(),
  pilot_id        uuid not null references public.pilots (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  candidate_id    uuid references public.profiles (id) on delete set null, -- set once candidate signs in
  candidate_name  text,
  candidate_email text not null,
  token           text not null unique,               -- share link token from Math.random slice
  simulation_key  text not null default 'meridian'
                    check (simulation_key in ('meridian', 'atlas', 'sentinel', 'harbor')),
  status          text not null default 'invited'
                    check (status in ('invited', 'accepted', 'started', 'completed', 'reviewed')),
  progress        int  not null default 0 check (progress between 0 and 100),
  fit             int,                                 -- cached fit % once completed
  decision        text check (decision in ('advance', 'hold', 'reject')),
  created_at      timestamptz not null default now(),
  accepted_at     timestamptz,
  started_at      timestamptz,
  completed_at    timestamptz,
  updated_at      timestamptz not null default now()
);
create index if not exists idx_invites_pilot on public.candidate_invites (pilot_id);
create index if not exists idx_invites_org on public.candidate_invites (organization_id);
create index if not exists idx_invites_token on public.candidate_invites (token);
create index if not exists idx_invites_email on public.candidate_invites (lower(candidate_email));
drop trigger if exists trg_invites_updated on public.candidate_invites;
create trigger trg_invites_updated before update on public.candidate_invites
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 5. simulation_attempts   (fydell_dm_simulationAttempts)
--    Legacy shape: { id, pilotId, inviteId, candidateId(email), simulationId,
--      status, progress, startedAt, submittedAt, state{}, events[],
--      finalResponse }.
--    events[] is normalised into simulation_events; state kept as jsonb.
-- ============================================================================
create table if not exists public.simulation_attempts (
  id              uuid primary key default gen_random_uuid(),
  invite_id       uuid references public.candidate_invites (id) on delete set null,
  pilot_id        uuid references public.pilots (id) on delete set null,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  candidate_id    uuid references public.profiles (id) on delete set null,
  candidate_email text not null,
  simulation_key  text not null default 'meridian'
                    check (simulation_key in ('meridian', 'atlas', 'sentinel', 'harbor')),
  status          text not null default 'in_progress'
                    check (status in ('in_progress', 'submitted', 'reviewed')),
  progress        int  not null default 0 check (progress between 0 and 100),
  fit             int,
  overall         text check (overall in ('strong', 'moderate', 'weak', 'none')),
  final_response  text,
  state           jsonb not null default '{}'::jsonb,
  started_at      timestamptz,
  submitted_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_attempts_invite on public.simulation_attempts (invite_id);
create index if not exists idx_attempts_org on public.simulation_attempts (organization_id);
create index if not exists idx_attempts_candidate on public.simulation_attempts (candidate_id);
create index if not exists idx_attempts_email on public.simulation_attempts (lower(candidate_email));
drop trigger if exists trg_attempts_updated on public.simulation_attempts;
create trigger trg_attempts_updated before update on public.simulation_attempts
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 6. simulation_events   (fydell_events / logSimulationEvent)
--    Legacy shape: { id, attemptId, candidateId, userId, type, category,
--      section, label, payload, detail, dim, timestamp, t, visibleToReviewer }
-- ============================================================================
create table if not exists public.simulation_events (
  id                 uuid primary key default gen_random_uuid(),
  attempt_id         uuid not null references public.simulation_attempts (id) on delete cascade,
  organization_id    uuid not null references public.organizations (id) on delete cascade,
  candidate_id       uuid references public.profiles (id) on delete set null,
  client_event_id    text,                    -- original ev_ id from the client (dedupe)
  user_email         text,                    -- was userId (candidate email or 'candidate')
  type               text not null,           -- e.g. simulation_started, resource_opened, ...
  category           text,
  section            text,
  label              text,
  dim                text,                    -- scoring dimension tag
  detail             text,
  payload            jsonb,
  elapsed_seconds    int,                     -- was `t` (seconds into the attempt)
  visible_to_reviewer boolean not null default true,
  event_time         timestamptz not null default now(), -- was `timestamp`
  created_at         timestamptz not null default now()
);
create index if not exists idx_events_attempt on public.simulation_events (attempt_id);
create index if not exists idx_events_org on public.simulation_events (organization_id);
create index if not exists idx_events_type on public.simulation_events (attempt_id, type);
create unique index if not exists uq_events_client_id
  on public.simulation_events (client_event_id) where client_event_id is not null;

-- ============================================================================
-- 7. evidence_reports   (fydell_dm_evidenceReports + generated memo)
--    Legacy shape: { id, attemptId, candidateId, pilotId, organizationId,
--      fit, overall, createdAt }. The full generated memo (recommendation,
--      confidence, skillSignals, evidenceHighlights, evidenceTimeline,
--      strengths, watchAreas, interviewQuestions, finalResponse) is stored in
--      report_json so the exact renderReport() output can be reproduced.
-- ============================================================================
create table if not exists public.evidence_reports (
  id              uuid primary key default gen_random_uuid(),
  attempt_id      uuid not null references public.simulation_attempts (id) on delete cascade,
  invite_id       uuid references public.candidate_invites (id) on delete set null,
  pilot_id        uuid references public.pilots (id) on delete set null,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  candidate_id    uuid references public.profiles (id) on delete set null,
  candidate_email text,
  fit             int,
  overall         text check (overall in ('strong', 'moderate', 'weak', 'none')),
  recommendation  text,                        -- Strong Advance | Advance | Hold | Do Not Advance
  confidence      text,                        -- High | Medium | Low
  report_json     jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_reports_attempt on public.evidence_reports (attempt_id);
create index if not exists idx_reports_org on public.evidence_reports (organization_id);
create index if not exists idx_reports_pilot on public.evidence_reports (pilot_id);
drop trigger if exists trg_reports_updated on public.evidence_reports;
create trigger trg_reports_updated before update on public.evidence_reports
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 8. hiring_decisions   (fydell_dm_hiringDecisions + fydell_decisions notes)
--    Legacy shape: { id, reportId, decision, notes, createdAt, at }
--    plus the per-report reviewer note kept in fydell_decisions.
-- ============================================================================
create table if not exists public.hiring_decisions (
  id              uuid primary key default gen_random_uuid(),
  report_id       uuid references public.evidence_reports (id) on delete cascade,
  invite_id       uuid references public.candidate_invites (id) on delete set null,
  attempt_id      uuid references public.simulation_attempts (id) on delete set null,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  decision        text not null check (decision in ('advance', 'hold', 'reject')),
  notes           text,
  decided_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- one decision per report (upsert target, matches dmSaveDecision's find-or-create)
create unique index if not exists uq_decisions_report
  on public.hiring_decisions (report_id) where report_id is not null;
create index if not exists idx_decisions_org on public.hiring_decisions (organization_id);
drop trigger if exists trg_decisions_updated on public.hiring_decisions;
create trigger trg_decisions_updated before update on public.hiring_decisions
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 9. chat_messages   (fydell_invites[].messages)
--    Legacy shape: { from: 'system'|'recruiter'|'candidate', text, at }
--    tied to an invite (the recruiter <-> candidate thread).
-- ============================================================================
create table if not exists public.chat_messages (
  id              uuid primary key default gen_random_uuid(),
  invite_id       uuid not null references public.candidate_invites (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sender          text not null check (sender in ('system', 'recruiter', 'candidate')),
  sender_id       uuid references public.profiles (id) on delete set null,
  body            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_chat_invite on public.chat_messages (invite_id, created_at);
create index if not exists idx_chat_org on public.chat_messages (organization_id);

-- ============================================================================
-- 10. activity_log   (fydell_dm_activity)
--     Legacy shape: { id, organizationId, type, text, at }
-- ============================================================================
create table if not exists public.activity_log (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  type            text,
  text            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_activity_org on public.activity_log (organization_id, created_at desc);

-- ============================================================================
-- RLS helper functions
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER so they read profiles without recursively evaluating RLS.
-- Kept in the exposed `public` schema for convenience; they are read-only and
-- only expose the caller's own org/email, so they are safe. (If you later move
-- to defence-in-depth, relocate these to a private schema.)
-- ============================================================================
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(email) from public.profiles where id = auth.uid();
$$;

create or replace function public.is_company_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('company', 'admin')
  );
$$;

-- ============================================================================
-- Enable RLS on every table
-- ============================================================================
alter table public.organizations       enable row level security;
alter table public.profiles             enable row level security;
alter table public.pilots               enable row level security;
alter table public.candidate_invites    enable row level security;
alter table public.simulation_attempts  enable row level security;
alter table public.simulation_events    enable row level security;
alter table public.evidence_reports     enable row level security;
alter table public.hiring_decisions     enable row level security;
alter table public.chat_messages        enable row level security;
alter table public.activity_log         enable row level security;

-- ----------------------------------------------------------------------------
-- organizations: a company user reads/updates only their own org; the owner
-- creates it. Candidates have no access to organizations.
-- ----------------------------------------------------------------------------
drop policy if exists org_select_member on public.organizations;
create policy org_select_member on public.organizations
  for select using (id = public.current_org_id());
drop policy if exists org_insert_owner on public.organizations;
create policy org_insert_owner on public.organizations
  for insert with check (owner_id = auth.uid());
drop policy if exists org_update_member on public.organizations;
create policy org_update_member on public.organizations
  for update using (id = public.current_org_id())
  with check (id = public.current_org_id());

-- ----------------------------------------------------------------------------
-- profiles: users read/update their own row; company users may also read other
-- profiles in the same organization (team visibility). Insert only self.
-- ----------------------------------------------------------------------------
drop policy if exists profiles_select_self_or_org on public.profiles;
create policy profiles_select_self_or_org on public.profiles
  for select using (
    id = auth.uid()
    or (organization_id is not null and organization_id = public.current_org_id())
  );
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ----------------------------------------------------------------------------
-- pilots: company users manage their org's pilots. Candidates may READ a pilot
-- only if they have an invite to it (needed to render the invite/run screen).
-- ----------------------------------------------------------------------------
drop policy if exists pilots_company_all on public.pilots;
create policy pilots_company_all on public.pilots
  for all
  using (organization_id = public.current_org_id() and public.is_company_user())
  with check (organization_id = public.current_org_id() and public.is_company_user());
drop policy if exists pilots_candidate_select on public.pilots;
create policy pilots_candidate_select on public.pilots
  for select using (
    exists (
      select 1 from public.candidate_invites ci
      where ci.pilot_id = pilots.id
        and (ci.candidate_id = auth.uid()
             or lower(ci.candidate_email) = public.current_email())
    )
  );

-- ----------------------------------------------------------------------------
-- candidate_invites: company users manage all invites in their org; a candidate
-- can read (and update the status/progress of) invites addressed to them.
-- ----------------------------------------------------------------------------
drop policy if exists invites_company_all on public.candidate_invites;
create policy invites_company_all on public.candidate_invites
  for all
  using (organization_id = public.current_org_id() and public.is_company_user())
  with check (organization_id = public.current_org_id() and public.is_company_user());
drop policy if exists invites_candidate_select on public.candidate_invites;
create policy invites_candidate_select on public.candidate_invites
  for select using (
    candidate_id = auth.uid() or lower(candidate_email) = public.current_email()
  );
drop policy if exists invites_candidate_update on public.candidate_invites;
create policy invites_candidate_update on public.candidate_invites
  for update using (
    candidate_id = auth.uid() or lower(candidate_email) = public.current_email()
  ) with check (
    candidate_id = auth.uid() or lower(candidate_email) = public.current_email()
  );

-- ----------------------------------------------------------------------------
-- simulation_attempts: company users read (and update, for review) attempts in
-- their org; a candidate reads/creates/updates only their own attempts.
-- ----------------------------------------------------------------------------
drop policy if exists attempts_company_select on public.simulation_attempts;
create policy attempts_company_select on public.simulation_attempts
  for select using (organization_id = public.current_org_id() and public.is_company_user());
drop policy if exists attempts_company_update on public.simulation_attempts;
create policy attempts_company_update on public.simulation_attempts
  for update using (organization_id = public.current_org_id() and public.is_company_user())
  with check (organization_id = public.current_org_id() and public.is_company_user());
drop policy if exists attempts_candidate_select on public.simulation_attempts;
create policy attempts_candidate_select on public.simulation_attempts
  for select using (
    candidate_id = auth.uid() or lower(candidate_email) = public.current_email()
  );
drop policy if exists attempts_candidate_insert on public.simulation_attempts;
create policy attempts_candidate_insert on public.simulation_attempts
  for insert with check (
    candidate_id = auth.uid() or lower(candidate_email) = public.current_email()
  );
drop policy if exists attempts_candidate_update on public.simulation_attempts;
create policy attempts_candidate_update on public.simulation_attempts
  for update using (
    candidate_id = auth.uid() or lower(candidate_email) = public.current_email()
  ) with check (
    candidate_id = auth.uid() or lower(candidate_email) = public.current_email()
  );

-- ----------------------------------------------------------------------------
-- simulation_events: company users read events for their org; a candidate reads
-- and inserts events only for an attempt that belongs to them. (INSERT check
-- validates ownership of the parent attempt; org is denormalised for reads.)
-- ----------------------------------------------------------------------------
drop policy if exists events_company_select on public.simulation_events;
create policy events_company_select on public.simulation_events
  for select using (organization_id = public.current_org_id() and public.is_company_user());
drop policy if exists events_candidate_select on public.simulation_events;
create policy events_candidate_select on public.simulation_events
  for select using (
    exists (
      select 1 from public.simulation_attempts a
      where a.id = simulation_events.attempt_id
        and (a.candidate_id = auth.uid() or lower(a.candidate_email) = public.current_email())
    )
  );
drop policy if exists events_candidate_insert on public.simulation_events;
create policy events_candidate_insert on public.simulation_events
  for insert with check (
    exists (
      select 1 from public.simulation_attempts a
      where a.id = simulation_events.attempt_id
        and a.organization_id = simulation_events.organization_id
        and (a.candidate_id = auth.uid() or lower(a.candidate_email) = public.current_email())
    )
  );

-- ----------------------------------------------------------------------------
-- evidence_reports: company users read all reports in their org; a candidate
-- may insert a report tied to their own attempt (the shipped app generates the
-- report client-side on submit) and read their own.
-- SECURITY NOTE: allowing the candidate client to write fit/overall is a trust
-- risk carried over from the current app. See INTEGRATION_PLAN.md — the
-- recommended hardening is to move report generation to an Edge Function using
-- the service role and drop the candidate INSERT policy.
-- ----------------------------------------------------------------------------
drop policy if exists reports_company_select on public.evidence_reports;
create policy reports_company_select on public.evidence_reports
  for select using (organization_id = public.current_org_id() and public.is_company_user());
drop policy if exists reports_company_update on public.evidence_reports;
create policy reports_company_update on public.evidence_reports
  for update using (organization_id = public.current_org_id() and public.is_company_user())
  with check (organization_id = public.current_org_id() and public.is_company_user());
drop policy if exists reports_candidate_select on public.evidence_reports;
create policy reports_candidate_select on public.evidence_reports
  for select using (
    candidate_id = auth.uid() or lower(candidate_email) = public.current_email()
  );
drop policy if exists reports_candidate_insert on public.evidence_reports;
create policy reports_candidate_insert on public.evidence_reports
  for insert with check (
    exists (
      select 1 from public.simulation_attempts a
      where a.id = evidence_reports.attempt_id
        and a.organization_id = evidence_reports.organization_id
        and (a.candidate_id = auth.uid() or lower(a.candidate_email) = public.current_email())
    )
  );

-- ----------------------------------------------------------------------------
-- hiring_decisions: company users only, scoped to their org. Candidates have no
-- access whatsoever (they never see hiring decisions).
-- ----------------------------------------------------------------------------
drop policy if exists decisions_company_all on public.hiring_decisions;
create policy decisions_company_all on public.hiring_decisions
  for all
  using (organization_id = public.current_org_id() and public.is_company_user())
  with check (organization_id = public.current_org_id() and public.is_company_user());

-- ----------------------------------------------------------------------------
-- chat_messages: company users read/write threads in their org; a candidate
-- reads/writes only threads for invites addressed to them.
-- ----------------------------------------------------------------------------
drop policy if exists chat_company_select on public.chat_messages;
create policy chat_company_select on public.chat_messages
  for select using (organization_id = public.current_org_id() and public.is_company_user());
drop policy if exists chat_company_insert on public.chat_messages;
create policy chat_company_insert on public.chat_messages
  for insert with check (organization_id = public.current_org_id() and public.is_company_user());
drop policy if exists chat_candidate_select on public.chat_messages;
create policy chat_candidate_select on public.chat_messages
  for select using (
    exists (
      select 1 from public.candidate_invites ci
      where ci.id = chat_messages.invite_id
        and (ci.candidate_id = auth.uid() or lower(ci.candidate_email) = public.current_email())
    )
  );
drop policy if exists chat_candidate_insert on public.chat_messages;
create policy chat_candidate_insert on public.chat_messages
  for insert with check (
    sender = 'candidate'
    and exists (
      select 1 from public.candidate_invites ci
      where ci.id = chat_messages.invite_id
        and (ci.candidate_id = auth.uid() or lower(ci.candidate_email) = public.current_email())
    )
  );

-- ----------------------------------------------------------------------------
-- activity_log: company users only, scoped to their org.
-- ----------------------------------------------------------------------------
drop policy if exists activity_company_select on public.activity_log;
create policy activity_company_select on public.activity_log
  for select using (organization_id = public.current_org_id() and public.is_company_user());
drop policy if exists activity_company_insert on public.activity_log;
create policy activity_company_insert on public.activity_log
  for insert with check (organization_id = public.current_org_id() and public.is_company_user());

-- ============================================================================
-- OPTIONAL: auto-provision a profile row when a new auth user is created.
-- Reads the sign-up metadata (role/username/workspace) passed via
-- supabase.auth.signUp({ options: { data: {...} } }). user_metadata is
-- user-editable, so this is fine for convenience fields (name/workspace) but
-- MUST NOT be trusted for authorization. Role is defaulted here and can be
-- corrected server-side; do not use it in security-sensitive checks without
-- promoting it to app_metadata.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, role, workspace)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'company'),
    new.raw_user_meta_data ->> 'workspace'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- End of schema.sql
-- ============================================================================
