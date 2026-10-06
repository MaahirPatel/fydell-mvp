-- Avoided-work ledger (§11, §29).
--
-- The first meaningful network transaction is when an employer accepts
-- existing evidence INSTEAD of requesting new assessment work. This table
-- records those events so the product can measure "repeat assessments
-- actually avoided."
--
-- Each row represents one instance where reuse replaced new work:
-- - receipt_accepted: employer accepted a shared simulation result
--   instead of inviting the candidate to a new assessment
-- - mapping_accepted: reviewer marked a requirement "accepted" based on
--   existing evidence instead of requesting targeted verification
-- - verification_accepted: a verification request was satisfied without
--   needing a full new assessment

create table if not exists public.avoided_work (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  candidate_user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('receipt_accepted', 'mapping_accepted', 'verification_accepted')),
  -- What was avoided: e.g. "full_assessment", "targeted_verification"
  avoided text not null,
  -- Reference to the source record (acceptance id, mapping id, etc.)
  source_id uuid,
  source_kind text,
  recorded_by uuid references auth.users(id) on delete set null,
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_avoided_work_org
  on public.avoided_work (organization_id, created_at desc);

create index if not exists idx_avoided_work_candidate
  on public.avoided_work (candidate_user_id, created_at desc);

alter table public.avoided_work enable row level security;

create policy avoided_work_org_read on public.avoided_work
  for select
  using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
    )
  );

-- Idempotency: one avoided-work record per (org, kind, source).
-- Callers pass a deterministic idempotency key; repeats are no-ops.
alter table public.avoided_work
  add column if not exists idempotency_key text;

create unique index if not exists uq_avoided_work_idempotency
  on public.avoided_work (idempotency_key)
  where idempotency_key is not null;
