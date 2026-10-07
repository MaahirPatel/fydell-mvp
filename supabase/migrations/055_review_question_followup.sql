-- Follow-up requests: an optional due date the employer commits to, when
-- the employer read the answer (so "needs your action" is accurate), and a
-- client request id so a retried send cannot create a second question.
alter table public.review_questions
  add column if not exists due_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists client_request_id text;

do $$ begin
  alter table public.review_questions
    add constraint review_questions_client_request_id_len check (client_request_id is null or char_length(client_request_id) between 8 and 64);
exception when duplicate_object then null; end $$;

create unique index if not exists review_questions_client_request
  on public.review_questions (organization_id, client_request_id)
  where client_request_id is not null;

create index if not exists review_questions_needs_review
  on public.review_questions (organization_id, status)
  where status = 'answered' and reviewed_at is null;
