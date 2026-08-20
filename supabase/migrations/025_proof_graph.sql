-- 025_proof_graph.sql
--
-- Isolated Solutions Engineer proof graph. Prefix: proof_.
-- Does not alter production simulation, scoring, or sim_session_events paths.
-- Writes are service-role only. Client policies are SELECT-scoped or denied.

-- ---------------------------------------------------------------------------
-- Organizations: commercial fields used by employer proof surfaces
-- ---------------------------------------------------------------------------
alter table public.organizations add column if not exists logo_url text;
alter table public.organizations add column if not exists commercial_model text;
alter table public.organizations add column if not exists pricing_terms text;
alter table public.organizations add column if not exists contract_reference text;

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create table if not exists public.proof_roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proof_role_calibrations (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null unique references public.proof_roles(id) on delete cascade,
  competencies jsonb not null default '[]'::jsonb,
  interview_focus jsonb not null default '[]'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proof_simulation_versions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.proof_roles(id) on delete restrict,
  version_key text not null unique,
  title text not null,
  scenario jsonb not null default '{}'::jsonb,
  rubric_version text not null default 'adaptability_v1',
  prompt_version text not null default 'evidence_extract_v1',
  engine_version text not null default 'proof_v1',
  seed text,
  status text not null default 'published'
    check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proof_changed_facts (
  id uuid primary key default gen_random_uuid(),
  simulation_version_id uuid not null references public.proof_simulation_versions(id) on delete cascade,
  fact_key text not null,
  stakeholder text not null,
  body text not null,
  materiality text not null default 'secondary'
    check (materiality in ('critical', 'secondary')),
  trigger_rule text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (simulation_version_id, fact_key)
);

create index if not exists idx_proof_changed_facts_version
  on public.proof_changed_facts (simulation_version_id, sort_order);

-- ---------------------------------------------------------------------------
-- Invitations + runs
-- ---------------------------------------------------------------------------
create table if not exists public.proof_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role_id uuid not null references public.proof_roles(id) on delete restrict,
  simulation_version_id uuid not null references public.proof_simulation_versions(id) on delete restrict,
  email text not null,
  token text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'expired', 'revoked')),
  candidate_user_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_proof_invitations_org
  on public.proof_invitations (organization_id, created_at desc);
create index if not exists idx_proof_invitations_email
  on public.proof_invitations (lower(email));
create index if not exists idx_proof_invitations_candidate
  on public.proof_invitations (candidate_user_id);

