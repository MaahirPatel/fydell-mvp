-- 034: engineering test runs bound to exact candidate snapshots.
--
-- DESK-12 / DESK-13 / RUN-04..08 / DATA-04 / UP-05. One row per run of a
-- scenario's trusted tests inside an isolated execution provider:
--   practice   : candidate "Run tests" during the attempt
--   evaluation : server-side run of provided + hidden tests against the
--                immutable submission, feeding the employer report
-- Every row pins the candidate snapshot hash, scenario/suite version and the
-- execution environment version. Rows are written only by server code with
-- the service role (RLS enabled, no policies); API routes enforce ownership.
-- Additive only.

create table if not exists public.sim_test_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sim_sessions(id) on delete cascade,
  kind text not null check (kind in ('practice', 'evaluation')),
  -- Client-supplied idempotency key for practice runs (double click / retry).
  client_run_id text check (client_run_id is null or char_length(client_run_id) between 8 and 80),
  -- Evaluation runs are pinned to the accepted submission.
  submission_id uuid references public.sim_submissions(id) on delete cascade,
  candidate_snapshot_hash text not null check (candidate_snapshot_hash ~ '^[a-f0-9]{64}$'),
  scenario_id text not null,
  scenario_version text not null,
  suite_version text not null,
  environment_version text not null default '',
  provider text not null default '',
  status text not null check (status in (
    'running', 'completed', 'indeterminate', 'infrastructure_error', 'not_configured'
  )),
  status_reason text check (status_reason is null or char_length(status_reason) <= 1000),
  classification text,
  summary jsonb not null default '{}'::jsonb,
  tests jsonb not null default '[]'::jsonb,
  groups jsonb not null default '[]'::jsonb,
  integrity jsonb not null default '{}'::jsonb,
  restored_trusted jsonb not null default '[]'::jsonb,
  ignored jsonb not null default '[]'::jsonb,
  output text not null default '' check (char_length(output) <= 70000),
  output_truncated boolean not null default false,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint sim_test_runs_evaluation_pinned check (kind <> 'evaluation' or submission_id is not null)
);

create index if not exists idx_sim_test_runs_session on public.sim_test_runs(session_id, created_at desc);

-- A retried practice request with the same client id returns the same run.
create unique index if not exists uq_sim_test_runs_practice_client
  on public.sim_test_runs(session_id, client_run_id)
  where kind = 'practice' and client_run_id is not null;

-- At most one live evaluation per submission snapshot and suite: retries
-- reuse it instead of creating duplicate results (RUN-07). Failed attempts
-- (infrastructure_error / not_configured) are excluded so a retry can run.
create unique index if not exists uq_sim_test_runs_evaluation
  on public.sim_test_runs(submission_id, candidate_snapshot_hash, suite_version)
  where kind = 'evaluation' and status in ('running', 'completed', 'indeterminate');

alter table public.sim_test_runs enable row level security;

-- Finished runs are evidence: immutable once they leave "running". Deletes
-- stay possible for the documented retention schedule (DATA-09) and cascade
-- with the session.
create or replace function public.sim_test_runs_guard()
returns trigger language plpgsql as $$
begin
  if old.status <> 'running' then
    raise exception 'finished test runs are immutable';
  end if;
  if new.session_id <> old.session_id
     or new.kind <> old.kind
     or new.candidate_snapshot_hash <> old.candidate_snapshot_hash
     or new.suite_version <> old.suite_version
     or new.submission_id is distinct from old.submission_id then
    raise exception 'test run identity fields are immutable';
  end if;
  return new;
end $$;

drop trigger if exists sim_test_runs_immutable on public.sim_test_runs;
create trigger sim_test_runs_immutable
  before update on public.sim_test_runs
  for each row execute function public.sim_test_runs_guard();
