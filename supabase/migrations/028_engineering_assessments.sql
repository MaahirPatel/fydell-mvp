-- 028_engineering_assessments.sql
--
-- Milestone 1: one employer-to-report loop for a local engineering task.
-- Additive only. Nothing here alters or drops an existing table or row.
--
-- Conventions follow 019: text + check enums, token_hash (never raw tokens),
-- service-role writes, scoped SELECT policies, append-only evidence enforced by
-- triggers, and state transitions enforced in the database as well as the app.
-- Hidden tests and expected answers are never stored in these tables.
-- public.set_updated_at() comes from 001 and is reused, not redefined.

create or replace function public.eng_append_only()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception '% rows are append-only', tg_table_name;
end $$;

-- ---------------------------------------------------------------------------
-- Reviewed scenario versions (public preview content only)
-- ---------------------------------------------------------------------------
create table if not exists public.eng_scenario_versions (
  id uuid primary key default gen_random_uuid(),
  scenario_key text not null,
  version integer not null check (version > 0),
  title text not null,
  role_family text not null check (role_family in ('backend_engineer')),
  content jsonb not null,
  starter_sha256 text not null check (starter_sha256 ~ '^[a-f0-9]{64}$'),
  harness_sha256 text not null check (harness_sha256 ~ '^[a-f0-9]{64}$'),
  suite_version text not null,
  rubric_version text not null,
  review_record jsonb not null default '{}'::jsonb,
  status text not null default 'published' check (status in ('published','retired')),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (scenario_key, version)
);

create or replace function public.eng_scenario_version_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'scenario versions cannot be deleted';
  end if;
  if (to_jsonb(new) - 'status') is distinct from (to_jsonb(old) - 'status') then
    raise exception 'published scenario versions are immutable; publish a new version';
  end if;
  return new;
end $$;

