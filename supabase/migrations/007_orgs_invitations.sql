-- ============================================================================
-- Organizations ops extensions + invitations tracking
-- Extends existing public.organizations without breaking legacy schema.
-- ============================================================================

alter table public.organizations add column if not exists slug text;
alter table public.organizations add column if not exists website text;
alter table public.organizations add column if not exists status text not null default 'pending';
alter table public.organizations add column if not exists pilot_stage text not null default 'setup';
alter table public.organizations add column if not exists created_from_pilot_request_id uuid references public.pilot_requests(id);
alter table public.organizations add column if not exists industry text;
alter table public.organizations add column if not exists company_size text;
alter table public.organizations add column if not exists billing_email text;
alter table public.organizations add column if not exists timezone text;
alter table public.organizations add column if not exists created_by uuid references auth.users(id);

create unique index if not exists idx_organizations_slug
  on public.organizations (slug)
  where slug is not null;

alter table public.organizations drop constraint if exists organizations_status_check;
alter table public.organizations
  add constraint organizations_status_check
  check (status in ('pending','active','suspended','archived'));

alter table public.organizations drop constraint if exists organizations_pilot_stage_check;
alter table public.organizations
  add constraint organizations_pilot_stage_check
  check (pilot_stage in (
    'setup','role_configuration','candidates_invited','sessions_active',
    'reports_ready','outcome_tracking','completed'
  ));

-- ----------------------------------------------------------------------------
-- invitations (application tracking; Auth owns tokens)
-- ----------------------------------------------------------------------------
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  invitation_type text not null
    check (invitation_type in ('platform_admin','organization_member','candidate','reviewer')),
  organization_id uuid references public.organizations(id) on delete set null,
  platform_role text,
  organization_role text,
  invited_by uuid references auth.users(id),
  supabase_user_id uuid references auth.users(id),
  status text not null default 'pending'
    check (status in ('pending','sent','accepted','expired','revoked','failed')),
  expires_at timestamptz,
  accepted_at timestamptz,
  last_sent_at timestamptz,
  send_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invitations_email on public.invitations (lower(email));
create index if not exists idx_invitations_org on public.invitations (organization_id);
create index if not exists idx_invitations_status on public.invitations (status);

drop trigger if exists trg_invitations_updated on public.invitations;
create trigger trg_invitations_updated
  before update on public.invitations
  for each row execute function public.set_updated_at();

alter table public.invitations enable row level security;
revoke all on table public.invitations from anon, authenticated, public;
grant all on table public.invitations to service_role;

-- ----------------------------------------------------------------------------
-- organization_members
-- ----------------------------------------------------------------------------
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null
    check (role in ('owner','admin','hiring_manager','reviewer','viewer')),
  status text not null default 'invited'
    check (status in ('invited','active','suspended','removed')),
  invited_by uuid references auth.users(id),
  invited_at timestamptz,
  joined_at timestamptz,
  last_accessed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists idx_org_members_user
  on public.organization_members (user_id, organization_id, status);

drop trigger if exists trg_organization_members_updated on public.organization_members;
create trigger trg_organization_members_updated
  before update on public.organization_members
  for each row execute function public.set_updated_at();

alter table public.organization_members enable row level security;
revoke all on table public.organization_members from anon, authenticated, public;
grant all on table public.organization_members to service_role;

comment on table public.invitations is
  'Application invitation tracking. Never stores raw Auth tokens.';
comment on table public.organization_members is
  'Organization membership and roles. Platform admins mutate via service role.';
