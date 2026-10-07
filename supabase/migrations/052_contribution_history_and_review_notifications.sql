-- Contribution statement history and review notifications. Additive only.

-- Every saved contribution statement is copied here, so Fydell can show what
-- changed, when, and which version a recipient could have seen. Rows are
-- written by the server and never updated.
create table if not exists public.passport_contribution_revisions (
  id uuid primary key default gen_random_uuid(),
  passport_id uuid not null references public.passports(id) on delete cascade,
  repo_full_name text not null,
  version integer not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  unique (passport_id, repo_full_name, version)
);

create index if not exists passport_contribution_revisions_by_repo
  on public.passport_contribution_revisions (passport_id, repo_full_name, version desc);

alter table public.passport_contribution_revisions enable row level security;

drop policy if exists passport_contribution_revisions_owner_read on public.passport_contribution_revisions;
create policy passport_contribution_revisions_owner_read on public.passport_contribution_revisions
  for select to authenticated using (
    exists (select 1 from public.passports p where p.id = passport_id and p.owner_id = (select auth.uid()))
  );

-- Follow-up questions notify the engineer; answers notify the reviewing team.
alter table public.user_notifications
  drop constraint if exists user_notifications_kind_check,
  add constraint user_notifications_kind_check
    check (kind in ('invitation_received', 'question_received', 'question_answered'));
