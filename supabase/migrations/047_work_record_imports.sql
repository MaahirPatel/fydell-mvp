-- Durable repository imports, immutable snapshot identity, engineer context,
-- and share pinning for the engineering work record.
-- Additive only: new columns, indexes and one function. Numbered 047 because
-- 040–046 were used by a reverted change whose tables still exist on dev.

-- 1. Durable import jobs reuse public.durable_jobs (014) with job_type
--    'passport_import'. These columns hold the user-visible job contract.
alter table public.durable_jobs
  add column if not exists owner_id uuid references auth.users(id) on delete cascade,
  add column if not exists stage text,
  add column if not exists progress jsonb not null default '{}'::jsonb,
  add column if not exists error_code text,
  add column if not exists safe_error text,
  add column if not exists retryable boolean,
  add column if not exists result_ref jsonb,
  add column if not exists analysis_version text,
  add column if not exists started_at timestamptz,
  add column if not exists finished_at timestamptz,
  add column if not exists cancel_requested_at timestamptz;

create index if not exists durable_jobs_owner_recent
  on public.durable_jobs (owner_id, job_type, created_at desc)
  where owner_id is not null;

create index if not exists durable_jobs_stale_running
  on public.durable_jobs (job_type, heartbeat_at)
  where state = 'running';

-- Atomic claim: a job is claimable when it is queued, scheduled for retry
-- and due, or running with a heartbeat older than the lease. Exactly one
-- caller wins; attempt_count increments in the same statement.
create or replace function public.claim_durable_job(p_job_id uuid, p_worker text, p_lease_seconds integer default 90)
returns setof public.durable_jobs
language sql
security definer
set search_path = public
as $$
  update public.durable_jobs
     set state = 'running',
         locked_at = now(),
         locked_by = p_worker,
         heartbeat_at = now(),
         started_at = coalesce(started_at, now()),
         attempt_count = attempt_count + 1,
         updated_at = now()
   where id = p_job_id
     and cancel_requested_at is null
     and attempt_count < max_attempts
     and (
       (state in ('queued', 'failed') and next_attempt_at <= now())
       or (state = 'running' and heartbeat_at < now() - make_interval(secs => p_lease_seconds))
     )
  returning *;
$$;

revoke all on function public.claim_durable_job(uuid, text, integer) from public, anon, authenticated;

-- 2. Immutable snapshot identity on each analyzed project version.
alter table public.passport_projects
  add column if not exists revision_ref text,
  add column if not exists manifest jsonb not null default '[]'::jsonb,
  add column if not exists importer_version text,
  add column if not exists imported_at timestamptz,
  add column if not exists job_id uuid references public.durable_jobs(id) on delete set null;

-- 3. Engineer context and corrections: one table, three kinds. The finding
--    row is never mutated; these are attributed statements beside it.
alter table public.passport_corrections
  add column if not exists kind text not null default 'inaccurate',
  add column if not exists proposed_interpretation text not null default '',
  add column if not exists author_id uuid references auth.users(id) on delete set null,
  add column if not exists withdrawn_at timestamptz;

do $$ begin
  alter table public.passport_corrections
    add constraint passport_corrections_kind_check check (kind in ('context', 'inaccurate', 'correction'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.passport_corrections
    add constraint passport_corrections_proposed_len check (char_length(proposed_interpretation) <= 1000);
exception when duplicate_object then null; end $$;

-- 4. Share scope: which projects a link includes and whether it pins the
--    exact analyzed versions or follows re-analysis.
alter table public.passport_shares
  add column if not exists project_repos jsonb,
  add column if not exists pinned_project_ids jsonb,
  add column if not exists version_policy text not null default 'follow';

do $$ begin
  alter table public.passport_shares
    add constraint passport_shares_version_policy_check check (version_policy in ('follow', 'pinned'));
exception when duplicate_object then null; end $$;
