-- Recording a hiring decision on an assessment attempt names the decision it
-- replaces (or 'first'). Two reviewers deciding from the same state race on
-- this unique index, so exactly one wins and the other gets a conflict instead
-- of silently superseding a decision they never saw. Additive only: rows
-- recorded before this migration keep a null key and are not constrained.

alter table public.eng_decisions
  add column if not exists supersedes_key text;

create unique index if not exists eng_decisions_supersedes_uidx
  on public.eng_decisions (attempt_id, supersedes_key)
  where supersedes_key is not null;
