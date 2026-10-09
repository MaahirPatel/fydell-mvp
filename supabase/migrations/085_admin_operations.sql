-- Admin operations: justified, time-limited access to private candidate code;
-- support incidents with a review trail; and authorized replacement attempts.
--
-- Additive only. Service role only: RLS is enabled and forced with no
-- policies, and anon/authenticated have no grants. Every write also lands in
-- public.audit_logs from the application.

-- ---------------------------------------------------------------------------
-- Break-glass access grants. No admin role reads candidate code by default;
-- a grant names one resource, carries a written justification and expires
-- within two hours. Rows are append-only except for a single revocation.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_access_grants (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  admin_email text not null check (char_length(admin_email) between 3 and 320),
  scope text not null check (scope in ('eng_attempt_code')),
  resource_id uuid not null,
  justification text not null check (char_length(justification) between 20 and 1000),
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  constraint admin_access_grants_window check (expires_at > granted_at and expires_at <= granted_at + interval '2 hours')
);

create index if not exists idx_admin_access_grants_lookup
  on public.admin_access_grants (scope, resource_id, admin_email, expires_at desc);
create index if not exists idx_admin_access_grants_created on public.admin_access_grants (granted_at desc);

create or replace function public.admin_access_grants_guard()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'admin access grants are append-only';
  end if;
  if old.revoked_at is not null and new.revoked_at is distinct from old.revoked_at then
    raise exception 'admin access grant % is already revoked', old.id;
  end if;
  if new.id is distinct from old.id
     or (new.admin_user_id is distinct from old.admin_user_id and new.admin_user_id is not null)
     or new.admin_email is distinct from old.admin_email
     or new.scope is distinct from old.scope
     or new.resource_id is distinct from old.resource_id
     or new.justification is distinct from old.justification
     or new.granted_at is distinct from old.granted_at
     or new.expires_at is distinct from old.expires_at then
    raise exception 'only revoked_at may change on an admin access grant';
  end if;
  return new;
end $$;

drop trigger if exists admin_access_grants_guard on public.admin_access_grants;
create trigger admin_access_grants_guard
  before update or delete on public.admin_access_grants
  for each row execute function public.admin_access_grants_guard();

-- ---------------------------------------------------------------------------
-- Support incidents: a platform-side problem reported against one piece of
-- work. Reviewing an incident records a finding; it never edits the work.
-- ---------------------------------------------------------------------------
create table if not exists public.support_incidents (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in (
    'eng_attempt','eng_evaluation_run','passport_import_job','organization','account'
  )),
  subject_id uuid not null,
  organization_id uuid references public.organizations(id) on delete set null,
  kind text not null check (kind in (
    'runtime_failure','evaluation_failure','upload_failure','import_failure',
    'delivery_failure','account_access','billing','other'
  )),
  summary text not null check (char_length(summary) between 10 and 1000),
  status text not null default 'open' check (status in (
    'open','investigating','confirmed_platform_fault','not_platform_fault','resolved'
  )),
  opened_by uuid references auth.users(id) on delete set null,
  opened_by_email text not null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_by_email text,
  reviewed_at timestamptz,
  review_notes text check (review_notes is null or char_length(review_notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_incidents_status on public.support_incidents (status, created_at desc);
create index if not exists idx_support_incidents_subject on public.support_incidents (subject_type, subject_id);

create or replace function public.support_incidents_guard()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'support incidents are kept for the audit trail';
  end if;
  if new.subject_type is distinct from old.subject_type
     or new.subject_id is distinct from old.subject_id
     or new.opened_by_email is distinct from old.opened_by_email
     or new.created_at is distinct from old.created_at then
    raise exception 'an incident''s subject and reporter cannot change';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists support_incidents_guard on public.support_incidents;
create trigger support_incidents_guard
  before update or delete on public.support_incidents
  for each row execute function public.support_incidents_guard();

-- ---------------------------------------------------------------------------
-- Replacement attempts. One per original attempt, and only on the strength of
-- an incident confirmed as a platform fault. The original attempt, its
-- submission and its reports are never modified; the replacement is a new
-- invitation the candidate accepts like any other. The record follows the
-- attempt when an account or organization is deleted; audit_logs keeps the
-- grant itself.
-- ---------------------------------------------------------------------------
create table if not exists public.eng_attempt_replacements (
  id uuid primary key default gen_random_uuid(),
  original_attempt_id uuid not null unique references public.eng_attempts(id) on delete cascade,
  replacement_invitation_id uuid not null unique references public.eng_invitations(id) on delete cascade,
  incident_id uuid not null references public.support_incidents(id) on delete restrict,
  reason text not null check (char_length(reason) between 10 and 1000),
  granted_by uuid references auth.users(id) on delete set null,
  granted_by_email text not null,
  created_at timestamptz not null default now()
);

create or replace function public.eng_attempt_replacements_guard()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.granted_by is null and old.granted_by is not null
     and (new.id, new.original_attempt_id, new.replacement_invitation_id, new.incident_id, new.reason, new.granted_by_email, new.created_at)
         is not distinct from
         (old.id, old.original_attempt_id, old.replacement_invitation_id, old.incident_id, old.reason, old.granted_by_email, old.created_at) then
    return new;
  end if;
  raise exception 'replacement records are append-only';
end $$;

drop trigger if exists eng_attempt_replacements_guard on public.eng_attempt_replacements;
create trigger eng_attempt_replacements_guard
  before update on public.eng_attempt_replacements
  for each row execute function public.eng_attempt_replacements_guard();

-- ---------------------------------------------------------------------------
-- Service role only.
-- ---------------------------------------------------------------------------
alter table public.admin_access_grants enable row level security;
alter table public.admin_access_grants force row level security;
alter table public.support_incidents enable row level security;
alter table public.support_incidents force row level security;
alter table public.eng_attempt_replacements enable row level security;
alter table public.eng_attempt_replacements force row level security;

revoke all on table public.admin_access_grants, public.support_incidents, public.eng_attempt_replacements
  from anon, authenticated, public;
grant select, insert, update on table public.admin_access_grants, public.support_incidents to service_role;
grant select, insert on table public.eng_attempt_replacements to service_role;

revoke execute on function public.admin_access_grants_guard() from public, anon, authenticated;
revoke execute on function public.support_incidents_guard() from public, anon, authenticated;
revoke execute on function public.eng_attempt_replacements_guard() from public, anon, authenticated;
