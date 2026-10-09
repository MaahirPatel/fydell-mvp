-- 089: Employer demo workspace (additive).
--
-- The interactive demo lives inside the employer app as a per-user "Demo
-- workspace". Every row here belongs to one user's demo and is reachable only
-- through these tables: nothing references organizations, applications,
-- invitations, email_outbox or billing, so demo activity cannot reach live
-- hiring records, notifications, exports or reporting.
--
-- Reads: the owner only (RLS). Writes: server routes with the service role,
-- after resolving the workspace from the caller's own session. There are no
-- insert, update or delete policies for signed-in or anonymous clients.

insert into public.demo_namespaces (namespace, description)
values ('demo_employer', 'Per-user employer demo workspaces: fictional role, applicants, reports and decisions.')
on conflict (namespace) do nothing;

create table if not exists public.demo_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  namespace text not null default 'demo_employer' references public.demo_namespaces(namespace),
  scenario_key text not null,
  seed_version text not null,
  created_at timestamptz not null default now(),
  reset_at timestamptz,
  constraint demo_workspaces_namespace_demo check (namespace like 'demo\_%')
);

create table if not exists public.demo_workspace_applicants (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.demo_workspaces(id) on delete cascade,
  applicant_key text not null check (applicant_key ~ '^[a-z][a-z0-9-]{1,39}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  -- fixture: seeded fictional applicant; sample: the employer's own run of the sample task
  source text not null check (source in ('fixture', 'sample')),
  stage text not null default 'new' check (stage in ('new', 'reviewing', 'decided')),
  files jsonb not null default '{}'::jsonb,
  handoff jsonb not null default '{}'::jsonb,
  -- Test run recorded in the employer's browser for the sample submission; null for fixtures, which run on view.
  run jsonb,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, applicant_key),
  constraint demo_applicant_files_object check (jsonb_typeof(files) = 'object'),
  constraint demo_applicant_files_size check (pg_column_size(files) <= 200000)
);

create table if not exists public.demo_workspace_decisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.demo_workspaces(id) on delete cascade,
  applicant_key text not null,
  decision text not null check (decision in ('advance', 'hold', 'decline')),
  private_note text check (private_note is null or char_length(private_note) <= 4000),
  decided_by uuid not null references auth.users(id) on delete cascade,
  decided_at timestamptz not null default now()
);

create table if not exists public.demo_workspace_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.demo_workspaces(id) on delete cascade,
  applicant_key text not null,
  author text not null check (author in ('reviewer', 'applicant')),
  requirement_id text,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists demo_workspace_applicants_ws on public.demo_workspace_applicants (workspace_id);
create index if not exists demo_workspace_decisions_ws on public.demo_workspace_decisions (workspace_id, applicant_key, decided_at desc);
create index if not exists demo_workspace_messages_ws on public.demo_workspace_messages (workspace_id, applicant_key, created_at);

alter table public.demo_workspaces enable row level security;
alter table public.demo_workspace_applicants enable row level security;
alter table public.demo_workspace_decisions enable row level security;
alter table public.demo_workspace_messages enable row level security;

revoke all on public.demo_workspaces, public.demo_workspace_applicants, public.demo_workspace_decisions, public.demo_workspace_messages from anon;
revoke insert, update, delete, truncate on public.demo_workspaces, public.demo_workspace_applicants, public.demo_workspace_decisions, public.demo_workspace_messages from authenticated;
grant select on public.demo_workspaces, public.demo_workspace_applicants, public.demo_workspace_decisions, public.demo_workspace_messages to authenticated;

drop policy if exists demo_workspaces_owner_read on public.demo_workspaces;
create policy demo_workspaces_owner_read on public.demo_workspaces
  for select to authenticated using (user_id = auth.uid());

drop policy if exists demo_applicants_owner_read on public.demo_workspace_applicants;
create policy demo_applicants_owner_read on public.demo_workspace_applicants
  for select to authenticated using (
    exists (select 1 from public.demo_workspaces w where w.id = workspace_id and w.user_id = auth.uid())
  );

drop policy if exists demo_decisions_owner_read on public.demo_workspace_decisions;
create policy demo_decisions_owner_read on public.demo_workspace_decisions
  for select to authenticated using (
    exists (select 1 from public.demo_workspaces w where w.id = workspace_id and w.user_id = auth.uid())
  );

drop policy if exists demo_messages_owner_read on public.demo_workspace_messages;
create policy demo_messages_owner_read on public.demo_workspace_messages
  for select to authenticated using (
    exists (select 1 from public.demo_workspaces w where w.id = workspace_id and w.user_id = auth.uid())
  );
