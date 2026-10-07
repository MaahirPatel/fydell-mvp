-- Engineer-authored presentation for each project in a Builder Profile.
-- Lives beside analysis snapshots, keyed by project, so re-analysis never
-- overwrites what the engineer wrote. Manual projects (no source analyzed)
-- exist only here. field_sources records whether each field was written by
-- the engineer or generated as an unconfirmed draft.
create table if not exists public.passport_project_presentations (
  id uuid primary key default gen_random_uuid(),
  passport_id uuid not null references public.passports(id) on delete cascade,
  project_key text not null check (char_length(project_key) between 3 and 200),
  source_kind text not null check (source_kind in ('github', 'upload', 'manual')),
  title text not null check (char_length(title) between 1 and 120),
  summary text not null default '' check (char_length(summary) <= 600),
  purpose text not null default '' check (char_length(purpose) <= 600),
  intended_users text not null default '' check (char_length(intended_users) <= 200),
  contribution text not null default '' check (char_length(contribution) <= 1200),
  team_context text not null default 'unspecified'
    check (team_context in ('unspecified', 'solo', 'team', 'employment', 'open_source', 'coursework')),
  project_state text not null default 'unspecified'
    check (project_state in ('unspecified', 'prototype', 'in_progress', 'shipped', 'maintained', 'archived')),
  outcomes text not null default '' check (char_length(outcomes) <= 1200),
  technologies text[] not null default '{}' check (cardinality(technologies) <= 20),
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 6),
  started_on text check (started_on is null or started_on ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  ended_on text check (ended_on is null or ended_on ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  featured boolean not null default false,
  sort_order integer not null default 0,
  visibility text not null default 'shareable' check (visibility in ('private', 'shareable')),
  field_sources jsonb not null default '{}'::jsonb check (jsonb_typeof(field_sources) = 'object'),
  confirmed_at timestamptz,
  client_request_id text check (client_request_id is null or char_length(client_request_id) between 8 and 64),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (passport_id, project_key),
  unique (passport_id, client_request_id)
);

create index if not exists passport_project_presentations_passport_idx
  on public.passport_project_presentations (passport_id, sort_order);

alter table public.passport_project_presentations enable row level security;
alter table public.passport_project_presentations force row level security;

drop policy if exists passport_project_presentations_owner_select on public.passport_project_presentations;
create policy passport_project_presentations_owner_select on public.passport_project_presentations
  for select to authenticated
  using (exists (select 1 from public.passports p where p.id = passport_id and p.owner_id = auth.uid()));

revoke insert, update, delete on public.passport_project_presentations from anon, authenticated;
