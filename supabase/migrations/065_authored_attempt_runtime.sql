-- 065: Candidate runtime for employer-authored work samples.
--
-- Additive only. Three server-only tables:
--   eng_authored_workspaces   the candidate's working copy of the starter files
--   eng_public_test_runs      public-test runs requested by the candidate, which
--                             also enforce the per-attempt rate limit
--   eng_authored_evaluations  the full record of one evaluation run against the
--                             public and protected tests (append-only)
-- None of them has a client policy: every read and write goes through the app
-- server with the service role, so protected test names and output never reach
-- a browser by way of PostgREST.

create table if not exists public.eng_authored_workspaces (
  attempt_id uuid primary key references public.eng_attempts(id) on delete cascade,
  files jsonb not null default '[]'::jsonb
    check (jsonb_typeof(files) = 'array' and pg_column_size(files) <= 1048576),
  revision integer not null default 1 check (revision >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.eng_public_test_runs (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.eng_attempts(id) on delete cascade,
  purpose text not null default 'workspace' check (purpose in ('environment_check', 'workspace')),
  files_sha256 text not null check (files_sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'running'
    check (status in ('running', 'ran', 'timeout', 'infrastructure_error', 'runner_unavailable')),
  runner_name text,
  runner_label text,
  isolated boolean,
  command text,
  exit_code integer,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  tests jsonb not null default '[]'::jsonb check (jsonb_typeof(tests) = 'array'),
  output text not null default '' check (char_length(output) <= 20000),
  detail text check (detail is null or char_length(detail) <= 500),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists idx_eng_public_test_runs_attempt on public.eng_public_test_runs (attempt_id, created_at desc);

-- A run can be finished once; afterwards it is evidence and cannot change.
create or replace function public.eng_public_test_run_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'public test runs cannot be deleted';
  end if;
  if old.status <> 'running' then
    raise exception 'public test run % is final', old.id;
  end if;
  if new.attempt_id is distinct from old.attempt_id or new.files_sha256 is distinct from old.files_sha256
     or new.created_at is distinct from old.created_at or new.purpose is distinct from old.purpose then
    raise exception 'public test run identity cannot change';
  end if;
  return new;
end $$;

drop trigger if exists eng_public_test_runs_guard on public.eng_public_test_runs;
create trigger eng_public_test_runs_guard before update or delete on public.eng_public_test_runs
  for each row when (pg_trigger_depth() = 0) execute function public.eng_public_test_run_guard();

-- Atomic rate limit: at most one run per p_min_gap_seconds and p_max_runs per
-- attempt. Serialised per attempt with an advisory lock so two simultaneous
-- requests cannot both slip under the limit. Returns the new run id, or a null
-- id with the reason and, for "too_soon", the seconds to wait.
create or replace function public.eng_claim_public_test_run(
  p_attempt_id uuid,
  p_files_sha256 text,
  p_purpose text,
  p_min_gap_seconds integer,
  p_max_runs integer
)
returns table (run_id uuid, reason text, retry_after_seconds integer)
language plpgsql security definer set search_path = public as $$
declare
  last_at timestamptz;
  total integer;
  new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('eng_public_test_runs:' || p_attempt_id::text));
  select max(created_at), count(*) into last_at, total from public.eng_public_test_runs where attempt_id = p_attempt_id;
  if total >= p_max_runs then
    return query select null::uuid, 'limit_reached'::text, null::integer;
    return;
  end if;
  if last_at is not null and last_at > now() - make_interval(secs => p_min_gap_seconds) then
    return query select null::uuid, 'too_soon'::text,
      greatest(1, ceil(extract(epoch from (last_at + make_interval(secs => p_min_gap_seconds) - now())))::integer);
    return;
  end if;
  insert into public.eng_public_test_runs (attempt_id, files_sha256, purpose)
    values (p_attempt_id, p_files_sha256, p_purpose)
    returning id into new_id;
  return query select new_id, null::text, null::integer;
end $$;

revoke all on function public.eng_claim_public_test_run(uuid, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.eng_claim_public_test_run(uuid, text, text, integer, integer) to service_role;

create table if not exists public.eng_authored_evaluations (
  run_id uuid primary key references public.eng_evaluation_runs(id) on delete cascade,
  attempt_id uuid not null references public.eng_attempts(id) on delete cascade,
  scenario_version_id uuid not null references public.eng_scenario_versions(id) on delete restrict,
  runner jsonb not null check (jsonb_typeof(runner) = 'object'),
  suite jsonb not null check (jsonb_typeof(suite) = 'object'),
  tests jsonb not null check (jsonb_typeof(tests) = 'array'),
  acceptance jsonb not null check (jsonb_typeof(acceptance) = 'array'),
  criteria jsonb not null check (jsonb_typeof(criteria) = 'array'),
  limitations jsonb not null default '[]'::jsonb check (jsonb_typeof(limitations) = 'array'),
  output text not null default '' check (char_length(output) <= 20000),
  created_at timestamptz not null default now()
);
create index if not exists idx_eng_authored_evaluations_attempt on public.eng_authored_evaluations (attempt_id, created_at desc);

drop trigger if exists eng_authored_evaluations_append_only on public.eng_authored_evaluations;
create trigger eng_authored_evaluations_append_only before update or delete on public.eng_authored_evaluations
  for each row when (pg_trigger_depth() = 0) execute function public.eng_append_only();

drop trigger if exists set_updated_at_eng_authored_workspaces on public.eng_authored_workspaces;
create trigger set_updated_at_eng_authored_workspaces before update on public.eng_authored_workspaces
  for each row execute function public.set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['eng_authored_workspaces', 'eng_public_test_runs', 'eng_authored_evaluations'] loop
    execute format('alter table public.%s enable row level security', t);
    execute format('alter table public.%s force row level security', t);
    execute format('revoke all on public.%s from anon', t);
    execute format('revoke all on public.%s from authenticated', t);
  end loop;
end $$;