create table if not exists public.proof_runs (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null unique references public.proof_invitations(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  candidate_user_id uuid references auth.users(id) on delete set null,
  simulation_version_id uuid not null references public.proof_simulation_versions(id) on delete restrict,
  rubric_version text not null,
  prompt_version text not null,
  stage text not null default 'DISCOVERY'
    check (stage in (
      'DISCOVERY',
      'INVESTIGATION',
      'PRELIMINARY_RECOMMENDATION',
      'AUTH_CONSTRAINT',
      'REASSESSMENT',
      'STAKEHOLDER_CONFLICT',
      'CUSTOMER_PRESSURE',
      'FINAL_SUBMITTED',
      'DEFENSE',
      'COMPLETE'
    )),
  status text not null default 'in_progress'
    check (status in (
      'in_progress',
      'awaiting_defense',
      'awaiting_review',
      'ready',
      'hired',
      'expired',
      'abandoned'
    )),
  shortlisted boolean not null default false,
  released_facts text[] not null default '{}',
  world_state jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_proof_runs_org
  on public.proof_runs (organization_id, created_at desc);
create index if not exists idx_proof_runs_candidate
  on public.proof_runs (candidate_user_id);

-- ---------------------------------------------------------------------------
-- Event ledger (sequence assigned by trigger; never trust the client)
-- ---------------------------------------------------------------------------
create table if not exists public.proof_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.proof_runs(id) on delete cascade,
  sequence integer not null,
  event_type text not null,
  event_version integer not null default 1,
  source text not null
    check (source in ('WORLD', 'CANDIDATE', 'TELEMETRY', 'SYSTEM')),
  actor_type text not null,
  actor_id text,
  stage_id text,
  occurred_at timestamptz,
  recorded_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  unique (run_id, sequence)
);

create index if not exists idx_proof_events_run
  on public.proof_events (run_id, sequence);

create or replace function public.proof_events_assign_sequence()
returns trigger
language plpgsql
as $$
begin
  -- Serialize per run. Client-supplied sequence is discarded.
  perform 1 from public.proof_runs where id = new.run_id for update;
  if not found then
    raise exception 'proof_events: run % not found', new.run_id;
  end if;
  select coalesce(max(e.sequence), 0) + 1
    into new.sequence
    from public.proof_events e
    where e.run_id = new.run_id;
  if new.recorded_at is null then
    new.recorded_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists proof_events_assign_sequence on public.proof_events;
create trigger proof_events_assign_sequence
  before insert on public.proof_events
  for each row execute function public.proof_events_assign_sequence();

-- ---------------------------------------------------------------------------
-- Artifacts + messages
-- ---------------------------------------------------------------------------
create table if not exists public.proof_artifacts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.proof_runs(id) on delete cascade,
  diagnosis text not null default '',
  recommendation text not null default '',
  customer_message text not null default '',
  internal_note text not null default '',
  assumptions text not null default '',
  limitations text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proof_artifact_versions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.proof_runs(id) on delete cascade,
  sequence_at integer,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_proof_artifact_versions_run
  on public.proof_artifact_versions (run_id, created_at);

create table if not exists public.proof_messages (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.proof_runs(id) on delete cascade,
  agent_id text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_proof_messages_run
  on public.proof_messages (run_id, created_at);

-- ---------------------------------------------------------------------------
-- Analysis jobs (no client RLS)
-- ---------------------------------------------------------------------------
create table if not exists public.proof_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.proof_runs(id) on delete cascade,
  job_type text not null
    check (job_type in (
      'EXTRACT_EVIDENCE_INITIAL',
      'GENERATE_DEFENSE',
      'EXTRACT_EVIDENCE_FINAL',
      'GENERATE_DECISION_BRIEF'
    )),
  idempotency_key text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed')),
  attempts integer not null default 0,
  last_error text,
  locked_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  result jsonb,
  result_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_type, idempotency_key)
);

create index if not exists idx_proof_analysis_jobs_run
  on public.proof_analysis_jobs (run_id, created_at);
create index if not exists idx_proof_analysis_jobs_poll
  on public.proof_analysis_jobs (status, created_at)
  where status in ('queued', 'failed');

