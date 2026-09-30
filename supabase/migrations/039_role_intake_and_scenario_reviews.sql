-- 039: employer role intake, requests for unavailable roles, and scenario
-- review records with a database-enforced validation lifecycle.
--
-- Additive. Mirrors src/lib/scenario-catalog/lifecycle.ts and
-- src/lib/employer/intake.ts; see docs/scenario-authoring.md.
--
--   draft → automated_validation → expert_review → approved → published → retired
--
-- Invariants enforced here, not only in application code:
-- - A version enters expert_review only with a passing automated record.
-- - It is approved only with a human expert review that is not by the
--   version's author and names the reviewer's qualification.
-- - It is published only with a separate human publication record.
-- - Review records are append-only.
-- - A frozen intake (an invitation was issued from it) cannot change.
--
-- Nothing is backfilled: existing versions start at validation_status
-- 'draft' until their review records are written. This deliberately does not
-- touch sim_templates.status, which is what the employer catalog reads today.
--
-- Rollback (only before any rows exist):
--   drop table if exists public.role_requests;
--   drop table if exists public.employer_role_intakes;
--   drop trigger if exists sim_template_versions_validation on public.sim_template_versions;
--   drop table if exists public.sim_scenario_reviews;
--   alter table public.sim_template_versions drop column if exists validation_status;
--   (and restore sim_template_version_guard from 019)

-- ---------------------------------------------------------------------------
-- Scenario review records
-- ---------------------------------------------------------------------------
create table if not exists public.sim_scenario_reviews (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null references public.sim_template_versions(id) on delete restrict,
  stage text not null check (stage in ('automated_validation', 'expert_review', 'publication', 'retirement')),
  outcome text not null check (outcome in ('passed', 'failed', 'approved', 'changes_requested', 'published', 'retired')),
  actor_kind text not null check (actor_kind in ('automation', 'human')),
  actor text not null check (char_length(actor) between 1 and 200),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_qualification text check (actor_qualification is null or char_length(actor_qualification) <= 500),
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  created_at timestamptz not null default now(),
  -- Approval, publication and retirement are deliberate human actions.
  constraint sim_scenario_reviews_human_decisions check (
    outcome not in ('approved', 'published', 'retired') or actor_kind = 'human'
  ),
  constraint sim_scenario_reviews_stage_outcome check (
    (stage = 'automated_validation' and outcome in ('passed', 'failed'))
    or (stage = 'expert_review' and outcome in ('approved', 'changes_requested'))
    or (stage = 'publication' and outcome = 'published')
    or (stage = 'retirement' and outcome = 'retired')
  ),
  constraint sim_scenario_reviews_expert_qualified check (
    stage <> 'expert_review' or outcome <> 'approved'
    or (actor_qualification is not null and char_length(btrim(actor_qualification)) > 0)
  )
);

create index if not exists idx_sim_scenario_reviews_version
  on public.sim_scenario_reviews(template_version_id, created_at);

create or replace function public.sim_scenario_reviews_append_only()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'scenario review records are append-only';
end $$;

drop trigger if exists sim_scenario_reviews_immutable on public.sim_scenario_reviews;
create trigger sim_scenario_reviews_immutable
  before update or delete on public.sim_scenario_reviews
  for each row execute function public.sim_scenario_reviews_append_only();

alter table public.sim_scenario_reviews enable row level security;
alter table public.sim_scenario_reviews force row level security;
-- No client policies: written and read by the service role (admin tooling).

-- ---------------------------------------------------------------------------
-- Validation status on template versions
-- ---------------------------------------------------------------------------
alter table public.sim_template_versions
  add column if not exists validation_status text not null default 'draft';

alter table public.sim_template_versions
  drop constraint if exists sim_template_versions_validation_status_check;
alter table public.sim_template_versions
  add constraint sim_template_versions_validation_status_check check (validation_status in (
    'draft', 'automated_validation', 'expert_review', 'approved', 'published', 'retired'
  ));

-- 019's guard froze every column of a published version, which would also
-- freeze validation_status. Content stays immutable; only the lifecycle
-- column may move. It also returned NEW on DELETE (NULL), which silently
-- skipped deletes of draft versions; it now returns OLD so the delete runs.
create or replace function public.sim_template_version_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.published_at is not null then
      raise exception 'published simulation template versions are immutable';
    end if;
    return old;
  end if;
  if old.published_at is not null
     and (to_jsonb(new) - 'validation_status') is distinct from (to_jsonb(old) - 'validation_status') then
    raise exception 'published simulation template versions are immutable';
  end if;
  return new;
end $$;

create or replace function public.sim_template_versions_validation_guard()
returns trigger language plpgsql set search_path = public as $$
declare
  allowed text[];
  latest record;
