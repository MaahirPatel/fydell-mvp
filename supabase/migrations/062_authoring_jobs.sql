-- 062: Durable jobs for scenario authoring (generation and test runs).
--
-- A job belongs to one draft and one draft revision. Workers claim a job
-- with a lease; an expired lease can be reclaimed, and completed stages are
-- checkpointed in `stages` so a resumed job continues instead of restarting.
-- One live job per draft and kind, enforced by a partial unique index.
-- Service role only for writes; organization members may read. Additive only.

create table if not exists public.eng_authoring_jobs (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.eng_scenario_drafts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('generate', 'test')),
  draft_revision integer not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  stages jsonb not null default '[]'::jsonb check (jsonb_typeof(stages) = 'array'),
  checkpoint jsonb not null default '{}'::jsonb check (jsonb_typeof(checkpoint) = 'object' and pg_column_size(checkpoint) <= 2097152),
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  lease_owner text,
  lease_expires_at timestamptz,
  error_code text check (error_code is null or char_length(error_code) <= 60),
  error_detail text check (error_detail is null or char_length(error_detail) <= 600),
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_eng_authoring_jobs_one_live
  on public.eng_authoring_jobs (draft_id, kind) where status in ('queued', 'running');
create index if not exists idx_eng_authoring_jobs_draft on public.eng_authoring_jobs (draft_id, created_at desc);

alter table public.eng_authoring_jobs enable row level security;
alter table public.eng_authoring_jobs force row level security;
revoke all on public.eng_authoring_jobs from anon;
revoke insert, update, delete, truncate on public.eng_authoring_jobs from authenticated;

drop policy if exists eng_authoring_jobs_member_select on public.eng_authoring_jobs;
create policy eng_authoring_jobs_member_select on public.eng_authoring_jobs
  for select to authenticated using (public.is_organization_member(organization_id));