-- ---------------------------------------------------------------------------
-- Evidence claims
-- ---------------------------------------------------------------------------
create table if not exists public.proof_evidence_claims (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.proof_runs(id) on delete cascade,
  pass text not null check (pass in ('A', 'B')),
  claim text not null,
  competency text not null,
  -- Two independent axes. `direction` is which way the evidence points;
  -- `confidence` is how strongly the work supports that reading. Folding the
  -- two together loses the difference between "weak evidence of adaptation"
  -- and "clear evidence of a problem". INSUFFICIENT_EVIDENCE is a real
  -- outcome, not a low-confidence STRENGTH.
  direction text not null
    check (direction in ('STRENGTH', 'CONCERN', 'INSUFFICIENT_EVIDENCE')),
  confidence text not null
    check (confidence in ('HIGH', 'MODERATE', 'LOW')),
  -- An INSUFFICIENT_EVIDENCE claim must not also assert high confidence.
  constraint proof_evidence_claims_insufficient_confidence check (
    direction <> 'INSUFFICIENT_EVIDENCE' or confidence <> 'HIGH'
  ),
  rubric_version text not null,
  prompt_version text not null,
  model_version text not null,
  review_status text not null default 'GENERATED'
    check (review_status in (
      'GENERATED',
      'REVIEW_REQUIRED',
      'REVIEWED',
      'APPROVED',
      'REJECTED',
      'PUBLISHED'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_proof_evidence_claims_run
  on public.proof_evidence_claims (run_id, pass);

create table if not exists public.proof_claim_events (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.proof_evidence_claims(id) on delete cascade,
  event_id uuid not null references public.proof_events(id) on delete cascade,
  relation text not null check (relation in ('supporting', 'counterevidence')),
  unique (claim_id, event_id, relation)
);

create index if not exists idx_proof_claim_events_claim
  on public.proof_claim_events (claim_id);

create table if not exists public.proof_claim_reviews (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.proof_evidence_claims(id) on delete cascade,
  reviewer text not null,
  action text not null,
  reason text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_proof_claim_reviews_claim
  on public.proof_claim_reviews (claim_id, created_at);

-- ---------------------------------------------------------------------------
-- Oral defense
-- ---------------------------------------------------------------------------
create table if not exists public.proof_defense_sessions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.proof_runs(id) on delete cascade,
  status text not null default 'open'
    check (status in ('open', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proof_defense_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.proof_defense_sessions(id) on delete cascade,
  prompt text not null,
  target text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_proof_defense_questions_session
  on public.proof_defense_questions (session_id, sort_order);

create table if not exists public.proof_defense_responses (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null unique references public.proof_defense_questions(id) on delete cascade,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Employer brief + interview + outcomes
-- ---------------------------------------------------------------------------
create table if not exists public.proof_decision_briefs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.proof_runs(id) on delete cascade,
  recommendation text not null
    check (recommendation in (
      'STRONG_INTERVIEW',
      'INTERVIEW',
      'HOLD',
      'INSUFFICIENT_EVIDENCE'
    )),
  why text not null default '',
  strengths jsonb not null default '[]'::jsonb,
  concerns jsonb not null default '[]'::jsonb,
  probes jsonb not null default '[]'::jsonb,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proof_interview_plans (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.proof_runs(id) on delete cascade,
  confirm jsonb not null default '[]'::jsonb,
  investigate jsonb not null default '[]'::jsonb,
  challenge jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proof_interview_feedback (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.proof_runs(id) on delete cascade,
  interviewed boolean,
  advanced boolean,
  probes_used boolean,
  evidence_confirmed text
    check (evidence_confirmed in ('confirmed', 'contradicted', 'unclear')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_proof_interview_feedback_run
  on public.proof_interview_feedback (run_id, created_at);

create table if not exists public.proof_outcomes (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.proof_runs(id) on delete cascade,
  offer_made boolean,
  offer_accepted boolean,
  hired boolean,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proof_post_hire_outcomes (
  id uuid primary key default gen_random_uuid(),
  outcome_id uuid not null references public.proof_outcomes(id) on delete cascade,
  days_since_start integer,
  manager_assessment text,
  ramp_status text,
  retention_status text,
  qualitative_feedback text,
  created_at timestamptz not null default now()
);

create index if not exists idx_proof_post_hire_outcomes_outcome
  on public.proof_post_hire_outcomes (outcome_id);

-- ---------------------------------------------------------------------------
-- Audit + product events (no client RLS)
-- ---------------------------------------------------------------------------
create table if not exists public.proof_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_proof_audit_logs_created
  on public.proof_audit_logs (created_at desc);

create table if not exists public.proof_product_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  run_id uuid references public.proof_runs(id) on delete set null,
  name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_proof_product_events_org
  on public.proof_product_events (organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'proof_roles',
    'proof_role_calibrations',
    'proof_simulation_versions',
    'proof_invitations',
    'proof_runs',
    'proof_artifacts',
    'proof_analysis_jobs',
    'proof_evidence_claims',
    'proof_defense_sessions',
    'proof_defense_responses',
    'proof_decision_briefs',
    'proof_interview_plans',
    'proof_outcomes'
  ] loop
    execute format('drop trigger if exists set_updated_at_%s on public.%s', t, t);
    execute format(
      'create trigger set_updated_at_%s before update on public.%s for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Seed: Solutions Engineer northstar
-- ---------------------------------------------------------------------------
insert into public.proof_roles (id, slug, title, description)
values (
  '00000000-0000-4000-a000-000000000001',
  'solutions-engineer',
  'Solutions Engineer',
  'Discover requirements, evaluate technical fit, and communicate tradeoffs under changing constraints.'
)
on conflict (id) do nothing;

insert into public.proof_role_calibrations (role_id, competencies, interview_focus, notes)
values (
  '00000000-0000-4000-a000-000000000001',
  '["discovery","technical_fit","stakeholder_communication","adaptability"]'::jsonb,
  '["auth_constraint_handling","scope_discipline","honest_timeline"]'::jsonb,
  'Sprint-1 hardcoded SE calibration for se-northstar-v1.'
)
on conflict (role_id) do nothing;

insert into public.proof_simulation_versions (
  id, role_id, version_key, title, rubric_version, prompt_version, engine_version, seed, status
)
values (
  '00000000-0000-4000-a000-000000000010',
  '00000000-0000-4000-a000-000000000001',
  'se-northstar-v1',
  'Solutions Engineer northstar',
  'adaptability_v1',
  'evidence_extract_v1',
  'proof_v1',
  'se-northstar-v1',
  'published'
)
on conflict (id) do nothing;

insert into public.proof_changed_facts (
  simulation_version_id, fact_key, stakeholder, body, materiality, trigger_rule, sort_order
)
values
  (
    '00000000-0000-4000-a000-000000000010',
    'AUTH_001',
    'engineering',
    'The endpoint you planned to use will not support their authentication method.',
    'critical',
    'Release after preliminary recommendation is committed.',
    1
  ),
  (
    '00000000-0000-4000-a000-000000000010',
    'SALES_001',
    'sales',
    'I already promised the customer this would work Friday. Don''t complicate things.',
    'secondary',
    'Release after AUTH_001 is acknowledged.',
    2
  ),
  (
    '00000000-0000-4000-a000-000000000010',
    'CUSTOMER_001',
    'customer',
    'If Friday doesn''t work, we''re evaluating your competitor.',
    'secondary',
    'Release after SALES_001 is released.',
    3
  )
on conflict (simulation_version_id, fact_key) do nothing;

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------
create or replace function public.proof_run_visible(p_run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.proof_runs r
    where r.id = p_run_id
      and (
        public.is_platform_admin()
        or r.candidate_user_id = auth.uid()
        or public.is_organization_member(r.organization_id)
      )
  );
$$;

revoke all on function public.proof_run_visible(uuid) from public;
grant execute on function public.proof_run_visible(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table public.proof_roles enable row level security;
alter table public.proof_role_calibrations enable row level security;
alter table public.proof_simulation_versions enable row level security;
alter table public.proof_changed_facts enable row level security;
alter table public.proof_invitations enable row level security;
alter table public.proof_runs enable row level security;
alter table public.proof_events enable row level security;
alter table public.proof_artifacts enable row level security;
alter table public.proof_artifact_versions enable row level security;
alter table public.proof_messages enable row level security;
alter table public.proof_analysis_jobs enable row level security;
alter table public.proof_evidence_claims enable row level security;
alter table public.proof_claim_events enable row level security;
alter table public.proof_claim_reviews enable row level security;
alter table public.proof_defense_sessions enable row level security;
alter table public.proof_defense_questions enable row level security;
alter table public.proof_defense_responses enable row level security;
alter table public.proof_decision_briefs enable row level security;
alter table public.proof_interview_plans enable row level security;
alter table public.proof_interview_feedback enable row level security;
alter table public.proof_outcomes enable row level security;
alter table public.proof_post_hire_outcomes enable row level security;
alter table public.proof_audit_logs enable row level security;
alter table public.proof_product_events enable row level security;

-- Grants: no anon; authenticated SELECT where policies allow; service_role all.
do $$
declare t text;
begin
  foreach t in array array[
    'proof_roles',
    'proof_role_calibrations',
    'proof_simulation_versions',
    'proof_changed_facts',
    'proof_invitations',
    'proof_runs',
    'proof_events',
    'proof_artifacts',
    'proof_artifact_versions',
    'proof_messages',
    'proof_analysis_jobs',
    'proof_evidence_claims',
    'proof_claim_events',
    'proof_claim_reviews',
    'proof_defense_sessions',
    'proof_defense_questions',
    'proof_defense_responses',
    'proof_decision_briefs',
    'proof_interview_plans',
    'proof_interview_feedback',
    'proof_outcomes',
    'proof_post_hire_outcomes',
    'proof_audit_logs',
    'proof_product_events'
  ] loop
    execute format('revoke all on table public.%s from anon, authenticated, public', t);
    execute format('grant all on table public.%s to service_role', t);
  end loop;
end $$;

grant select on table public.proof_roles to authenticated;
grant select on table public.proof_role_calibrations to authenticated;
grant select on table public.proof_simulation_versions to authenticated;
grant select on table public.proof_changed_facts to authenticated;
grant select on table public.proof_invitations to authenticated;
grant select on table public.proof_runs to authenticated;
grant select on table public.proof_events to authenticated;
grant select on table public.proof_artifacts to authenticated;
grant select on table public.proof_artifact_versions to authenticated;
grant select on table public.proof_messages to authenticated;
grant select on table public.proof_evidence_claims to authenticated;
grant select on table public.proof_claim_events to authenticated;
grant select on table public.proof_defense_sessions to authenticated;
grant select on table public.proof_defense_questions to authenticated;
grant select on table public.proof_defense_responses to authenticated;
grant select on table public.proof_decision_briefs to authenticated;
grant select on table public.proof_interview_plans to authenticated;
grant select on table public.proof_interview_feedback to authenticated;
grant select on table public.proof_outcomes to authenticated;
grant select on table public.proof_post_hire_outcomes to authenticated;

-- Catalog: any authenticated reader (not tenant-scoped).
drop policy if exists proof_roles_select on public.proof_roles;
create policy proof_roles_select on public.proof_roles
  for select to authenticated using (true);

drop policy if exists proof_role_calibrations_select on public.proof_role_calibrations;
create policy proof_role_calibrations_select on public.proof_role_calibrations
  for select to authenticated using (true);

drop policy if exists proof_simulation_versions_select on public.proof_simulation_versions;
create policy proof_simulation_versions_select on public.proof_simulation_versions
  for select to authenticated using (true);

drop policy if exists proof_changed_facts_select on public.proof_changed_facts;
create policy proof_changed_facts_select on public.proof_changed_facts
  for select to authenticated using (true);

-- Invitations + runs: org members, owning candidate, platform admin.
drop policy if exists proof_invitations_select on public.proof_invitations;
create policy proof_invitations_select on public.proof_invitations
  for select to authenticated
  using (
    public.is_platform_admin()
    or candidate_user_id = auth.uid()
    or public.is_organization_member(organization_id)
  );

drop policy if exists proof_runs_select on public.proof_runs;
create policy proof_runs_select on public.proof_runs
  for select to authenticated
  using (
    public.is_platform_admin()
    or candidate_user_id = auth.uid()
    or public.is_organization_member(organization_id)
  );

drop policy if exists proof_events_select on public.proof_events;
create policy proof_events_select on public.proof_events
  for select to authenticated using (public.proof_run_visible(run_id));

drop policy if exists proof_artifacts_select on public.proof_artifacts;
create policy proof_artifacts_select on public.proof_artifacts
  for select to authenticated using (public.proof_run_visible(run_id));

drop policy if exists proof_artifact_versions_select on public.proof_artifact_versions;
create policy proof_artifact_versions_select on public.proof_artifact_versions
  for select to authenticated using (public.proof_run_visible(run_id));

drop policy if exists proof_messages_select on public.proof_messages;
create policy proof_messages_select on public.proof_messages
  for select to authenticated using (public.proof_run_visible(run_id));

-- Claims: a machine-generated claim is not a finding until a human publishes it.
-- Employers see PUBLISHED claims for their own runs; nobody else sees drafts
-- except platform admin. Candidates deliberately cannot read claims about
-- themselves here: candidate-facing feedback is a separate, later surface, and
-- an unreviewed CONCERN must never reach the person it describes.
drop policy if exists proof_evidence_claims_select on public.proof_evidence_claims;
create policy proof_evidence_claims_select on public.proof_evidence_claims
  for select to authenticated
  using (
    public.is_platform_admin()
    or (
      review_status = 'PUBLISHED'
      and exists (
        select 1 from public.proof_runs r
        where r.id = run_id
          and public.is_organization_member(r.organization_id)
      )
    )
  );

-- Provenance links inherit the claim's visibility, so supporting and counter
-- event IDs cannot be read for a claim the reader cannot read.
drop policy if exists proof_claim_events_select on public.proof_claim_events;
create policy proof_claim_events_select on public.proof_claim_events
  for select to authenticated
  using (
    exists (
      select 1 from public.proof_evidence_claims c
      where c.id = claim_id
        and (
          public.is_platform_admin()
          or (
            c.review_status = 'PUBLISHED'
            and exists (
              select 1 from public.proof_runs r
              where r.id = c.run_id
                and public.is_organization_member(r.organization_id)
            )
          )
        )
    )
  );

drop policy if exists proof_defense_sessions_select on public.proof_defense_sessions;
create policy proof_defense_sessions_select on public.proof_defense_sessions
  for select to authenticated using (public.proof_run_visible(run_id));

drop policy if exists proof_defense_questions_select on public.proof_defense_questions;
create policy proof_defense_questions_select on public.proof_defense_questions
  for select to authenticated
  using (
    exists (
      select 1 from public.proof_defense_sessions s
      where s.id = session_id and public.proof_run_visible(s.run_id)
    )
  );

drop policy if exists proof_defense_responses_select on public.proof_defense_responses;
create policy proof_defense_responses_select on public.proof_defense_responses
  for select to authenticated
  using (
    exists (
      select 1
      from public.proof_defense_questions q
      join public.proof_defense_sessions s on s.id = q.session_id
      where q.id = question_id and public.proof_run_visible(s.run_id)
    )
  );

-- Briefs: employers see only published rows; platform admin sees all.
drop policy if exists proof_decision_briefs_select on public.proof_decision_briefs;
create policy proof_decision_briefs_select on public.proof_decision_briefs
  for select to authenticated
  using (
    public.is_platform_admin()
    or (
      published = true
      and exists (
        select 1 from public.proof_runs r
        where r.id = run_id
          and public.is_organization_member(r.organization_id)
      )
    )
  );

drop policy if exists proof_interview_plans_select on public.proof_interview_plans;
create policy proof_interview_plans_select on public.proof_interview_plans
  for select to authenticated using (public.proof_run_visible(run_id));

drop policy if exists proof_interview_feedback_select on public.proof_interview_feedback;
create policy proof_interview_feedback_select on public.proof_interview_feedback
  for select to authenticated using (public.proof_run_visible(run_id));

drop policy if exists proof_outcomes_select on public.proof_outcomes;
create policy proof_outcomes_select on public.proof_outcomes
  for select to authenticated using (public.proof_run_visible(run_id));

drop policy if exists proof_post_hire_outcomes_select on public.proof_post_hire_outcomes;
create policy proof_post_hire_outcomes_select on public.proof_post_hire_outcomes
  for select to authenticated
  using (
    exists (
      select 1 from public.proof_outcomes o
      where o.id = outcome_id and public.proof_run_visible(o.run_id)
    )
  );

-- No client access: jobs, reviews, audit, product events.
drop policy if exists proof_analysis_jobs_no_client on public.proof_analysis_jobs;
create policy proof_analysis_jobs_no_client on public.proof_analysis_jobs
  for all using (false) with check (false);

drop policy if exists proof_claim_reviews_no_client on public.proof_claim_reviews;
create policy proof_claim_reviews_no_client on public.proof_claim_reviews
  for all using (false) with check (false);

drop policy if exists proof_audit_logs_no_client on public.proof_audit_logs;
create policy proof_audit_logs_no_client on public.proof_audit_logs
  for all using (false) with check (false);

drop policy if exists proof_product_events_no_client on public.proof_product_events;
create policy proof_product_events_no_client on public.proof_product_events
  for all using (false) with check (false);

comment on table public.proof_runs is
  'Isolated Solutions Engineer proof graph runs. Sequence assignment for events is server-side only.';
comment on table public.proof_events is
  'Append-only proof event ledger. sequence is assigned by proof_events_assign_sequence; client values are ignored.';
comment on table public.proof_analysis_jobs is
  'Idempotent analysis outbox. Unique (job_type, idempotency_key). No client RLS.';
comment on function public.proof_events_assign_sequence() is
  'BEFORE INSERT: lock proof_runs row and set sequence = max(sequence)+1 for the run.';