begin
  if new.validation_status is not distinct from old.validation_status then
    return new;
  end if;

  allowed := case old.validation_status
    when 'draft' then array['automated_validation', 'retired']
    when 'automated_validation' then array['expert_review', 'draft', 'retired']
    when 'expert_review' then array['approved', 'draft', 'retired']
    when 'approved' then array['published', 'draft', 'retired']
    when 'published' then array['retired']
    else array[]::text[]
  end;
  if not (new.validation_status = any(allowed)) then
    raise exception 'scenario version cannot move from % to %', old.validation_status, new.validation_status;
  end if;

  if new.validation_status = 'expert_review' then
    select * into latest from public.sim_scenario_reviews
      where template_version_id = new.id and stage = 'automated_validation'
      order by created_at desc limit 1;
    if latest is null or latest.outcome <> 'passed' or latest.actor_kind <> 'automation' then
      raise exception 'expert review needs a passing automated validation record';
    end if;
  elsif new.validation_status = 'approved' then
    select * into latest from public.sim_scenario_reviews
      where template_version_id = new.id and stage = 'expert_review'
      order by created_at desc limit 1;
    if latest is null or latest.outcome <> 'approved' or latest.actor_kind <> 'human' then
      raise exception 'approval needs a human expert review record';
    end if;
    if latest.actor_user_id is not null and latest.actor_user_id = new.created_by then
      raise exception 'the author cannot approve their own scenario version';
    end if;
  elsif new.validation_status = 'published' then
    select * into latest from public.sim_scenario_reviews
      where template_version_id = new.id and stage = 'publication'
      order by created_at desc limit 1;
    if latest is null or latest.actor_kind <> 'human' then
      raise exception 'publication needs its own human publication record';
    end if;
  elsif new.validation_status = 'retired' then
    select * into latest from public.sim_scenario_reviews
      where template_version_id = new.id and stage = 'retirement'
      order by created_at desc limit 1;
    if latest is null then
      raise exception 'retirement needs a retirement record';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists sim_template_versions_validation on public.sim_template_versions;
create trigger sim_template_versions_validation
  before update of validation_status on public.sim_template_versions
  for each row execute function public.sim_template_versions_validation_guard();

-- ---------------------------------------------------------------------------
-- Employer role intake
-- ---------------------------------------------------------------------------
create table if not exists public.employer_role_intakes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  -- Idempotency-Key from the client; a retried POST returns the same row.
  client_request_id text check (client_request_id is null or char_length(client_request_id) between 8 and 80),
  title text not null check (char_length(title) between 1 and 120),
  role_family text not null check (char_length(role_family) between 1 and 40),
  -- The validated intake (src/lib/employer/intake.ts roleIntakeSchema).
  -- job_description inside it is untrusted text, never instructions.
  intake jsonb not null check (jsonb_typeof(intake) = 'object'),
  screening jsonb not null default '[]'::jsonb check (jsonb_typeof(screening) = 'array'),
  recommended jsonb not null default '[]'::jsonb check (jsonb_typeof(recommended) = 'array'),
  selected_template_version_id uuid references public.sim_template_versions(id) on delete restrict,
  -- Set when the first invitation is issued. After that nothing here changes.
  frozen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_employer_role_intakes_org
  on public.employer_role_intakes(organization_id, created_at desc);
create unique index if not exists uq_employer_role_intakes_request
  on public.employer_role_intakes(organization_id, client_request_id)
  where client_request_id is not null;

create or replace function public.employer_role_intakes_freeze()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.frozen_at is not null then
      raise exception 'a role intake with issued invitations cannot be deleted';
    end if;
    return old;
  end if;
  if old.frozen_at is not null
     and ((to_jsonb(new) - 'updated_at') is distinct from (to_jsonb(old) - 'updated_at')) then
    raise exception 'a role intake is frozen once invitations are issued';
  end if;
  return new;
end $$;

drop trigger if exists employer_role_intakes_frozen on public.employer_role_intakes;
create trigger employer_role_intakes_frozen
  before update or delete on public.employer_role_intakes
  for each row execute function public.employer_role_intakes_freeze();

drop trigger if exists set_updated_at_employer_role_intakes on public.employer_role_intakes;
create trigger set_updated_at_employer_role_intakes
  before update on public.employer_role_intakes
  for each row execute function public.set_updated_at();

alter table public.employer_role_intakes enable row level security;
alter table public.employer_role_intakes force row level security;

drop policy if exists employer_role_intakes_member_read on public.employer_role_intakes;
create policy employer_role_intakes_member_read on public.employer_role_intakes
  for select to authenticated
  using (public.is_organization_member(organization_id));
-- Writes go through the API with the service role.

-- ---------------------------------------------------------------------------
-- Requests for roles Fydell cannot assess yet (product prioritization)
-- ---------------------------------------------------------------------------
create table if not exists public.role_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  intake_id uuid references public.employer_role_intakes(id) on delete set null,
  role_family text not null check (char_length(role_family) between 1 and 40),
  title text not null check (char_length(title) between 1 and 120),
  reason text not null check (reason in ('family_unavailable', 'custom_family', 'stack_unsupported')),
  detail text not null default '' check (char_length(detail) <= 2000),
  status text not null default 'open' check (status in ('open', 'planned', 'declined', 'fulfilled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_role_requests_org on public.role_requests(organization_id, created_at desc);
create index if not exists idx_role_requests_family on public.role_requests(role_family, status);

drop trigger if exists set_updated_at_role_requests on public.role_requests;
create trigger set_updated_at_role_requests
  before update on public.role_requests
  for each row execute function public.set_updated_at();

alter table public.role_requests enable row level security;
alter table public.role_requests force row level security;

drop policy if exists role_requests_member_read on public.role_requests;
create policy role_requests_member_read on public.role_requests
  for select to authenticated
  using (public.is_organization_member(organization_id));
