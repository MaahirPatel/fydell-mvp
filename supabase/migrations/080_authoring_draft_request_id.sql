-- Creating a work-sample draft is idempotent per form submission: the client
-- sends one request id per form, and a repeated submit returns the draft the
-- first one created instead of inserting a copy. Additive only.

alter table public.eng_scenario_drafts
  add column if not exists create_request_id uuid;

create unique index if not exists eng_scenario_drafts_create_request_uidx
  on public.eng_scenario_drafts (organization_id, create_request_id)
  where create_request_id is not null;
