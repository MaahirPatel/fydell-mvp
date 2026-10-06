-- Report usefulness feedback (§21).
--
-- After reviewing an employer report, the reviewer can record whether
-- it was useful: did it help them understand the candidate's work,
-- identify strengths/gaps, and decide next steps?
--
-- This is the "whether an employer found the report useful" measure
-- from the master prompt. It feeds product quality decisions, not
-- candidate scoring. Feedback is per report version.

create table if not exists public.report_feedback (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.eng_reports(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  -- Did the report help you understand the candidate's work?
  understood_work boolean,
  -- Did it help identify strengths and gaps?
  identified_gaps boolean,
  -- Did it help you decide next steps?
  helped_decision boolean,
  -- Free-text: what was missing or misleading?
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  -- One feedback per reviewer per report version.
  unique (report_id, reviewer_user_id)
);

create index if not exists idx_report_feedback_org
  on public.report_feedback (organization_id, created_at desc);

alter table public.report_feedback enable row level security;

create policy report_feedback_org_read on public.report_feedback
  for select
  using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
    )
  );
