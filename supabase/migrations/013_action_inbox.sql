-- 013_action_inbox.sql
-- Action Inbox: a per-user feed of things that need attention (invites,
-- ready simulations, etc). Distinct from email_outbox — this is in-app.

create table if not exists public.action_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id),
  type text not null,
  title text not null,
  body text,
  action_url text,
  mission_id uuid,
  invitation_id uuid,
  session_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists action_inbox_user_created on public.action_inbox(user_id, created_at desc);
alter table public.action_inbox enable row level security;
create policy action_inbox_own on public.action_inbox for all using (user_id = auth.uid()) with check (user_id = auth.uid());
