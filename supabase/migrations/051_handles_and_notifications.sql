-- Public handles for engineers, invite-by-handle, and in-app notifications.
-- Additive only: new nullable columns, a new table, and owner-scoped policies.

-- A handle is how an employer finds an engineer without knowing their email.
-- Stored lowercase; uniqueness is enforced only once one is chosen.
alter table public.engineer_profiles
  add column if not exists handle text;

alter table public.engineer_profiles
  drop constraint if exists engineer_profiles_handle_shape,
  add constraint engineer_profiles_handle_shape
    check (handle is null or handle ~ '^[a-z0-9](?:[a-z0-9_]{1,28}[a-z0-9])$');

create unique index if not exists engineer_profiles_handle_unique
  on public.engineer_profiles (handle)
  where handle is not null;

-- When an employer invites by handle, the invitation remembers the handle so
-- employer views can show it instead of the engineer's private email.
alter table public.eng_invitations
  add column if not exists candidate_handle text;

-- In-app notifications. Written by the server (service role) only; each user
-- can read and mark their own as read, and nothing else.
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('invitation_received')),
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '' check (char_length(body) <= 500),
  href text not null default '' check (href = '' or href ~ '^/[A-Za-z0-9/_\-?=&.]*$'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_notifications_user_created
  on public.user_notifications (user_id, created_at desc);

alter table public.user_notifications enable row level security;

drop policy if exists user_notifications_owner_read on public.user_notifications;
create policy user_notifications_owner_read on public.user_notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists user_notifications_owner_mark_read on public.user_notifications;
create policy user_notifications_owner_mark_read on public.user_notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
