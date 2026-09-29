-- 031_engineering_profiles.sql
--
-- Unified Engineering Profile hub: one place where an engineer builds their
-- profile (identity, connected accounts) and where evidence from every source
-- (simulations, GitHub passport projects, editor imports) aggregates.
--
-- Provenance vocabulary (stored as plain text, interpreted in
-- src/lib/profile/types.ts):
--   'observed-simulation'    work completed inside a Fydell simulation and
--                            verified server-side (strongest claim)
--   'repository-observation' evidence extracted from a connected GitHub repo
--   'local-import'           self-supplied local editor data uploaded by the
--                            engineer; NOT independently observed by Fydell
--
-- NOTE: GitHub OAuth is a follow-up. The github connected-account row is
-- written by the profile "connect" flow after the existing paste-flow
-- extraction succeeds (see src/app/api/profile/accounts/route.ts).

create table if not exists public.engineer_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null default '',
  headline text not null default '',
  role text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_engineer_profiles_owner on public.engineer_profiles(owner_id);

create table if not exists public.profile_connected_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('github', 'vscode', 'cursor')),
  label text not null default '',
  status text not null default 'connected' check (status in ('connected', 'disconnected', 'error')),
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  unique (owner_id, provider, label)
);
create index if not exists idx_profile_accounts_owner on public.profile_connected_accounts(owner_id);

create table if not exists public.profile_editor_evidence (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('vscode', 'cursor')),
  imported_at timestamptz not null default now(),
  consent_ack boolean not null default false,
  time_range_start timestamptz,
  time_range_end timestamptz,
  session_count integer not null default 0,
  files_touched jsonb not null default '[]'::jsonb,
  languages jsonb not null default '[]'::jsonb,
  -- parse_method: human-readable description of exactly what was parsed and
  -- how, so the UI can show it next to the evidence (honesty requirement).
  parse_method text not null default '',
  provenance text not null default 'local-import' check (provenance = 'local-import'),
  detail jsonb not null default '{}'::jsonb
);
create index if not exists idx_profile_editor_evidence_owner on public.profile_editor_evidence(owner_id);

-- RLS: service-role writes; owners can read their own rows. (The app reads
-- through the admin client in src/lib/profile/store.ts, mirroring the
-- passport store.)
alter table public.engineer_profiles enable row level security;
alter table public.profile_connected_accounts enable row level security;
alter table public.profile_editor_evidence enable row level security;

drop policy if exists engineer_profiles_owner_read on public.engineer_profiles;
create policy engineer_profiles_owner_read on public.engineer_profiles
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists profile_accounts_owner_read on public.profile_connected_accounts;
create policy profile_accounts_owner_read on public.profile_connected_accounts
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists profile_editor_evidence_owner_read on public.profile_editor_evidence;
create policy profile_editor_evidence_owner_read on public.profile_editor_evidence
  for select to authenticated using (owner_id = auth.uid());
