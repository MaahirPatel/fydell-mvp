-- Cross-employer receipt acceptance.
--
-- When a candidate shares simulation results with a different employer
-- (via a sim_receipt_shares bearer link), that employer can formally
-- "accept" the receipt as evidence in their own hiring process.
--
-- This creates an auditable record: which org accepted which shared
-- results, when, and who at the org made the call. It does NOT copy
-- the candidate's data — the share link remains the source of truth,
-- subject to its own expiry and revocation.
--
-- Trust model:
-- - The accepting org sees exactly what the candidate shared (field-scoped).
-- - If the candidate revokes the share, the acceptance record remains
--   (audit trail) but the underlying data is no longer accessible.
-- - Acceptance is per-org: Employer B accepting does not affect Employer A.

create table if not exists public.employer_receipt_acceptances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  share_id uuid not null references public.sim_receipt_shares(id) on delete cascade,
  candidate_user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.sim_sessions(id) on delete cascade,
  accepted_by uuid references auth.users(id) on delete set null,
  notes text not null default '' check (char_length(notes) <= 2000),
  accepted_at timestamptz not null default now(),
  -- One acceptance per org per share. Re-accepting is idempotent.
  unique (organization_id, share_id)
);

create index if not exists idx_receipt_acceptances_org
  on public.employer_receipt_acceptances (organization_id, accepted_at desc);

create index if not exists idx_receipt_acceptances_candidate
  on public.employer_receipt_acceptances (candidate_user_id, accepted_at desc);

alter table public.employer_receipt_acceptances enable row level security;

create policy receipt_acceptances_org_read on public.employer_receipt_acceptances
  for select
  using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
    )
  );

-- Inserts go through the server-side store (admin client), not direct RLS.
