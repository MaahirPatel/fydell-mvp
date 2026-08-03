-- 020_micro_sims_feedback.sql
--
-- Five-minute micro simulation support:
--  - self-serve attempts (sessions without an invitation)
--  - shareable result tokens on sessions
--  - structured result payload on analysis runs
--  - pilot feedback capture

alter table public.sim_sessions
  alter column invitation_id drop not null;

alter table public.sim_sessions
  add column if not exists origin text not null default 'invited'
    check (origin in ('invited','self_serve'));

alter table public.sim_sessions
  add column if not exists share_token text unique;

alter table public.sim_analysis_runs
  add column if not exists result jsonb;

create table if not exists public.sim_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sim_sessions(id) on delete set null,
  template_slug text not null,
  role_key text not null,
  user_id uuid references auth.users(id) on delete set null,
  organization_name text,
  realism integer check (realism between 1 and 5),
  reveals_beyond_resume text check (reveals_beyond_resume in ('yes','somewhat','no')),
  useful_evidence jsonb not null default '[]'::jsonb,
  unrealistic_feedback text not null default '',
  additions_feedback text not null default '',
  roles_hired text not null default '',
  pilot_interest text check (pilot_interest in ('yes','maybe','no')),
  created_at timestamptz not null default now()
);

create index if not exists idx_sim_feedback_created on public.sim_feedback(created_at desc);

alter table public.sim_feedback enable row level security;
-- Writes via service role only; feedback is internal (no client SELECT).
