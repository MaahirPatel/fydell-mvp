-- 034: Requirement-evidence review (H06) + follow-up questions (H09)
--
-- Adds requirement columns to hiring_roles and creates the mapping tables
-- that connect role requirements to passport evidence with reviewer actions.

-- Requirement columns on hiring_roles (persist the RoleDefinitionInput fields)
alter table public.hiring_roles
  add column if not exists responsibilities text[] not null default '{}',
  add column if not exists evaluation_criteria text[] not null default '{}',
  add column if not exists rubric_version integer not null default 1,
  add column if not exists rubric_approved_at timestamptz,
  add column if not exists rubric_approved_by uuid references auth.users(id) on delete set null;

-- Requirement-to-evidence mappings (H06)
-- Each row connects one role requirement to one evidence item (or none),
-- with the reviewer's disposition.
create table if not exists public.requirement_evidence_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role_id uuid not null references public.hiring_roles(id) on delete cascade,
  share_id uuid not null references public.passport_shares(id) on delete cascade,
  requirement_text text not null,
  requirement_index integer not null,
  evidence_project_id uuid references public.passport_projects(id) on delete cascade,
  evidence_id text,
  status text not null default 'suggested'
    check (status in ('suggested', 'accepted', 'corrected', 'questioned', 'unresolved')),
  reviewer_note text not null default '' check (char_length(reviewer_note) <= 2000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (role_id, share_id, requirement_index)
);

create index if not exists idx_req_evidence_mappings_lookup
  on public.requirement_evidence_mappings (organization_id, role_id, share_id);

-- Follow-up questions (H09): bounded Q&A attached to a mapping
create table if not exists public.review_questions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mapping_id uuid references public.requirement_evidence_mappings(id) on delete cascade,
  role_id uuid not null references public.hiring_roles(id) on delete cascade,
  share_id uuid not null references public.passport_shares(id) on delete cascade,
  question text not null check (char_length(question) between 1 and 2000),
  response text not null default '' check (char_length(response) <= 4000),
  status text not null default 'open'
    check (status in ('open', 'answered', 'closed')),
  asked_by uuid references auth.users(id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_review_questions_lookup
  on public.review_questions (organization_id, role_id, share_id, created_at);

-- RLS: organization members manage their org's review data
alter table public.requirement_evidence_mappings enable row level security;
alter table public.review_questions enable row level security;

drop policy if exists req_evidence_mappings_org on public.requirement_evidence_mappings;
create policy req_evidence_mappings_org on public.requirement_evidence_mappings
  for all using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and status = 'active'
    )
  );

drop policy if exists review_questions_org on public.review_questions;
create policy review_questions_org on public.review_questions
  for all using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and status = 'active'
    )
  );
