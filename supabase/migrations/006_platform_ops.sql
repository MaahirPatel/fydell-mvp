-- ============================================================================
-- Platform operations foundation
-- Durable pilot requests, platform roles, email outbox, audit log
-- Service-role writes from Next.js; public never reads pilot_requests.
-- ============================================================================

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- platform_user_roles
-- ----------------------------------------------------------------------------
create table if not exists public.platform_user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin', 'admin', 'operator', 'reviewer', 'support')),
  is_active boolean not null default true,
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  revoked_by uuid references auth.users(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_platform_user_roles_active_unique
  on public.platform_user_roles (user_id, role)
  where is_active = true;

create index if not exists idx_platform_user_roles_user_active
  on public.platform_user_roles (user_id, is_active);

drop trigger if exists trg_platform_user_roles_updated on public.platform_user_roles;
create trigger trg_platform_user_roles_updated
  before update on public.platform_user_roles
  for each row execute function public.set_updated_at();

alter table public.platform_user_roles enable row level security;
revoke all on table public.platform_user_roles from anon, authenticated, public;
grant all on table public.platform_user_roles to service_role;

-- ----------------------------------------------------------------------------
-- Extend public.pilot_requests (idempotent column adds)
-- ----------------------------------------------------------------------------
alter table public.pilot_requests add column if not exists public_reference text;
alter table public.pilot_requests add column if not exists full_name text;
alter table public.pilot_requests add column if not exists work_email text;
alter table public.pilot_requests add column if not exists company_name text;
alter table public.pilot_requests add column if not exists company_website text;
alter table public.pilot_requests add column if not exists job_title text;
alter table public.pilot_requests add column if not exists phone text;
alter table public.pilot_requests add column if not exists role_being_hired text;
alter table public.pilot_requests add column if not exists number_of_candidates integer;
alter table public.pilot_requests add column if not exists hiring_stage text;
alter table public.pilot_requests add column if not exists message text;
alter table public.pilot_requests add column if not exists priority text not null default 'normal';
alter table public.pilot_requests add column if not exists assigned_admin_id uuid references auth.users(id);
alter table public.pilot_requests add column if not exists source_url text;
alter table public.pilot_requests add column if not exists referrer_url text;
alter table public.pilot_requests add column if not exists utm_source text;
alter table public.pilot_requests add column if not exists utm_medium text;
alter table public.pilot_requests add column if not exists utm_campaign text;
alter table public.pilot_requests add column if not exists landing_page text;
alter table public.pilot_requests add column if not exists user_agent text;
alter table public.pilot_requests add column if not exists ip_hash text;
alter table public.pilot_requests add column if not exists acknowledgment_email_status text not null default 'pending';
alter table public.pilot_requests add column if not exists admin_notification_status text not null default 'pending';
alter table public.pilot_requests add column if not exists first_contacted_at timestamptz;
alter table public.pilot_requests add column if not exists qualified_at timestamptz;
alter table public.pilot_requests add column if not exists approved_at timestamptz;
alter table public.pilot_requests add column if not exists rejected_at timestamptz;
alter table public.pilot_requests add column if not exists converted_organization_id uuid;

-- Backfill normalized columns from legacy fields where empty
update public.pilot_requests
set
  full_name = coalesce(nullif(full_name, ''), name),
  work_email = coalesce(nullif(work_email, ''), lower(email)),
  company_name = coalesce(nullif(company_name, ''), company),
  role_being_hired = coalesce(nullif(role_being_hired, ''), role_title),
  message = coalesce(message, note)
where true;

-- Relax legacy status check by recreating constraint for expanded statuses
alter table public.pilot_requests drop constraint if exists pilot_requests_status_check;
alter table public.pilot_requests
  add constraint pilot_requests_status_check
  check (status in (
    'new','reviewing','contacted','qualified','needs_information','approved',
    'workspace_created','active_pilot','completed','won','lost','rejected','archived','closed'
  ));

alter table public.pilot_requests drop constraint if exists pilot_requests_priority_check;
alter table public.pilot_requests
  add constraint pilot_requests_priority_check
  check (priority in ('low','normal','high','urgent'));

create unique index if not exists idx_pilot_requests_public_reference
  on public.pilot_requests (public_reference)
  where public_reference is not null;

create index if not exists idx_pilot_requests_work_email
  on public.pilot_requests (lower(work_email));

create index if not exists idx_pilot_requests_assigned
  on public.pilot_requests (assigned_admin_id);

-- Public reference generator (FYD-YYYY-######)
create sequence if not exists public.pilot_request_ref_seq;

create or replace function public.generate_pilot_public_reference()
returns text
language plpgsql
as $$
declare
  n bigint;
begin
  n := nextval('public.pilot_request_ref_seq');
  return 'FYD-' || to_char(now() at time zone 'utc', 'YYYY') || '-' || lpad(n::text, 6, '0');
end;
$$;

create or replace function public.pilot_requests_set_reference()
returns trigger
language plpgsql
as $$
begin
  if new.public_reference is null or new.public_reference = '' then
    new.public_reference := public.generate_pilot_public_reference();
  end if;
  if new.full_name is null or new.full_name = '' then
    new.full_name := new.name;
  end if;
  if new.work_email is null or new.work_email = '' then
    new.work_email := lower(new.email);
  end if;
  if new.company_name is null or new.company_name = '' then
    new.company_name := new.company;
  end if;
  if new.role_being_hired is null or new.role_being_hired = '' then
    new.role_being_hired := new.role_title;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pilot_requests_reference on public.pilot_requests;
create trigger trg_pilot_requests_reference
  before insert on public.pilot_requests
  for each row execute function public.pilot_requests_set_reference();

-- ----------------------------------------------------------------------------
-- pilot_request_events / notes
-- ----------------------------------------------------------------------------
create table if not exists public.pilot_request_events (
  id uuid primary key default gen_random_uuid(),
  pilot_request_id uuid not null references public.pilot_requests(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  event_type text not null,
  old_status text,
  new_status text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_pilot_request_events_request
  on public.pilot_request_events (pilot_request_id, created_at desc);

alter table public.pilot_request_events enable row level security;
revoke all on table public.pilot_request_events from anon, authenticated, public;
grant all on table public.pilot_request_events to service_role;

create table if not exists public.pilot_request_notes (
  id uuid primary key default gen_random_uuid(),
  pilot_request_id uuid not null references public.pilot_requests(id) on delete cascade,
  author_user_id uuid references auth.users(id),
  author_email text,
  body text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pilot_request_notes_request
  on public.pilot_request_notes (pilot_request_id, created_at desc);

drop trigger if exists trg_pilot_request_notes_updated on public.pilot_request_notes;
create trigger trg_pilot_request_notes_updated
  before update on public.pilot_request_notes
  for each row execute function public.set_updated_at();

alter table public.pilot_request_notes enable row level security;
revoke all on table public.pilot_request_notes from anon, authenticated, public;
grant all on table public.pilot_request_notes to service_role;

-- ----------------------------------------------------------------------------
-- email_outbox / email_events / email_suppressions
-- ----------------------------------------------------------------------------
create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  template_key text not null,
  recipient_email text not null,
  recipient_name text,
  reply_to text,
  subject_override text,
  payload jsonb not null default '{}'::jsonb,
  related_entity_type text,
  related_entity_id uuid,
  status text not null default 'pending'
    check (status in ('pending','processing','sent','delivered','delayed','failed','bounced','suppressed','cancelled')),
  priority integer not null default 100,
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  scheduled_for timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  provider text not null default 'resend',
  provider_message_id text,
  idempotency_key text not null unique,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_email_outbox_pending
  on public.email_outbox (status, scheduled_for)
  where status in ('pending', 'failed');

drop trigger if exists trg_email_outbox_updated on public.email_outbox;
create trigger trg_email_outbox_updated
  before update on public.email_outbox
  for each row execute function public.set_updated_at();

alter table public.email_outbox enable row level security;
revoke all on table public.email_outbox from anon, authenticated, public;
grant all on table public.email_outbox to service_role;

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text unique not null,
  email_outbox_id uuid references public.email_outbox(id),
  provider_message_id text,
  event_type text not null,
  recipient_email text,
  occurred_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.email_events enable row level security;
revoke all on table public.email_events from anon, authenticated, public;
grant all on table public.email_events to service_role;

create table if not exists public.email_suppressions (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  reason text not null,
  source text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);

alter table public.email_suppressions enable row level security;
revoke all on table public.email_suppressions from anon, authenticated, public;
grant all on table public.email_suppressions to service_role;

-- ----------------------------------------------------------------------------
-- audit_logs (append-only for app roles)
-- ----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  organization_id uuid,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_created on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);

alter table public.audit_logs enable row level security;
revoke all on table public.audit_logs from anon, authenticated, public;
grant insert, select on table public.audit_logs to service_role;

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------
create or replace function public.has_platform_role(role_names text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_user_roles r
    where r.user_id = auth.uid()
      and r.is_active = true
      and r.role = any(role_names)
  );
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_platform_role(array['super_admin','admin','operator','reviewer','support']);
$$;

revoke all on function public.has_platform_role(text[]) from public;
revoke all on function public.is_platform_admin() from public;
grant execute on function public.has_platform_role(text[]) to authenticated, service_role;
grant execute on function public.is_platform_admin() to authenticated, service_role;

comment on table public.platform_user_roles is
  'Platform administration roles. Mutated only via trusted server/scripts.';
comment on table public.email_outbox is
  'Transactional email queue. Customer records survive email failures.';
comment on table public.audit_logs is
  'Append-only operational audit trail.';
