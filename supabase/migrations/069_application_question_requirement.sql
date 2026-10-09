-- A question on an application can be about one of the role's requirements.
-- The requirement text is copied so the applicant and the brief keep showing
-- what was asked about even if the role's requirements are edited later.
alter table public.application_questions
  add column if not exists requirement_id text
    check (requirement_id is null or requirement_id ~ '^[A-Za-z0-9_-]{1,40}$'),
  add column if not exists requirement_text text
    check (requirement_text is null or char_length(requirement_text) <= 500);
