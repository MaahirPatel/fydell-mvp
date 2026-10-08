-- 061: Engineering role taxonomy, role requirement versions, scenario
-- authoring (drafts, protected materials, validation runs, approvals),
-- author preview, application-linked invitations and Passport work samples.
--
-- Role taxonomy is separate from simulation coverage: a role can name any
-- legitimate engineering specialization even when no validated work sample
-- exists for it. Additive only: new columns, new tables, tightened policies.

-- ---------------------------------------------------------------------------
-- Hiring roles: engineering intake
-- ---------------------------------------------------------------------------
alter table public.hiring_roles
  add column if not exists role_family text,
  add column if not exists specialization text,
  add column if not exists level text,
  add column if not exists ownership text,
  add column if not exists languages text[] not null default '{}',
  add column if not exists team_context text,
  add column if not exists hiring_owner uuid references auth.users(id) on delete set null,
  add column if not exists reviewer_ids uuid[] not null default '{}',
  add column if not exists accepted_evidence text[] not null default '{}',
  add column if not exists work_sample_policy text not null default 'when_evidence_gap',
  add column if not exists visibility text not null default 'private',
  add column if not exists requirements jsonb not null default '[]'::jsonb,
  add column if not exists requirement_version integer not null default 0,
  add column if not exists source_description text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'hiring_roles_role_family_check') then
    alter table public.hiring_roles add constraint hiring_roles_role_family_check
      check (role_family is null or role_family in ('software_engineer', 'backend_api_engineer', 'applied_ai_engineer'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'hiring_roles_specialization_check') then
    alter table public.hiring_roles add constraint hiring_roles_specialization_check
      check (specialization is null or specialization in ('general', 'frontend', 'full_stack', 'platform_infrastructure', 'developer_tools', 'ml_engineering'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'hiring_roles_level_check') then
    alter table public.hiring_roles add constraint hiring_roles_level_check
      check (level is null or level in ('junior', 'mid', 'senior', 'staff'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'hiring_roles_work_sample_policy_check') then
    alter table public.hiring_roles add constraint hiring_roles_work_sample_policy_check
      check (work_sample_policy in ('not_needed', 'when_evidence_gap', 'required'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'hiring_roles_visibility_check') then
    alter table public.hiring_roles add constraint hiring_roles_visibility_check
      check (visibility in ('private', 'link', 'public'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'hiring_roles_intake_limits') then
    alter table public.hiring_roles add constraint hiring_roles_intake_limits check (
      (ownership is null or char_length(ownership) <= 1000)
      and (team_context is null or char_length(team_context) <= 2000)
      and (source_description is null or char_length(source_description) <= 20000)
      and jsonb_typeof(requirements) = 'array'
      and jsonb_array_length(requirements) <= 40
      and coalesce(array_length(languages, 1), 0) <= 20
      and coalesce(array_length(reviewer_ids, 1), 0) <= 20
    );
  end if;
end $$;

-- Every saved change to a role's evaluation criteria is a new version, so a
-- review always names the criteria it used. Append-only.
create table if not exists public.role_requirement_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role_id uuid not null references public.hiring_roles(id) on delete cascade,
  version integer not null check (version >= 1),
  requirements jsonb not null check (jsonb_typeof(requirements) = 'array'),
  change_reason text check (change_reason is null or char_length(change_reason) <= 500),
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (role_id, version)
);
create index if not exists idx_role_requirement_versions_role on public.role_requirement_versions (role_id, version desc);

-- ---------------------------------------------------------------------------
-- Scenario versions: ownership and origin
-- ---------------------------------------------------------------------------
alter table public.eng_scenario_versions
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
  add column if not exists origin text not null default 'fydell_reviewed',
  add column if not exists base_version_id uuid references public.eng_scenario_versions(id) on delete restrict,
  add column if not exists draft_id uuid,
  add column if not exists family text,
  add column if not exists specialization text,
  add column if not exists level text,
  add column if not exists capabilities text[] not null default '{}',
  add column if not exists purpose text not null default 'hiring',
  add column if not exists package_sha256 text,
  add column if not exists validation_id uuid,
  add column if not exists approval_id uuid,
  add column if not exists archived_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'eng_scenario_versions_origin_check') then
    alter table public.eng_scenario_versions add constraint eng_scenario_versions_origin_check
      check (origin in ('fydell_reviewed', 'employer_authored'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'eng_scenario_versions_purpose_check') then
    alter table public.eng_scenario_versions add constraint eng_scenario_versions_purpose_check
      check (purpose in ('hiring', 'preview'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'eng_scenario_versions_owner_origin') then
    alter table public.eng_scenario_versions add constraint eng_scenario_versions_owner_origin
      check ((origin = 'fydell_reviewed') = (organization_id is null));
  end if;
end $$;

drop policy if exists eng_scenario_versions_select on public.eng_scenario_versions;
create policy eng_scenario_versions_select on public.eng_scenario_versions
  for select to authenticated using (
    status = 'published'
    and purpose = 'hiring'
    and (organization_id is null or public.is_organization_member(organization_id))
  );

-- ---------------------------------------------------------------------------
-- Scenario drafts (authoring). Candidate-visible package and evaluator-only
-- materials live in separate tables; evaluator material has no client policy.
-- ---------------------------------------------------------------------------
create table if not exists public.eng_scenario_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  path text not null check (path in ('template', 'import', 'generated')),
  base_version_id uuid references public.eng_scenario_versions(id) on delete restrict,
  title text not null check (char_length(title) between 2 and 140),
  family text not null check (family in ('software_engineer', 'backend_api_engineer', 'applied_ai_engineer')),
  specialization text not null default 'general',
  level text not null default 'mid' check (level in ('junior', 'mid', 'senior', 'staff')),
  package jsonb not null default '{}'::jsonb check (jsonb_typeof(package) = 'object' and pg_column_size(package) <= 1048576),
  revision integer not null default 1 check (revision >= 1),
  status text not null default 'draft' check (status in ('draft', 'in_review', 'published', 'archived')),
  last_validation_id uuid,
  published_version_id uuid references public.eng_scenario_versions(id) on delete set null,
  next_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists idx_eng_scenario_drafts_org on public.eng_scenario_drafts (organization_id, updated_at desc);

create table if not exists public.eng_scenario_draft_protected (
  draft_id uuid primary key references public.eng_scenario_drafts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object' and pg_column_size(content) <= 1048576),
  updated_at timestamptz not null default now()
);

create table if not exists public.eng_scenario_version_protected (
  version_id uuid primary key references public.eng_scenario_versions(id) on delete cascade,
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now()
);

-- One row per validation run against an exact draft revision. Append-only.
create table if not exists public.eng_scenario_validations (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.eng_scenario_drafts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  draft_revision integer not null,
  package_sha256 text not null check (package_sha256 ~ '^[0-9a-f]{64}$'),
  status text not null check (status in ('passed', 'blocked')),
  checks jsonb not null check (jsonb_typeof(checks) = 'array'),
  ran_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_eng_scenario_validations_draft on public.eng_scenario_validations (draft_id, created_at desc);

-- A reviewer's decision on the exact candidate-facing package. Append-only.
create table if not exists public.eng_scenario_approvals (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.eng_scenario_drafts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  validation_id uuid not null references public.eng_scenario_validations(id) on delete restrict,
  package_sha256 text not null check (package_sha256 ~ '^[0-9a-f]{64}$'),
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewer_email text not null check (char_length(reviewer_email) between 3 and 320),
  decision text not null check (decision in ('approved', 'changes_requested')),
  notes text not null default '' check (char_length(notes) <= 2000),
  previewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_eng_scenario_approvals_draft on public.eng_scenario_approvals (draft_id, created_at desc);

create or replace function public.eng_append_only_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception '% rows are append-only', tg_table_name;
end $$;

drop trigger if exists eng_scenario_validations_append_only on public.eng_scenario_validations;
create trigger eng_scenario_validations_append_only before update or delete on public.eng_scenario_validations
  for each row when (pg_trigger_depth() = 0) execute function public.eng_append_only_guard();
drop trigger if exists eng_scenario_approvals_append_only on public.eng_scenario_approvals;
create trigger eng_scenario_approvals_append_only before update or delete on public.eng_scenario_approvals
  for each row when (pg_trigger_depth() = 0) execute function public.eng_append_only_guard();
drop trigger if exists role_requirement_versions_append_only on public.role_requirement_versions;
create trigger role_requirement_versions_append_only before update or delete on public.role_requirement_versions
  for each row when (pg_trigger_depth() = 0) execute function public.eng_append_only_guard();

-- ---------------------------------------------------------------------------
-- Invitations and attempts: role and application links, preview isolation
-- ---------------------------------------------------------------------------
alter table public.eng_roles
  add column if not exists hiring_role_id uuid references public.hiring_roles(id) on delete set null;

alter table public.eng_invitations
  add column if not exists is_preview boolean not null default false,
  add column if not exists hiring_role_id uuid references public.hiring_roles(id) on delete set null,
  add column if not exists application_id uuid references public.role_applications(id) on delete set null,
  add column if not exists deadline_timezone text,
  add column if not exists evidence_gap jsonb,
  add column if not exists replaced_by uuid references public.eng_invitations(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'eng_invitations_evidence_gap_shape') then
    alter table public.eng_invitations add constraint eng_invitations_evidence_gap_shape
      check (evidence_gap is null or (jsonb_typeof(evidence_gap) = 'object' and pg_column_size(evidence_gap) <= 8192));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'eng_invitations_timezone_shape') then
    alter table public.eng_invitations add constraint eng_invitations_timezone_shape
      check (deadline_timezone is null or deadline_timezone ~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+){0,2}$');
  end if;
end $$;

create index if not exists idx_eng_invitations_application on public.eng_invitations (application_id) where application_id is not null;

alter table public.eng_attempts
  add column if not exists is_preview boolean not null default false;

-- ---------------------------------------------------------------------------
-- Passport work samples: a candidate's chosen, scoped summary of a released
-- work-sample report. Never includes protected task content or reviewer notes.
-- ---------------------------------------------------------------------------
create table if not exists public.passport_work_samples (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid not null references public.eng_attempts(id) on delete cascade,
  report_id uuid not null references public.eng_reports(id) on delete cascade,
  summary jsonb not null check (jsonb_typeof(summary) = 'object' and pg_column_size(summary) <= 16384),
  included_at timestamptz not null default now(),
  removed_at timestamptz
);
create unique index if not exists idx_passport_work_samples_active
  on public.passport_work_samples (owner_id, attempt_id) where removed_at is null;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'role_requirement_versions', 'eng_scenario_drafts', 'eng_scenario_draft_protected',
    'eng_scenario_version_protected', 'eng_scenario_validations', 'eng_scenario_approvals',
    'passport_work_samples'
  ] loop
    execute format('alter table public.%s enable row level security', t);
    execute format('alter table public.%s force row level security', t);
    execute format('revoke all on public.%s from anon', t);
    execute format('revoke insert, update, delete, truncate on public.%s from authenticated', t);
  end loop;
end $$;

drop policy if exists role_requirement_versions_member_select on public.role_requirement_versions;
create policy role_requirement_versions_member_select on public.role_requirement_versions
  for select to authenticated using (public.is_organization_member(organization_id));

drop policy if exists eng_scenario_drafts_member_select on public.eng_scenario_drafts;
create policy eng_scenario_drafts_member_select on public.eng_scenario_drafts
  for select to authenticated using (public.is_organization_member(organization_id));

drop policy if exists eng_scenario_validations_member_select on public.eng_scenario_validations;
create policy eng_scenario_validations_member_select on public.eng_scenario_validations
  for select to authenticated using (public.is_organization_member(organization_id));

drop policy if exists eng_scenario_approvals_member_select on public.eng_scenario_approvals;
create policy eng_scenario_approvals_member_select on public.eng_scenario_approvals
  for select to authenticated using (public.is_organization_member(organization_id));

drop policy if exists passport_work_samples_owner_select on public.passport_work_samples;
create policy passport_work_samples_owner_select on public.passport_work_samples
  for select to authenticated using (owner_id = auth.uid());

-- eng_scenario_draft_protected and eng_scenario_version_protected have no
-- client policy: evaluator-only material is read by the server alone.
revoke all on public.eng_scenario_draft_protected from authenticated;
revoke all on public.eng_scenario_version_protected from authenticated;
