-- Builder Analysis: a private, cross-project report for one engineer, built
-- from their imported projects and a scan of their public repositories.
--
-- Each run is one row. The report is owner-only: no share link, application
-- or employer view reads this table. Rows are written by the service role;
-- the owner may read their own rows through RLS. Deleting the account
-- deletes the rows. Additive only.

create table if not exists public.builder_analyses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'running' check (status in ('running', 'complete', 'failed')),
  analysis_version text not null check (char_length(analysis_version) between 3 and 60),
  report jsonb,
  error text check (error is null or char_length(error) <= 300),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_builder_analyses_owner_created on public.builder_analyses (owner_id, created_at desc);

alter table public.builder_analyses enable row level security;
alter table public.builder_analyses force row level security;

drop policy if exists builder_analyses_owner_read on public.builder_analyses;
create policy builder_analyses_owner_read on public.builder_analyses
  for select to authenticated
  using (owner_id = auth.uid());

revoke all on public.builder_analyses from anon;
revoke insert, update, delete on public.builder_analyses from authenticated;
grant select on public.builder_analyses to authenticated;
