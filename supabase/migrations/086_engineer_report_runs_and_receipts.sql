-- 086: Builder Analysis run records and engineer work receipts.
--
-- Additive only.
--
-- builder_analyses gains what a stored report needs to be traceable: the
-- hash of the exact inputs it read, the configuration it ran with, a hash of
-- the stored report, and the run it superseded. A run that has finished
-- (complete or failed) can no longer be changed; a newer run supersedes it
-- by pointing at it, never by rewriting it.
--
-- engineer_work_receipts records that Fydell's server accepted one artifact from an
-- engineer: an analyzed project snapshot, a published evidence version, or a
-- Builder Analysis report. Receipts are append-only and owner-only. The
-- content hash is stored for integrity checks and is never a lookup key for
-- anyone else: there is no anon access and no cross-owner read policy.

alter table public.builder_analyses
  add column if not exists input_hash text check (input_hash is null or input_hash ~ '^[0-9a-f]{64}$'),
  add column if not exists report_hash text check (report_hash is null or report_hash ~ '^[0-9a-f]{64}$'),
  add column if not exists config jsonb check (config is null or jsonb_typeof(config) = 'object'),
  add column if not exists supersedes_id uuid;

create or replace function public.builder_analyses_finished_immutable()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.status <> 'running' then
    raise exception 'finished analysis runs are immutable';
  end if;
  if new.owner_id is distinct from old.owner_id or new.created_at is distinct from old.created_at
     or new.analysis_version is distinct from old.analysis_version then
    raise exception 'analysis run identity cannot change';
  end if;
  return new;
end $$;

drop trigger if exists builder_analyses_finished_immutable on public.builder_analyses;
create trigger builder_analyses_finished_immutable before update on public.builder_analyses
  for each row execute function public.builder_analyses_finished_immutable();

create table if not exists public.engineer_work_receipts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 300),
  artifact_type text not null check (artifact_type in ('repository_snapshot', 'upload_snapshot', 'evidence_version', 'builder_analysis_report')),
  project_key text check (project_key is null or char_length(project_key) between 1 and 300),
  source_revision text check (source_revision is null or char_length(source_revision) <= 200),
  snapshot_id uuid,
  evidence_version_id uuid,
  analysis_id uuid,
  import_job_id uuid,
  subject_version text check (subject_version is null or char_length(subject_version) <= 80),
  analysis_version text check (analysis_version is null or char_length(analysis_version) <= 80),
  manifest_ref jsonb not null default '{}'::jsonb check (jsonb_typeof(manifest_ref) = 'object' and pg_column_size(manifest_ref) <= 16384),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  verification_scope jsonb not null default '[]'::jsonb check (jsonb_typeof(verification_scope) = 'array' and pg_column_size(verification_scope) <= 16384),
  accepted_at timestamptz not null default now(),
  unique (owner_id, idempotency_key)
);
create index if not exists idx_engineer_work_receipts_owner_accepted on public.engineer_work_receipts (owner_id, accepted_at desc);
create index if not exists idx_engineer_work_receipts_owner_project on public.engineer_work_receipts (owner_id, project_key);

create or replace function public.engineer_work_receipts_immutable()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'work receipts are immutable';
end $$;

drop trigger if exists engineer_work_receipts_no_update on public.engineer_work_receipts;
create trigger engineer_work_receipts_no_update before update on public.engineer_work_receipts
  for each row execute function public.engineer_work_receipts_immutable();

alter table public.engineer_work_receipts enable row level security;
alter table public.engineer_work_receipts force row level security;
revoke all on public.engineer_work_receipts from anon;
revoke insert, update, delete, truncate on public.engineer_work_receipts from authenticated;
grant select on public.engineer_work_receipts to authenticated;

drop policy if exists engineer_work_receipts_owner_select on public.engineer_work_receipts;
create policy engineer_work_receipts_owner_select on public.engineer_work_receipts
  for select to authenticated using (owner_id = auth.uid());

revoke execute on function public.builder_analyses_finished_immutable() from public, anon, authenticated;
revoke execute on function public.engineer_work_receipts_immutable() from public, anon, authenticated;
