-- 015_fde_evidence_math.sql
-- Checkpoint C — Evidence mathematics. Atoms of behavioral evidence, versioned
-- evaluation runs/case results, receipt version history + access log, candidate
-- context notes, evidence disputes, product feedback, and technical incidents.
--
-- No overall candidate score is stored anywhere — evidence is aggregated per
-- dimension only (see src/lib/fde/evidence/aggregate.ts).

-- Evidence atoms: the smallest unit of behavioral evidence, always traceable
-- back to a recorded event and/or artifact. Never derived from activity volume
-- (keystroke counts, time-in-file, etc) — see src/lib/fde/evidence/atoms.ts.
create table if not exists public.evidence_atoms (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.relay_sessions(id) on delete cascade,
  event_id uuid references public.relay_execution_events(id) on delete set null,
    10|  artifact_id uuid references public.fde_artifacts(id) on delete set null,
  dimension_id text not null,
  direction text not null
    check (direction in ('supporting', 'counter', 'mixed', 'neutral')),
  magnitude real not null check (magnitude >= 0 and magnitude <= 1),
  relevance real not null check (relevance >= 0 and relevance <= 1),
  reliability real not null check (reliability >= 0 and reliability <= 1),
  independence_group text not null,
  source_kind text not null,
  summary text not null,
    20|  event_refs jsonb not null default '[]'::jsonb,
  artifact_refs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Evaluation runs: one row per (re)run of the evidence math over a session,
-- versioned so reprocessing never silently changes past results in place.
create table if not exists public.evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.relay_sessions(id) on delete cascade,
    30|  policy_version text not null,
  formula_version text not null,
  metrics jsonb not null default '{}'::jsonb,
  status text not null default 'completed'
    check (status in ('queued', 'running', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

-- Per-case results within an evaluation run (golden-set style case grading).
create table if not exists public.evaluation_case_results (
    40|  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.evaluation_runs(id) on delete cascade,
  case_id text not null,
  expected jsonb,
  predicted jsonb,
  severity text,
  ok boolean not null default false,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

    50|-- Immutable receipt version history. A corrected receipt gets a new version
-- row rather than mutating history away.
create table if not exists public.receipt_versions (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.work_receipts(id) on delete cascade,
  version int not null,
  content jsonb not null default '{}'::jsonb,
  policy_version text,
  formula_version text,
  created_at timestamptz not null default now(),
    60|  unique (receipt_id, version)
);

-- Who looked at / acted on a receipt, and when.
create table if not exists public.receipt_access_events (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.work_receipts(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  action text not null,
  created_at timestamptz not null default now()
);
    70|
-- Candidate-authored context notes attached to their own session (their side
-- of the record — distinct from generated findings).
create table if not exists public.candidate_context_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.relay_sessions(id) on delete cascade,
  author_user_id uuid references auth.users(id),
  body text not null,
  created_at timestamptz not null default now()
);

    80|-- Disputes raised against a finding or a specific evidence atom.
create table if not exists public.evidence_disputes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.relay_sessions(id) on delete cascade,
  finding_id uuid references public.fde_evidence_findings(id) on delete set null,
  atom_id uuid references public.evidence_atoms(id) on delete set null,
  raised_by uuid references auth.users(id),
  reason text not null,
  status text not null default 'open'
    90|    check (status in ('open', 'under_review', 'resolved', 'rejected')),
  resolution text,
  created_at timestamptz not null default now()
);

-- General product feedback (not tied to a session).
create table if not exists public.product_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  surface text not null,
   100|  rating int check (rating >= 1 and rating <= 5),
  body text,
  created_at timestamptz not null default now()
);

-- Technical incidents encountered during a session (infra/runtime failures,
-- not candidate behavior).
create table if not exists public.technical_incidents (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.relay_sessions(id) on delete cascade,
   110|  kind text not null,
  detail jsonb not null default '{}'::jsonb,
  status text not null default 'open'
    check (status in ('open', 'investigating', 'resolved')),
  created_at timestamptz not null default now()
);

-- Indexes -------------------------------------------------------------------

create index if not exists evidence_atoms_session_idx on public.evidence_atoms (session_id);
   120|create index if not exists evaluation_runs_session_idx on public.evaluation_runs (session_id);
create index if not exists evaluation_case_results_run_idx on public.evaluation_case_results (run_id);
create index if not exists receipt_versions_receipt_idx on public.receipt_versions (receipt_id);
create index if not exists receipt_access_events_receipt_idx on public.receipt_access_events (receipt_id);
create index if not exists candidate_context_notes_session_idx on public.candidate_context_notes (session_id);
create index if not exists evidence_disputes_session_idx on public.evidence_disputes (session_id);
create index if not exists technical_incidents_session_idx on public.technical_incidents (session_id);
create index if not exists product_feedback_user_idx on public.product_feedback (user_id);

   130|-- RLS helpers ----------------------------------------------------------------

-- A session is visible to its own candidate or to any active member of the
-- mission's organization (employer side). Mirrors relay_sessions_access from
-- migration 011, reused here so every session-scoped evidence table shares
-- one definition of "who can see this session's evidence".
create or replace function public.session_visible(p_session_id uuid)
returns boolean
language sql
stable
   140|security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.relay_sessions s
    join public.fde_missions m on m.id = s.mission_id
    where s.id = p_session_id
      and (s.fde_user_id = auth.uid() or public.is_org_member(m.organization_id))
  );
   150|$$;

-- Same idea, scoped through a receipt instead of a session directly.
create or replace function public.receipt_visible(p_receipt_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
   160|  select exists (
    select 1
    from public.work_receipts r
    join public.relay_sessions s on s.id = r.session_id
    join public.fde_missions m on m.id = s.mission_id
    where r.id = p_receipt_id
      and (r.fde_user_id = auth.uid() or public.is_org_member(m.organization_id))
  );
$$;

   170|-- RLS -------------------------------------------------------------------------
-- Candidates see their own session's rows; employers see rows for sessions
-- under their org's missions. No insert/update/delete policy is defined for
-- any of these tables — all writes go through the server's admin (service
-- role) client, which bypasses RLS by design (see src/lib/fde/relay-session.ts,
-- src/lib/fde/receipts.ts). Client-side writes are denied by default.

alter table public.evidence_atoms enable row level security;
alter table public.evaluation_runs enable row level security;
   180|alter table public.evaluation_case_results enable row level security;
alter table public.receipt_versions enable row level security;
alter table public.receipt_access_events enable row level security;
alter table public.candidate_context_notes enable row level security;
alter table public.evidence_disputes enable row level security;
alter table public.product_feedback enable row level security;
alter table public.technical_incidents enable row level security;

drop policy if exists evidence_atoms_read on public.evidence_atoms;
   190|create policy evidence_atoms_read on public.evidence_atoms
  for select using (public.session_visible(session_id));

drop policy if exists evaluation_runs_read on public.evaluation_runs;
create policy evaluation_runs_read on public.evaluation_runs
  for select using (public.session_visible(session_id));

drop policy if exists evaluation_case_results_read on public.evaluation_case_results;
create policy evaluation_case_results_read on public.evaluation_case_results
   200|  for select using (
    exists (
      select 1 from public.evaluation_runs r
      where r.id = run_id and public.session_visible(r.session_id)
    )
  );

drop policy if exists receipt_versions_read on public.receipt_versions;
create policy receipt_versions_read on public.receipt_versions
  for select using (public.receipt_visible(receipt_id));
   210|
drop policy if exists receipt_access_events_read on public.receipt_access_events;
create policy receipt_access_events_read on public.receipt_access_events
  for select using (public.receipt_visible(receipt_id));

drop policy if exists candidate_context_notes_read on public.candidate_context_notes;
create policy candidate_context_notes_read on public.candidate_context_notes
  for select using (public.session_visible(session_id));

   220|drop policy if exists evidence_disputes_read on public.evidence_disputes;
create policy evidence_disputes_read on public.evidence_disputes
  for select using (public.session_visible(session_id));

drop policy if exists technical_incidents_read on public.technical_incidents;
create policy technical_incidents_read on public.technical_incidents
  for select using (public.session_visible(session_id));

-- Product feedback isn't session-scoped — the author can read their own.
   230|drop policy if exists product_feedback_own on public.product_feedback;
create policy product_feedback_own on public.product_feedback
  for select using (user_id = auth.uid());

-- Rollback: drop the tables above (cascade) and drop functions
-- public.session_visible(uuid), public.receipt_visible(uuid).
-- Forward repair: reprocessing must insert a new evaluation_runs /
-- receipt_versions row rather than mutating an existing one.
