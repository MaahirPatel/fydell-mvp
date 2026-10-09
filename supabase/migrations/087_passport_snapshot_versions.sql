-- 087: Immutable versions of analyzed project snapshots.
--
-- Additive only.
--
-- A snapshot (passport_projects row) is one repository at one revision. When
-- the same revision is analyzed again (a partial import completes, or a newer
-- analysis version runs), the live snapshot row shows the newest analysis,
-- but what was analyzed before must stay retrievable exactly: receipts and
-- earlier reports cite it. Every analysis of a snapshot is appended here as a
-- new row and never changed. Rows are only removed with their snapshot.
--
-- engineer_work_receipts gains snapshot_version_id so a snapshot receipt
-- points at the exact version it accepted.

create table if not exists public.passport_snapshot_versions (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.passport_projects(id) on delete cascade,
  passport_id uuid not null references public.passports(id) on delete cascade,
  version integer not null check (version >= 1),
  repo_full_name text not null,
  commit_sha text not null,
  analysis_version text not null,
  importer_version text,
  status text not null check (status in ('complete', 'partial')),
  coverage jsonb not null default '{}'::jsonb check (jsonb_typeof(coverage) = 'object'),
  notices jsonb not null default '[]'::jsonb check (jsonb_typeof(notices) = 'array'),
  manifest_hash text not null check (manifest_hash ~ '^[0-9a-f]{64}$'),
  findings jsonb not null default '[]'::jsonb check (jsonb_typeof(findings) = 'array'),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (snapshot_id, version),
  unique (snapshot_id, content_hash)
);
create index if not exists idx_passport_snapshot_versions_passport on public.passport_snapshot_versions (passport_id, snapshot_id, version desc);

create or replace function public.passport_snapshot_versions_immutable()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'snapshot versions are immutable';
end $$;

drop trigger if exists passport_snapshot_versions_no_update on public.passport_snapshot_versions;
create trigger passport_snapshot_versions_no_update before update on public.passport_snapshot_versions
  for each row execute function public.passport_snapshot_versions_immutable();

alter table public.passport_snapshot_versions enable row level security;
alter table public.passport_snapshot_versions force row level security;
revoke all on public.passport_snapshot_versions from anon;
revoke insert, update, delete, truncate on public.passport_snapshot_versions from authenticated;
grant select on public.passport_snapshot_versions to authenticated;

drop policy if exists passport_snapshot_versions_owner_read on public.passport_snapshot_versions;
create policy passport_snapshot_versions_owner_read on public.passport_snapshot_versions
  for select to authenticated
  using (exists (select 1 from public.passports p where p.id = passport_id and p.owner_id = auth.uid()));

revoke execute on function public.passport_snapshot_versions_immutable() from public, anon, authenticated;

alter table public.engineer_work_receipts
  add column if not exists snapshot_version_id uuid;
