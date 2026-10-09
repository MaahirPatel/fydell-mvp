-- Inbox verification for email-matched invitations.
--
-- Signup stays instant and Supabase still auto-confirms accounts, so neither
-- auth.users.email_confirmed_at nor profiles.email_verified_at proves that the
-- person controls the inbox. These tables record that proof separately: a
-- one-time code Fydell emailed to the address and the account entered back.
-- Accepting an invitation that is matched to an account by email requires a
-- row in email_inbox_verifications for the account's current email.
--
-- Both tables are written and read only by the server (service role).

create table if not exists public.email_inbox_verifications (
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (email = lower(email) and length(email) <= 254),
  method text not null check (method in ('email_code', 'dev_backfill')),
  verified_at timestamptz not null default now(),
  primary key (user_id, email)
);

create table if not exists public.email_verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (email = lower(email) and length(email) <= 254),
  code_hash text not null,
  attempts integer not null default 0 check (attempts >= 0),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_verification_codes_user_created_idx
  on public.email_verification_codes (user_id, created_at desc);

alter table public.email_inbox_verifications enable row level security;
alter table public.email_verification_codes enable row level security;

revoke all on table public.email_inbox_verifications from public, anon, authenticated;
revoke all on table public.email_verification_codes from public, anon, authenticated;
grant select, insert, update, delete on table public.email_inbox_verifications to service_role;
grant select, insert, update, delete on table public.email_verification_codes to service_role;
