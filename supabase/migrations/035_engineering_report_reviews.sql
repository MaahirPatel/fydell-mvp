-- 035: human QA hold on engineering reports (AI-12).
--
-- An engineering assessment report is withheld from the employer until a
-- qualified Fydell reviewer releases it. The current state lives in
-- sim_report_reviews; every decision is appended to sim_report_review_events
-- with the reviewer and the evaluation run it was based on. Written only by
-- server code with the service role (RLS enabled, no policies). Additive only.

create table if not exists public.sim_report_reviews (
  session_id uuid primary key references public.sim_sessions(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'released', 'changes_requested')),
  reviewer_email text,
  notes text not null default '' check (char_length(notes) <= 4000),
  evaluation_run_id uuid references public.sim_test_runs(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sim_report_review_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sim_sessions(id) on delete cascade,
  action text not null check (action in ('release', 'request_changes', 'reopen')),
  from_status text not null,
  to_status text not null,
  actor_email text not null,
  notes text not null default '' check (char_length(notes) <= 4000),
  evaluation_run_id uuid references public.sim_test_runs(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_sim_report_review_events_session
  on public.sim_report_review_events(session_id, created_at);
create index if not exists idx_sim_report_reviews_status
  on public.sim_report_reviews(status, updated_at desc);

alter table public.sim_report_reviews enable row level security;
alter table public.sim_report_review_events enable row level security;
