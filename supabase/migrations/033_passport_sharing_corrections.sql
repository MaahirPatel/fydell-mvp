-- Passport share expiry and candidate corrections (GH-10/PASS-06/PASS-08).
-- Additive only. Writes go through the service role from server code;
-- client roles may only read their own rows.

alter table public.passport_shares
  add column if not exists expires_at timestamptz;

create table if not exists public.passport_corrections (
  id uuid primary key default gen_random_uuid(),
  passport_id uuid not null references public.passports(id) on delete cascade,
  project_id uuid references public.passport_projects(id) on delete set null,
  finding_id text not null,
  reason text not null check (char_length(reason) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_note text not null default '' check (char_length(resolution_note) <= 1000)
);

create index if not exists idx_passport_corrections_passport on public.passport_corrections(passport_id);
create index if not exists idx_passport_corrections_finding on public.passport_corrections(finding_id);

alter table public.passport_corrections enable row level security;

drop policy if exists passport_corrections_owner_read on public.passport_corrections;
create policy passport_corrections_owner_read on public.passport_corrections
  for select to authenticated using (
    exists (select 1 from public.passports p where p.id = passport_id and p.owner_id = auth.uid())
  );
