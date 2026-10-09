-- A team decision and private note for an application that has no Passport
-- review (the applicant sent only a note or links). Team-only: row level
-- security is on with no client policies, so only the server reads it.
create table if not exists public.application_decisions (
  application_id uuid primary key references public.role_applications(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  decision text not null default 'none' check (decision in ('none', 'advance', 'hold', 'decline')),
  private_note text not null default '' check (char_length(private_note) <= 4000),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists application_decisions_org_idx on public.application_decisions (organization_id);

alter table public.application_decisions enable row level security;
