-- 014_durable_jobs.sql
-- Durable background jobs for evaluation, evidence, receipts, email, incidents.
-- A retry must never duplicate submissions, findings, receipts, messages, or billing.

create table if not exists public.durable_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  idempotency_key text not null,
  state text not null default 'queued'
    check (state in ('queued', 'running', 'succeeded', 'failed', 'dead_letter')),
  payload jsonb not null default '{}'::jsonb,
  attempt_count integer not null default 0,
  max_attempts integer not null default 8,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  locked_at timestamptz,
  locked_by text,
  heartbeat_at timestamptz,
  organization_id uuid references public.organizations(id),
  session_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_type, idempotency_key)
);

create index if not exists durable_jobs_poll
  on public.durable_jobs (state, next_attempt_at)
  where state in ('queued', 'failed');

alter table public.durable_jobs enable row level security;

-- No direct client access. Service role / edge workers only.
drop policy if exists durable_jobs_no_client on public.durable_jobs;
create policy durable_jobs_no_client on public.durable_jobs
  for all
  using (false)
  with check (false);

-- Rollback: drop table public.durable_jobs cascade;
-- Forward repair: requeue failed jobs with new next_attempt_at; never delete succeeded rows with side effects.
