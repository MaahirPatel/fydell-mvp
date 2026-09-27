-- 031_billing_ledger.sql
-- Webhook idempotency + usage/entitlement ledger (BILL-04, BILL-06, BILL-07, DATA-03).
--
-- Service-role only (RLS enabled, no permissive policies): all writes go through
-- the webhook handler in src/lib/billing/webhook.ts and the ledger in
-- src/lib/billing/ledger.ts.

-- ---------------------------------------------------------------------------
-- Stripe webhook event log: exactly-once processing record (BILL-04)
-- ---------------------------------------------------------------------------
create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_result text check (processing_result in ('applied', 'duplicate', 'ignored', 'failed')),
  error text,
  payload_hash text
);
create index if not exists idx_stripe_webhook_events_type on public.stripe_webhook_events(event_type, received_at desc);
alter table public.stripe_webhook_events enable row level security;

-- ---------------------------------------------------------------------------
-- Billing ledger: usage, credits, adjustments, entitlements (BILL-06)
--
-- Invariants enforced in the app layer and defended here:
--  * idempotency_key is unique: retries and duplicate provider events can never
--    double-charge (DATA-03, BILL-04).
--  * entries are append-only; corrections are new reversing entries.
-- ---------------------------------------------------------------------------
create table if not exists public.billing_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  entry_type text not null check (entry_type in ('usage', 'credit', 'adjustment', 'entitlement')),
  -- usage: one completed billable simulation (quantity 1)
  -- credit: manual or policy credit granted to the organization
  -- adjustment: price/policy correction, positive or negative
  -- entitlement: included volume granted by the plan for a billing period
  quantity numeric not null default 0,
  amount_cents integer not null default 0,
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  idempotency_key text not null unique,
  reason text not null,
  actor text,
  period_start timestamptz,
  period_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_billing_ledger_org on public.billing_ledger_entries(organization_id, created_at desc);
create index if not exists idx_billing_ledger_type on public.billing_ledger_entries(organization_id, entry_type, created_at desc);
alter table public.billing_ledger_entries enable row level security;
