-- Operator actions on stuck work (retry, cancel, reset) with an audit record
-- for each: who, what, when, why, and what actually happened.
--
-- A row is claimed by its idempotency key before the action runs, so a
-- repeated or concurrent request with the same key never acts twice. The
-- only permitted update moves a row out of 'pending' exactly once; after
-- that the row is frozen. Service role only. Additive only.

create table if not exists public.ops_actions (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique check (char_length(idempotency_key) between 8 and 120),
  actor_email text not null check (char_length(actor_email) between 3 and 320),
  actor_roles text[] not null default '{}',
  action text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  target_type text not null check (target_type in ('eng_evaluation_run','eng_attempt','eng_upload','passport_import_job')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 5 and 500),
  outcome text not null default 'pending' check (outcome in ('pending','applied','noop','rejected','error')),
  before_state text check (before_state is null or char_length(before_state) <= 60),
  after_state text check (after_state is null or char_length(after_state) <= 60),
  detail text check (detail is null or char_length(detail) <= 300),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_ops_actions_created on public.ops_actions (created_at desc);
create index if not exists idx_ops_actions_target on public.ops_actions (target_type, target_id, created_at desc);

create or replace function public.ops_actions_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'ops_actions rows are append-only';
  end if;
  if old.outcome <> 'pending' then
    raise exception 'ops action % is final', old.id;
  end if;
  if new.id is distinct from old.id
     or new.idempotency_key is distinct from old.idempotency_key
     or new.actor_email is distinct from old.actor_email
     or new.actor_roles is distinct from old.actor_roles
     or new.action is distinct from old.action
     or new.target_type is distinct from old.target_type
     or new.target_id is distinct from old.target_id
     or new.reason is distinct from old.reason
     or new.before_state is distinct from old.before_state
     or new.created_at is distinct from old.created_at then
    raise exception 'ops action identity cannot change';
  end if;
  return new;
end $$;

drop trigger if exists ops_actions_guard on public.ops_actions;
create trigger ops_actions_guard
  before update or delete on public.ops_actions
  for each row execute function public.ops_actions_guard();

alter table public.ops_actions enable row level security;
alter table public.ops_actions force row level security;
revoke all on table public.ops_actions from anon, authenticated, public;
grant select, insert, update on table public.ops_actions to service_role;
