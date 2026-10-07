-- Candidate responses to their released engineering report: added context or
-- a flagged error on a finding or criterion. Attributed, append-only for the
-- candidate, and resolved by the hiring team without changing the report.
-- Additive only.

create table if not exists public.eng_report_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.eng_attempts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_id uuid not null references public.eng_reports(id) on delete cascade,
  report_version integer not null,
  target_kind text not null check (target_kind in ('finding','criterion','report')),
  target_id text not null check (char_length(target_id) between 1 and 40),
  kind text not null check (kind in ('context','inaccurate')),
  body text not null check (char_length(body) between 1 and 2000),
  candidate_user_id uuid references auth.users(id) on delete set null,
  client_request_id text check (client_request_id is null or char_length(client_request_id) between 8 and 64),
  status text not null default 'open' check (status in ('open','resolved')),
  resolution text check (resolution is null or char_length(resolution) <= 2000),
  resolved_by_email text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_eng_report_responses_attempt on public.eng_report_responses(attempt_id, created_at desc);
create index if not exists idx_eng_report_responses_open on public.eng_report_responses(organization_id) where status = 'open';
create unique index if not exists uq_eng_report_responses_request
  on public.eng_report_responses(attempt_id, client_request_id) where client_request_id is not null;

alter table public.eng_report_responses enable row level security;
alter table public.eng_report_responses force row level security;
revoke all on public.eng_report_responses from anon;
revoke insert, update, delete, truncate on public.eng_report_responses from authenticated;

drop policy if exists eng_report_responses_select on public.eng_report_responses;
create policy eng_report_responses_select on public.eng_report_responses
  for select to authenticated using (
    public.eng_attempt_candidate(attempt_id) or public.is_organization_member(organization_id)
  );