drop trigger if exists eng_scenario_versions_guard on public.eng_scenario_versions;
create trigger eng_scenario_versions_guard
  before update or delete on public.eng_scenario_versions
  for each row execute function public.eng_scenario_version_guard();

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
create table if not exists public.eng_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  role_family text not null check (role_family in ('backend_engineer')),
  stack jsonb not null default '[]'::jsonb,
  responsibilities text not null default '' check (char_length(responsibilities) <= 2000),
  evaluation_focus jsonb not null default '[]'::jsonb,
  company_context text not null default '' check (char_length(company_context) <= 1500),
  scenario_version_id uuid not null references public.eng_scenario_versions(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_eng_roles_org on public.eng_roles(organization_id, created_at desc);

-- After publishing, only archiving is allowed. Changing the substance of a
-- role means creating a new one, so no attempt is ever re-pointed.
create or replace function public.eng_role_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.status = 'draft' then
    if new.status not in ('draft','published','archived') then
      raise exception 'invalid role status';
    end if;
    return new;
  end if;
  if old.status = 'published' then
    if new.status not in ('published','archived') then
      raise exception 'a published role cannot return to draft';
    end if;
    if (to_jsonb(new) - array['status','archived_at','updated_at'])
       is distinct from (to_jsonb(old) - array['status','archived_at','updated_at']) then
      raise exception 'published roles are frozen; create a new role to change it';
    end if;
    return new;
  end if;
  raise exception 'archived roles are read-only';
end $$;

drop trigger if exists eng_roles_guard on public.eng_roles;
create trigger eng_roles_guard
  before update on public.eng_roles
  for each row execute function public.eng_role_guard();

-- ---------------------------------------------------------------------------
-- Invitations (pinned to role snapshot and scenario version at send time)
-- ---------------------------------------------------------------------------
create table if not exists public.eng_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role_id uuid not null references public.eng_roles(id) on delete restrict,
  scenario_version_id uuid not null references public.eng_scenario_versions(id) on delete restrict,
  candidate_email text not null check (candidate_email = lower(candidate_email)),
  candidate_name text check (candidate_name is null or char_length(candidate_name) <= 120),
  token_hash text not null unique,
  status text not null default 'invited' check (status in ('invited','accepted','withdrawn','expired')),
  email_delivery text not null default 'not_configured' check (email_delivery in ('sent','failed','not_configured')),
  role_snapshot jsonb not null,
  allowed_minutes integer not null check (allowed_minutes between 30 and 480),
  expires_at timestamptz not null,
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  withdrawn_at timestamptz,
  withdrawn_by uuid references auth.users(id) on delete set null,
  resend_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_eng_invitations_one_active
  on public.eng_invitations(role_id, candidate_email)
  where status in ('invited','accepted');
create index if not exists idx_eng_invitations_org on public.eng_invitations(organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Attempts
-- ---------------------------------------------------------------------------
create table if not exists public.eng_attempts (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null unique references public.eng_invitations(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role_id uuid not null references public.eng_roles(id) on delete restrict,
  scenario_version_id uuid not null references public.eng_scenario_versions(id) on delete restrict,
  candidate_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'accepted' check (status in (
    'accepted','preflight_passed','in_progress','submitted','withdrawn','expired'
  )),
  allowed_minutes integer not null,
  extension_minutes integer not null default 0 check (extension_minutes between 0 and 1440),
  consented_at timestamptz,
  preflight_passed_at timestamptz,
  preflight_runtime text,
  started_at timestamptz,
  due_at timestamptz,
  update_released_at timestamptz,
  update_acknowledged_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_eng_attempts_org on public.eng_attempts(organization_id, created_at desc);
create index if not exists idx_eng_attempts_candidate on public.eng_attempts(candidate_user_id);

create or replace function public.eng_attempt_transition_guard()
returns trigger language plpgsql set search_path = public as $$
declare
  rank_old int;
  rank_new int;
begin
  if new.status = old.status then
    if old.started_at is not null and new.started_at is distinct from old.started_at then
      raise exception 'attempt start time cannot change';
    end if;
    if old.update_released_at is not null and new.update_released_at is distinct from old.update_released_at then
      raise exception 'requirement update release time cannot change';
    end if;
    return new;
  end if;
  if old.status in ('submitted','withdrawn','expired') then
    raise exception 'attempt is final (%)', old.status;
  end if;
  if new.status in ('withdrawn','expired') then
    return new;
  end if;
  rank_old := array_position(array['accepted','preflight_passed','in_progress','submitted'], old.status);
  rank_new := array_position(array['accepted','preflight_passed','in_progress','submitted'], new.status);
  if rank_new is null or rank_new <= rank_old then
    raise exception 'attempt cannot move from % to %', old.status, new.status;
  end if;
  if new.status = 'in_progress' and (new.consented_at is null or new.preflight_passed_at is null) then
    raise exception 'consent and setup check are required before starting';
  end if;
  return new;
end $$;

drop trigger if exists eng_attempts_transition on public.eng_attempts;
create trigger eng_attempts_transition
  before update on public.eng_attempts
  for each row execute function public.eng_attempt_transition_guard();

-- ---------------------------------------------------------------------------
-- Attempt events (append-only, idempotent by client_event_id)
-- ---------------------------------------------------------------------------
create table if not exists public.eng_attempt_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.eng_attempts(id) on delete cascade,
  seq bigint generated always as identity,
  event_type text not null,
  actor text not null check (actor in ('candidate','employer','reviewer','system','teammate')),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  payload jsonb not null default '{}'::jsonb,
  client_event_id text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_eng_attempt_events_idem
  on public.eng_attempt_events(attempt_id, client_event_id) where client_event_id is not null;
create index if not exists idx_eng_attempt_events_attempt on public.eng_attempt_events(attempt_id, seq);

drop trigger if exists eng_attempt_events_append_only on public.eng_attempt_events;
create trigger eng_attempt_events_append_only
  before update or delete on public.eng_attempt_events
  for each row execute function public.eng_append_only();

-- ---------------------------------------------------------------------------
-- Team thread (simulated teammates; every reply comes from an authored rule)
-- ---------------------------------------------------------------------------
create table if not exists public.eng_messages (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.eng_attempts(id) on delete cascade,
  seq bigint generated always as identity,
  sender text not null check (sender in ('candidate','teammate')),
  teammate_id text,
  body text not null check (char_length(body) between 1 and 4000),
  client_msg_id text,
  reply_to uuid references public.eng_messages(id) on delete set null,
  rule_id text,
  created_at timestamptz not null default now(),
  check (sender = 'candidate' or teammate_id is not null)
);

create unique index if not exists idx_eng_messages_idem
  on public.eng_messages(attempt_id, client_msg_id) where client_msg_id is not null;
create index if not exists idx_eng_messages_attempt on public.eng_messages(attempt_id, seq);

drop trigger if exists eng_messages_append_only on public.eng_messages;
create trigger eng_messages_append_only
  before update or delete on public.eng_messages
  for each row execute function public.eng_append_only();

-- ---------------------------------------------------------------------------
-- Candidate drafts (handoff fields and unsent message), CAS by revision
-- ---------------------------------------------------------------------------
create table if not exists public.eng_drafts (
  attempt_id uuid not null references public.eng_attempts(id) on delete cascade,
  field text not null check (field in ('what_changed','testing','risks','next_steps','ai_use','message')),
  body text not null default '' check (char_length(body) <= 8000),
  revision integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (attempt_id, field)
);

-- ---------------------------------------------------------------------------
-- Uploads and immutable submissions
-- ---------------------------------------------------------------------------
create table if not exists public.eng_uploads (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.eng_attempts(id) on delete cascade,
  status text not null default 'initiated' check (status in ('initiated','validating','accepted','rejected','failed')),
  storage_path text not null unique,
  original_filename text check (original_filename is null or char_length(original_filename) <= 255),
  byte_size bigint,
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  entry_count integer,
  uncompressed_bytes bigint,
  file_list jsonb not null default '[]'::jsonb,
  rejection_code text,
  rejection_detail text,
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  check (status <> 'accepted' or sha256 is not null)
);

create index if not exists idx_eng_uploads_attempt on public.eng_uploads(attempt_id, created_at desc);

create or replace function public.eng_upload_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'uploads cannot be deleted';
  end if;
  if old.status in ('accepted','rejected') then
    raise exception 'upload % is final', old.status;
  end if;
  if new.storage_path is distinct from old.storage_path or new.attempt_id is distinct from old.attempt_id then
    raise exception 'upload identity cannot change';
  end if;
  return new;
end $$;

drop trigger if exists eng_uploads_guard on public.eng_uploads;
create trigger eng_uploads_guard
  before update or delete on public.eng_uploads
  for each row execute function public.eng_upload_guard();

create table if not exists public.eng_submissions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.eng_attempts(id) on delete cascade,
  upload_id uuid not null unique references public.eng_uploads(id) on delete restrict,
  archive_sha256 text not null check (archive_sha256 ~ '^[a-f0-9]{64}$'),
  archive_bytes bigint not null,
  handoff jsonb not null,
  ai_disclosure text not null default '' check (char_length(ai_disclosure) <= 4000),
  late boolean not null default false,
  submitted_at timestamptz not null default now()
);

drop trigger if exists eng_submissions_append_only on public.eng_submissions;
create trigger eng_submissions_append_only
  before update or delete on public.eng_submissions
  for each row execute function public.eng_append_only();

-- ---------------------------------------------------------------------------
-- Evaluation runs (durable queue with leases and bounded retries)
-- ---------------------------------------------------------------------------
create table if not exists public.eng_evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.eng_submissions(id) on delete cascade,
  attempt_id uuid not null references public.eng_attempts(id) on delete cascade,
  run_key text not null unique,
  status text not null default 'queued' check (status in (
    'queued','running','human_review','ready','retryable_failure','blocked','canceled'
  )),
  attempt_count integer not null default 0,
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  lease_owner text,
  lease_expires_at timestamptz,
  next_retry_at timestamptz,
  last_error_code text,
  last_error_detail text,
  executor text,
  environment_version text,
  suite_version text not null,
  harness_sha256 text not null,
  scenario_version_id uuid not null references public.eng_scenario_versions(id) on delete restrict,
  results jsonb,
  summary jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_eng_runs_one_active
  on public.eng_evaluation_runs(submission_id) where status <> 'canceled';
create index if not exists idx_eng_runs_claim
  on public.eng_evaluation_runs(status, next_retry_at, lease_expires_at);

create or replace function public.eng_run_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.status in ('ready','canceled') and new.status is distinct from old.status then
    raise exception 'evaluation run is final (%)', old.status;
  end if;
  if old.results is not null and new.results is distinct from old.results then
    raise exception 'recorded test results are immutable';
  end if;
  return new;
end $$;

drop trigger if exists eng_runs_guard on public.eng_evaluation_runs;
create trigger eng_runs_guard
  before update on public.eng_evaluation_runs
  for each row execute function public.eng_run_guard();

-- ---------------------------------------------------------------------------
-- Human-checked reports (versioned; released versions are frozen)
-- ---------------------------------------------------------------------------
create table if not exists public.eng_reports (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.eng_attempts(id) on delete cascade,
  evaluation_run_id uuid not null references public.eng_evaluation_runs(id) on delete restrict,
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in ('draft','released','superseded')),
  brief jsonb not null default '{}'::jsonb,
  findings jsonb not null default '[]'::jsonb,
  rubric_version text not null,
  reviewer_email text not null,
  change_reason text,
  supersedes_id uuid references public.eng_reports(id) on delete restrict,
  review_minutes integer check (review_minutes is null or review_minutes between 0 and 1440),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  released_at timestamptz,
  unique (attempt_id, version)
);

create unique index if not exists idx_eng_reports_one_released
  on public.eng_reports(attempt_id) where status = 'released';
create unique index if not exists idx_eng_reports_one_draft
  on public.eng_reports(attempt_id) where status = 'draft';

create or replace function public.eng_report_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'released reports cannot be deleted';
    end if;
    return old;
  end if;
  if old.status = 'draft' then
    return new;
  end if;
  if old.status = 'released' and new.status = 'superseded'
     and (to_jsonb(new) - array['status','updated_at']) = (to_jsonb(old) - array['status','updated_at']) then
    return new;
  end if;
  raise exception 'released report versions are immutable; publish a correction instead';
end $$;

drop trigger if exists eng_reports_guard on public.eng_reports;
create trigger eng_reports_guard
  before update or delete on public.eng_reports
  for each row execute function public.eng_report_guard();

-- Atomic release: supersede the current version, release the draft, and mark
-- the evaluation ready in one transaction. Service role only.
create or replace function public.eng_release_report(p_report_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.eng_reports;
begin
  select * into r from public.eng_reports where id = p_report_id for update;
  if r.id is null or r.status <> 'draft' then
    raise exception 'report % is not a draft', p_report_id;
  end if;
  update public.eng_reports set status = 'superseded'
    where attempt_id = r.attempt_id and status = 'released';
  update public.eng_reports set status = 'released', released_at = now()
    where id = p_report_id;
  update public.eng_evaluation_runs set status = 'ready'
    where id = r.evaluation_run_id and status = 'human_review';
end $$;

revoke all on function public.eng_release_report(uuid) from public, anon, authenticated;
grant execute on function public.eng_release_report(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Employer decisions, private notes and finding flags (append-only)
-- ---------------------------------------------------------------------------
create table if not exists public.eng_decisions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.eng_attempts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  decision text not null check (decision in ('advance','hold','decline')),
  notes text not null default '' check (char_length(notes) <= 4000),
  report_id uuid references public.eng_reports(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_eng_decisions_attempt on public.eng_decisions(attempt_id, created_at desc);

drop trigger if exists eng_decisions_append_only on public.eng_decisions;
create trigger eng_decisions_append_only
  before update or delete on public.eng_decisions
  for each row execute function public.eng_append_only();

create table if not exists public.eng_review_notes (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.eng_attempts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

drop trigger if exists eng_review_notes_append_only on public.eng_review_notes;
create trigger eng_review_notes_append_only
  before update or delete on public.eng_review_notes
  for each row execute function public.eng_append_only();

create table if not exists public.eng_finding_flags (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.eng_reports(id) on delete cascade,
  attempt_id uuid not null references public.eng_attempts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  finding_id text not null,
  reason text not null check (char_length(reason) between 1 and 2000),
  flagged_by uuid references auth.users(id) on delete set null,
  status text not null default 'open' check (status in ('open','resolved')),
  resolution text,
  resolved_by_email text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_eng_finding_flags_attempt on public.eng_finding_flags(attempt_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['eng_roles','eng_invitations','eng_attempts','eng_evaluation_runs','eng_reports'] loop
    execute format('drop trigger if exists set_updated_at_%s on public.%s', t, t);
    execute format(
      'create trigger set_updated_at_%s before update on public.%s for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS. All writes go through the app server (service role). Reads are scoped.
-- ---------------------------------------------------------------------------
alter table public.eng_scenario_versions enable row level security;
alter table public.eng_roles enable row level security;
alter table public.eng_invitations enable row level security;
alter table public.eng_attempts enable row level security;
alter table public.eng_attempt_events enable row level security;
alter table public.eng_messages enable row level security;
alter table public.eng_drafts enable row level security;
alter table public.eng_uploads enable row level security;
alter table public.eng_submissions enable row level security;
alter table public.eng_evaluation_runs enable row level security;
alter table public.eng_reports enable row level security;
alter table public.eng_decisions enable row level security;
alter table public.eng_review_notes enable row level security;
alter table public.eng_finding_flags enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'eng_scenario_versions','eng_roles','eng_invitations','eng_attempts','eng_attempt_events',
    'eng_messages','eng_drafts','eng_uploads','eng_submissions','eng_evaluation_runs',
    'eng_reports','eng_decisions','eng_review_notes','eng_finding_flags'
  ] loop
    execute format('alter table public.%s force row level security', t);
    execute format('revoke all on public.%s from anon', t);
    execute format('revoke insert, update, delete, truncate on public.%s from authenticated', t);
  end loop;
end $$;

create or replace function public.eng_attempt_candidate(p_attempt_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.eng_attempts a
    where a.id = p_attempt_id and a.candidate_user_id = auth.uid()
  );
$$;

create or replace function public.eng_attempt_org_member(p_attempt_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.eng_attempts a
    where a.id = p_attempt_id and public.is_organization_member(a.organization_id)
  );
$$;

revoke all on function public.eng_attempt_candidate(uuid) from public, anon;
revoke all on function public.eng_attempt_org_member(uuid) from public, anon;
grant execute on function public.eng_attempt_candidate(uuid) to authenticated, service_role;
grant execute on function public.eng_attempt_org_member(uuid) to authenticated, service_role;

drop policy if exists eng_scenario_versions_select on public.eng_scenario_versions;
create policy eng_scenario_versions_select on public.eng_scenario_versions
  for select to authenticated using (status = 'published');

drop policy if exists eng_roles_member_select on public.eng_roles;
create policy eng_roles_member_select on public.eng_roles
  for select to authenticated using (public.is_organization_member(organization_id));

drop policy if exists eng_invitations_member_select on public.eng_invitations;
create policy eng_invitations_member_select on public.eng_invitations
  for select to authenticated using (public.is_organization_member(organization_id));

drop policy if exists eng_attempts_select on public.eng_attempts;
create policy eng_attempts_select on public.eng_attempts
  for select to authenticated using (
    candidate_user_id = auth.uid() or public.is_organization_member(organization_id)
  );

do $$
declare t text;
begin
  foreach t in array array['eng_attempt_events','eng_messages','eng_uploads','eng_submissions'] loop
    execute format('drop policy if exists %s_select on public.%s', t, t);
    execute format(
      'create policy %s_select on public.%s for select to authenticated using (public.eng_attempt_candidate(attempt_id) or public.eng_attempt_org_member(attempt_id))',
      t, t
    );
  end loop;
end $$;

-- Unsent drafts belong to the candidate alone.
drop policy if exists eng_drafts_candidate_select on public.eng_drafts;
create policy eng_drafts_candidate_select on public.eng_drafts
  for select to authenticated using (public.eng_attempt_candidate(attempt_id));

-- Test results and reviewer output are employer-side only.
drop policy if exists eng_evaluation_runs_member_select on public.eng_evaluation_runs;
create policy eng_evaluation_runs_member_select on public.eng_evaluation_runs
  for select to authenticated using (public.eng_attempt_org_member(attempt_id));

drop policy if exists eng_reports_member_select on public.eng_reports;
create policy eng_reports_member_select on public.eng_reports
  for select to authenticated using (
    status in ('released','superseded') and public.eng_attempt_org_member(attempt_id)
  );

do $$
declare t text;
begin
  foreach t in array array['eng_decisions','eng_review_notes','eng_finding_flags'] loop
    execute format('drop policy if exists %s_member_select on public.%s', t, t);
    execute format(
      'create policy %s_member_select on public.%s for select to authenticated using (public.is_organization_member(organization_id))',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Private storage for submitted archives. No storage.objects policies are
-- created, so only the service role (and short-lived signed URLs it mints)
-- can read or write.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('eng-submissions', 'eng-submissions', false, 5242880,
        array['application/zip','application/x-zip-compressed','application/octet-stream'])
on conflict (id) do nothing;
