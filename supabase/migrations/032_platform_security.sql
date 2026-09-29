-- 032_platform_security.sql
-- Platform security, privacy and operator-audit tables for the release checklist
-- (SEC-06/09/10, OPS-03, DEMO-05, DATA-02/03).
--
-- All tables are service-role only: RLS is enabled with NO permissive policies,
-- so every access path goes through the server (which enforces the
-- access-guard policy in src/lib/security/access-guard.ts). Clients with the
-- anon key see nothing here.

-- ---------------------------------------------------------------------------
-- Immutable security audit events (SEC-06, OPS-03, SEC-12 evidence)
-- ---------------------------------------------------------------------------
create table if not exists public.security_audit_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_type text not null check (actor_type in ('user', 'operator', 'system', 'webhook')),
  actor_id text,
  action text not null,
  target_type text,
  target_id text,
  organization_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  -- audit rows are append-only
  check (length(action) > 0)
);
create index if not exists idx_security_audit_events_actor on public.security_audit_events(actor_id, occurred_at desc);
create index if not exists idx_security_audit_events_target on public.security_audit_events(target_type, target_id, occurred_at desc);
create index if not exists idx_security_audit_events_org on public.security_audit_events(organization_id, occurred_at desc);
alter table public.security_audit_events enable row level security;

-- ---------------------------------------------------------------------------
-- Data-subject requests: export / correction / deletion (SEC-09)
-- ---------------------------------------------------------------------------
create table if not exists public.data_subject_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null,
  request_type text not null check (request_type in ('export', 'correction', 'deletion')),
  -- received -> identity_verified -> tracing -> fulfilling -> fulfilled
  --            \-> rejected (with reason) at any step before fulfilling
  status text not null default 'received'
    check (status in ('received', 'identity_verified', 'tracing', 'fulfilling', 'fulfilled', 'rejected')),
  contact_email text,
  details jsonb not null default '{}'::jsonb,
  -- fulfillment checklist snapshot (surfaces traced: db, objects, jobs, indexes, vendors)
  checklist jsonb not null default '[]'::jsonb,
  rejection_reason text,
  received_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  fulfilled_by text,
  unique (requester_user_id, request_type, received_at)
);
create index if not exists idx_data_subject_requests_status on public.data_subject_requests(status, received_at);
create index if not exists idx_data_subject_requests_user on public.data_subject_requests(requester_user_id, received_at desc);
alter table public.data_subject_requests enable row level security;

-- ---------------------------------------------------------------------------
-- Revoked grants: imports, shares, access tokens (SEC-10)
-- ---------------------------------------------------------------------------
create table if not exists public.revoked_grants (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('user', 'organization', 'share_token', 'api_token', 'import_grant')),
  subject_id text not null,
  scope text not null check (scope in ('import', 'share', 'read', 'write', 'all')),
  revoked_at timestamptz not null default now(),
  revoked_by text,
  reason text,
  unique (subject_type, subject_id, scope)
);
create index if not exists idx_revoked_grants_subject on public.revoked_grants(subject_type, subject_id);
alter table public.revoked_grants enable row level security;

-- ---------------------------------------------------------------------------
-- Operator recovery actions (OPS-03): actor + reason are mandatory
-- ---------------------------------------------------------------------------
create table if not exists public.operator_actions (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_email text not null,
  action text not null check (action in (
    'retry_job', 'extend_deadline', 'quarantine_submission',
    'reissue_report', 'credit_usage', 'revoke_access', 'restore_record'
  )),
  target_type text not null,
  target_id text not null,
  reason text not null check (length(reason) >= 8),
  external_send boolean not null default false,
  external_send_confirmed_by text,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists idx_operator_actions_target on public.operator_actions(target_type, target_id, occurred_at desc);
create index if not exists idx_operator_actions_actor on public.operator_actions(actor_email, occurred_at desc);
alter table public.operator_actions enable row level security;

-- ---------------------------------------------------------------------------
-- Demo namespaces (DEMO-05): demo mutations may only touch rows tagged here
-- ---------------------------------------------------------------------------
create table if not exists public.demo_namespaces (
  namespace text primary key check (namespace like 'demo\_%'),
  description text,
  created_at timestamptz not null default now(),
  reset_at timestamptz
);
alter table public.demo_namespaces enable row level security;

insert into public.demo_namespaces (namespace, description)
values ('demo_public', 'Anonymous public demo fixtures; resettable, never mixed with real records.')
on conflict (namespace) do nothing;
