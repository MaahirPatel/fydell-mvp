-- Structured contribution context and decision records for the work record.
-- Additive only. Both are engineer statements: attributed, never verified,
-- and kept per repository so they survive re-analysis of new revisions.
-- `version` supports optimistic concurrency so an edit never silently
-- overwrites a newer one.

create table if not exists public.passport_contributions (
  id uuid primary key default gen_random_uuid(),
  passport_id uuid not null references public.passports(id) on delete cascade,
  repo_full_name text not null,
  worked_on text not null default '',
  inherited text not null default '',
  collaboration text not null default 'unspecified'
    check (collaboration in ('unspecified', 'solo', 'team', 'open_source')),
  collaboration_note text not null default '',
  constraints_faced text not null default '',
  results text not null default '',
  improvements text not null default '',
  evidence_refs jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (passport_id, repo_full_name)
);

create table if not exists public.passport_decisions (
  id uuid primary key default gen_random_uuid(),
  passport_id uuid not null references public.passports(id) on delete cascade,
  repo_full_name text not null,
  title text not null,
  problem text not null default '',
  constraints_faced text not null default '',
  alternatives text not null default '',
  choice text not null default '',
  tradeoffs text not null default '',
  outcome text not null default '',
  evidence_refs jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(title) between 1 and 160)
);

create index if not exists passport_decisions_by_repo
  on public.passport_decisions (passport_id, repo_full_name, created_at desc);

alter table public.passport_contributions enable row level security;
alter table public.passport_decisions enable row level security;

drop policy if exists passport_contributions_owner_read on public.passport_contributions;
create policy passport_contributions_owner_read on public.passport_contributions
  for select to authenticated using (
    exists (select 1 from public.passports p where p.id = passport_id and p.owner_id = auth.uid())
  );

drop policy if exists passport_decisions_owner_read on public.passport_decisions;
create policy passport_decisions_owner_read on public.passport_decisions
  for select to authenticated using (
    exists (select 1 from public.passports p where p.id = passport_id and p.owner_id = auth.uid())
  );

revoke insert, update, delete on public.passport_contributions, public.passport_decisions from anon, authenticated;
