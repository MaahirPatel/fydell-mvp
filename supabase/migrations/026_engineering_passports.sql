-- Engineering Passports built from public GitHub repositories, candidate
-- controlled share links, and employer reviews of shared passports.
-- Additive only. Writes go through the service role from server code;
-- client roles may only read their own rows.

create table if not exists public.passports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null default '',
  headline text not null default '',
  github_login text,
  capability_summary jsonb not null default '{}'::jsonb,
  role_suggestions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.passport_projects (
  id uuid primary key default gen_random_uuid(),
  passport_id uuid not null references public.passports(id) on delete cascade,
  repo_id bigint not null,
  repo_full_name text not null,
  html_url text not null,
  commit_sha text not null check (commit_sha ~ '^[0-9a-f]{40}$'),
  primary_language text,
  is_fork boolean not null default false,
  contribution_statement text not null default '' check (char_length(contribution_statement) <= 1000),
  attribution text not null default 'unverified' check (attribution in ('unverified')),
  status text not null check (status in ('complete', 'partial', 'failed')),
  coverage jsonb not null default '{}'::jsonb,
  notices jsonb not null default '[]'::jsonb,
  analysis_version text not null,
  analyzed_at timestamptz not null default now(),
  unique (passport_id, repo_id, commit_sha)
);

create table if not exists public.passport_evidence (
  id text not null,
  project_id uuid not null references public.passport_projects(id) on delete cascade,
  detector text not null,
  category text not null,
  finding text not null,
  basis text not null check (basis in ('repository_observation', 'dependency_declaration')),
  path text not null,
  start_line integer not null check (start_line >= 1),
  end_line integer not null check (end_line >= start_line),
  excerpt jsonb not null,
  source_url text not null,
  limitations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (project_id, id)
);

create table if not exists public.passport_shares (
  id uuid primary key default gen_random_uuid(),
  passport_id uuid not null references public.passports(id) on delete cascade,
  token_hash text not null unique,
  label text not null default '',
  allowed_fields jsonb not null default '["projects","evidence","roles","capabilities"]'::jsonb,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_accessed_at timestamptz
);

create table if not exists public.employer_passport_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  share_id uuid not null references public.passport_shares(id) on delete cascade,
  role_title text not null default '' check (char_length(role_title) <= 120),
  decision text not null default 'none' check (decision in ('none', 'advance', 'hold', 'decline')),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  private_note text not null default '' check (char_length(private_note) <= 4000),
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, share_id)
);

create index if not exists idx_passport_projects_passport on public.passport_projects(passport_id);
create index if not exists idx_passport_shares_passport on public.passport_shares(passport_id);
create index if not exists idx_employer_passport_reviews_org on public.employer_passport_reviews(organization_id, created_at desc);

alter table public.passports enable row level security;
alter table public.passport_projects enable row level security;
alter table public.passport_evidence enable row level security;
alter table public.passport_shares enable row level security;
alter table public.employer_passport_reviews enable row level security;

drop policy if exists passports_owner_read on public.passports;
create policy passports_owner_read on public.passports
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists passport_projects_owner_read on public.passport_projects;
create policy passport_projects_owner_read on public.passport_projects
  for select to authenticated using (
    exists (select 1 from public.passports p where p.id = passport_id and p.owner_id = auth.uid())
  );

drop policy if exists passport_evidence_owner_read on public.passport_evidence;
create policy passport_evidence_owner_read on public.passport_evidence
  for select to authenticated using (
    exists (
      select 1 from public.passport_projects pr
      join public.passports p on p.id = pr.passport_id
      where pr.id = project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists passport_shares_owner_read on public.passport_shares;
create policy passport_shares_owner_read on public.passport_shares
  for select to authenticated using (
    exists (select 1 from public.passports p where p.id = passport_id and p.owner_id = auth.uid())
  );

drop policy if exists employer_passport_reviews_member_read on public.employer_passport_reviews;
create policy employer_passport_reviews_member_read on public.employer_passport_reviews
  for select to authenticated using (public.is_organization_member(organization_id));

revoke all on public.passports, public.passport_projects, public.passport_evidence,
  public.passport_shares, public.employer_passport_reviews from anon;
