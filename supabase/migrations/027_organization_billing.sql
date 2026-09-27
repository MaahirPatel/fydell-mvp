-- Stripe billing state per organization, and a ledger of completed simulations
-- reported to Stripe. Additive only. Writes happen through the service role
-- (webhook and usage reporter); members can read their own organization's rows.

create table if not exists public.organization_billing (
  organization_id        uuid primary key references public.organizations(id) on delete cascade,
  stripe_customer_id     text not null unique,
  stripe_subscription_id text unique,
  plan                   text check (plan in ('starter', 'team')),
  status                 text,
  current_period_end     timestamptz,
  billing_starts_at      timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

drop trigger if exists trg_organization_billing_updated on public.organization_billing;
create trigger trg_organization_billing_updated before update on public.organization_billing
  for each row execute function public.set_updated_at();

create table if not exists public.billing_usage_reports (
  session_id         uuid primary key references public.sim_sessions(id) on delete restrict,
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  stripe_customer_id text not null,
  meter_identifier   text not null unique,
  completed_at       timestamptz not null,
  reported_at        timestamptz not null default now()
);

create index if not exists idx_billing_usage_reports_org on public.billing_usage_reports(organization_id, completed_at desc);

alter table public.organization_billing enable row level security;
alter table public.billing_usage_reports enable row level security;

drop policy if exists organization_billing_member_read on public.organization_billing;
create policy organization_billing_member_read on public.organization_billing
  for select to authenticated using (public.is_organization_member(organization_id));

drop policy if exists billing_usage_reports_member_read on public.billing_usage_reports;
create policy billing_usage_reports_member_read on public.billing_usage_reports
  for select to authenticated using (public.is_organization_member(organization_id));

revoke all on public.organization_billing, public.billing_usage_reports from anon;
