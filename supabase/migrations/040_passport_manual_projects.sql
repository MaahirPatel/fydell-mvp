-- Manual passport projects: for developers without public GitHub repos.
--
-- Unlike GitHub-imported projects (which carry code-analysis evidence),
-- manual projects are self-reported. They are always labeled as such in
-- the passport view, share projections, and exports. They never contribute
-- to capability summaries derived from verified findings.
--
-- Trust model:
-- - GitHub projects: evidence basis = repository_observation (verified)
-- - Manual projects: evidence basis = self_reported (unverified)
-- The passport view must render these distinctly. Employers see the label.

create table if not exists public.passport_manual_projects (
  id uuid primary key default gen_random_uuid(),
  passport_id uuid not null references public.passports(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null check (char_length(description) between 1 and 2000),
  contribution_statement text not null check (char_length(contribution_statement) between 1 and 1000),
  tech_stack text[] not null default '{}',
  links jsonb not null default '[]'::jsonb,
  status text not null default 'published' check (status in ('published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_manual_projects_passport
  on public.passport_manual_projects (passport_id, created_at desc);

-- RLS: passport owners manage their own manual projects.
alter table public.passport_manual_projects enable row level security;

create policy manual_projects_owner_all on public.passport_manual_projects
  for all
  using (
    passport_id in (
      select id from public.passports where owner_id = auth.uid()
    )
  )
  with check (
    passport_id in (
      select id from public.passports where owner_id = auth.uid()
    )
  );

-- Service role bypasses RLS (server-side store functions use the admin client).
