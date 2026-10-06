-- Targeted verification requests.
--
-- When an employer marks a requirement mapping as "unresolved" or
-- "questioned" during review, they can request targeted verification:
-- a focused ask for the candidate to demonstrate that specific criterion.
--
-- This is deliberately lighter than a full simulation. It's a structured
-- request for evidence on one requirement: the employer says what they
-- need to see, the candidate responds with a focused demonstration
-- (explanation, code snippet, or short task), and the employer signs off.
--
-- Flow:
--   pending   → employer created the request, candidate hasn't responded
--   submitted → candidate responded, awaiting employer review
--   accepted  → employer satisfied; mapping can move to "accepted"
--   rejected  → employer not satisfied; mapping stays unresolved
--
-- A rejected request can be followed by a new request (iteration),
-- but each request is a separate auditable record.

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mapping_id uuid references public.requirement_evidence_mappings(id) on delete set null,
  role_id uuid not null references public.hiring_roles(id) on delete cascade,
  share_id uuid not null references public.passport_shares(id) on delete cascade,
  candidate_user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null check (char_length(prompt) between 1 and 2000),
  status text not null default 'pending'
    check (status in ('pending', 'submitted', 'accepted', 'rejected')),
  candidate_response text not null default '' check (char_length(candidate_response) <= 4000),
  requested_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewer_note text not null default '' check (char_length(reviewer_note) <= 1000),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_verification_requests_lookup
  on public.verification_requests (organization_id, role_id, share_id, created_at desc);

create index if not exists idx_verification_requests_candidate
  on public.verification_requests (candidate_user_id, status, created_at desc);

alter table public.verification_requests enable row level security;

create policy verification_requests_org_all on public.verification_requests
  for all
  using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
    )
  )
  with check (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
    )
  );

-- Candidates read their own requests via the server-side store (admin client).
-- Direct RLS for candidate reads:
create policy verification_requests_candidate_read on public.verification_requests
  for select
  using (candidate_user_id = auth.uid());
