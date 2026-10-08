-- 067: Engineer profile evidence.
--
-- Additive only. Adds the two missing contribution guide sections (the
-- problem and how the work was checked), an append-only record of the
-- engineer confirming their contribution, immutable evidence versions per
-- project, the evidence an application pins (with order and per-project
-- revocation), targeted employer questions tied to an application rather
-- than a share, and attributed collaborator feedback.
--
-- Every table is server-only for writes. Evidence versions can never be
-- updated; an application's pinned evidence can only be revoked, once.

-- ---------------------------------------------------------------------------
-- Contribution guide: problem and how it was checked
-- ---------------------------------------------------------------------------
alter table public.passport_contributions
  add column if not exists problem text not null default '',
  add column if not exists checked_how text not null default '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'passport_contributions_guide_limits') then
    alter table public.passport_contributions add constraint passport_contributions_guide_limits
      check (char_length(problem) <= 2000 and char_length(checked_how) <= 2000);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Contribution confirmations: the engineer states the contribution is theirs.
-- Ownership is never inferred from repository access or commit counts; this
-- row is the only source of "confirmed". Rows are appended, never edited
-- except to withdraw.
-- ---------------------------------------------------------------------------
create table if not exists public.project_contribution_confirmations (
  id uuid primary key default gen_random_uuid(),
  passport_id uuid not null references public.passports(id) on delete cascade,
  project_key text not null check (char_length(project_key) between 1 and 300),
  presentation_version integer not null default 0 check (presentation_version >= 0),
  contribution_version integer not null default 0 check (contribution_version >= 0),
  statement text not null check (char_length(statement) <= 2000),
  confirmed_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  withdrawn_at timestamptz
);
create index if not exists idx_contribution_confirmations_project
  on public.project_contribution_confirmations (passport_id, project_key, created_at desc);

-- ---------------------------------------------------------------------------
-- Evidence versions: immutable snapshot of one project's evidence package.
-- The same content (by hash) is stored once, so retries and reuse across
-- applications resolve to the same version.
-- ---------------------------------------------------------------------------
create table if not exists public.evidence_versions (
  id uuid primary key default gen_random_uuid(),
  passport_id uuid not null references public.passports(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_key text not null check (char_length(project_key) between 1 and 300),
  version integer not null check (version > 0),
  schema_version text not null check (char_length(schema_version) <= 40),
  content jsonb not null check (jsonb_typeof(content) = 'object' and pg_column_size(content) <= 524288),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  origin text not null check (origin in ('publish', 'application')),
  created_at timestamptz not null default now(),
  unique (passport_id, project_key, version),
  unique (passport_id, project_key, content_hash)
);
create index if not exists idx_evidence_versions_owner on public.evidence_versions (owner_id, project_key, version desc);

create or replace function public.evidence_versions_immutable()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'evidence versions are immutable';
end $$;

drop trigger if exists evidence_versions_no_update on public.evidence_versions;
create trigger evidence_versions_no_update before update on public.evidence_versions
  for each row execute function public.evidence_versions_immutable();

-- ---------------------------------------------------------------------------
-- Application evidence: which versions an application pins, in what order.
-- Only revoked_at may change, once, from null to a time.
-- ---------------------------------------------------------------------------
create table if not exists public.application_evidence (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.role_applications(id) on delete cascade,
  evidence_version_id uuid not null references public.evidence_versions(id) on delete cascade,
  position integer not null check (position >= 0 and position < 50),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (application_id, evidence_version_id),
  unique (application_id, position)
);
create index if not exists idx_application_evidence_version on public.application_evidence (evidence_version_id);

create or replace function public.application_evidence_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.id is distinct from old.id or new.application_id is distinct from old.application_id
     or new.evidence_version_id is distinct from old.evidence_version_id or new.position is distinct from old.position
     or new.created_at is distinct from old.created_at then
    raise exception 'pinned application evidence cannot change';
  end if;
  if old.revoked_at is not null and new.revoked_at is distinct from old.revoked_at then
    raise exception 'revoked application evidence stays revoked';
  end if;
  return new;
end $$;

drop trigger if exists application_evidence_guard on public.application_evidence;
create trigger application_evidence_guard before update on public.application_evidence
  for each row execute function public.application_evidence_guard();

-- ---------------------------------------------------------------------------
-- Application questions: targeted employer questions tied to an application,
-- optionally to one pinned evidence version and finding. No share required.
-- ---------------------------------------------------------------------------
create table if not exists public.application_questions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  application_id uuid not null references public.role_applications(id) on delete cascade,
  evidence_version_id uuid references public.evidence_versions(id) on delete set null,
  finding_id text check (finding_id is null or finding_id ~ '^ev_[0-9a-f]{16}$'),
  question text not null check (char_length(question) between 1 and 2000),
  response text not null default '' check (char_length(response) <= 4000),
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  asked_by uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  answered_at timestamptz,
  reviewed_at timestamptz,
  closed_at timestamptz,
  client_request_id text check (client_request_id is null or client_request_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  created_at timestamptz not null default now()
);
create unique index if not exists idx_application_questions_request
  on public.application_questions (organization_id, client_request_id) where client_request_id is not null;
create index if not exists idx_application_questions_application on public.application_questions (application_id, created_at);

-- ---------------------------------------------------------------------------
-- Collaborator feedback: attributed, with the relationship, whether the
-- person directly observed the work, and what Fydell verified. No score.
-- ---------------------------------------------------------------------------
create table if not exists public.collaborator_feedback (
  id uuid primary key default gen_random_uuid(),
  passport_id uuid not null references public.passports(id) on delete cascade,
  project_key text not null check (char_length(project_key) between 1 and 300),
  author_name text not null check (char_length(author_name) between 1 and 120),
  relationship text not null check (relationship in ('manager', 'peer', 'report', 'client', 'maintainer', 'other')),
  relationship_note text not null default '' check (char_length(relationship_note) <= 200),
  directly_observed boolean not null,
  statement text not null check (char_length(statement) between 1 and 1500),
  verification text not null default 'none' check (verification in ('none', 'author_account')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  withdrawn_at timestamptz
);
create index if not exists idx_collaborator_feedback_project on public.collaborator_feedback (passport_id, project_key);

-- ---------------------------------------------------------------------------
-- Row level security: server-only writes; engineers may read their own versions.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'project_contribution_confirmations', 'evidence_versions', 'application_evidence',
    'application_questions', 'collaborator_feedback'
  ] loop
    execute format('alter table public.%s enable row level security', t);
    execute format('alter table public.%s force row level security', t);
    execute format('revoke all on public.%s from anon', t);
    execute format('revoke insert, update, delete, truncate on public.%s from authenticated', t);
  end loop;
end $$;

drop policy if exists evidence_versions_owner_select on public.evidence_versions;
create policy evidence_versions_owner_select on public.evidence_versions
  for select to authenticated using (owner_id = auth.uid());
