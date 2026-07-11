-- ============================================================================
-- Profiles account status + admin notifications
-- ============================================================================

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists account_status text;
alter table public.profiles add column if not exists last_seen_at timestamptz;
alter table public.profiles add column if not exists onboarding_completed_at timestamptz;

update public.profiles
set account_status = coalesce(nullif(account_status, ''), 'active')
where account_status is null or account_status = '';

alter table public.profiles alter column account_status set default 'active';

alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('invited', 'active', 'suspended', 'deactivated'));

-- Prevent removing the last active super_admin
create or replace function public.prevent_last_super_admin_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining integer;
begin
  if (tg_op = 'UPDATE' and old.role = 'super_admin' and old.is_active = true
      and (new.is_active = false or new.role <> 'super_admin'))
     or (tg_op = 'DELETE' and old.role = 'super_admin' and old.is_active = true) then
    select count(*) into remaining
    from public.platform_user_roles
    where role = 'super_admin' and is_active = true
      and user_id <> old.user_id;
    if remaining < 1 then
      raise exception 'Cannot remove the last active super_admin';
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_last_super_admin on public.platform_user_roles;
create trigger trg_prevent_last_super_admin
  before update or delete on public.platform_user_roles
  for each row execute function public.prevent_last_super_admin_removal();

-- Admin in-app notifications
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id text,
  severity text not null default 'info'
    check (severity in ('info','warning','critical')),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_notification_reads (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.admin_notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (notification_id, user_id)
);

alter table public.admin_notifications enable row level security;
alter table public.admin_notification_reads enable row level security;
revoke all on table public.admin_notifications from anon, authenticated, public;
revoke all on table public.admin_notification_reads from anon, authenticated, public;
grant all on table public.admin_notifications to service_role;
grant all on table public.admin_notification_reads to service_role;

create index if not exists idx_admin_notifications_created
  on public.admin_notifications (created_at desc);
