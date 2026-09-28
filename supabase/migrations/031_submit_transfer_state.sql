-- 030: snapshot-transfer state machine + submitted-evidence immutability.
--
-- UP-03 / DESK-15 / DESK-16: server-side enforcement of the snapshot-transfer
-- state machine
--   local_draft → syncing → server_saved → submitting → accepted / rejected / failed
-- `submit_transfer_transition` serializes concurrent requests on the session
-- row (SELECT ... FOR UPDATE): a stale `from` or an illegal transition
-- returns ok=false and changes nothing, so repeated/concurrent requests can
-- never regress states.
--
-- UP-05: `trg_sim_submissions_snapshot_immutable` rejects any UPDATE that
-- would change a stored submission's snapshot — accepted evidence cannot be
-- overwritten by later saves. (Nothing in the codebase updates
-- sim_submissions.snapshot after insert; verified 2026-09-27.)
--
-- Additive: one table, one transition function, one trigger. Alters no
-- existing tables, RLS policies, or triggers.
--
-- NOTE: 029 was already taken (029_engineering_profiles.sql), hence 030.

-- ---------------------------------------------------------------------------
-- Transfer-state table
-- ---------------------------------------------------------------------------
create table if not exists public.sim_snapshot_transfers (
  session_id uuid primary key references public.sim_sessions(id) on delete cascade,
  state text not null default 'local_draft'
    check (state in ('local_draft','syncing','server_saved','submitting','accepted','rejected','failed')),
  operation_id text,
  receipt_hash text,
  submission_id uuid,
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Service-role only: RLS on, no policies => anon/authenticated roles denied.
alter table public.sim_snapshot_transfers enable row level security;

-- ---------------------------------------------------------------------------
-- Enforced transition function
-- ---------------------------------------------------------------------------
create or replace function public.submit_transfer_transition(
  p_session_id uuid,
  p_from_state text,
  p_to_state text,
  p_detail jsonb default '{}'::jsonb
)
returns table (ok boolean, state text)
language plpgsql
as $$
declare
  v_current text;
  v_allowed boolean := false;
  v_submission_id uuid;
begin
  -- Lock the transfer row so concurrent finalizes serialize here.
  select t.state into v_current
  from public.sim_snapshot_transfers t
  where t.session_id = p_session_id
  for update;

  if not found then
    -- First touch: only a caller expecting local_draft may create the record.
    if p_from_state is distinct from 'local_draft' then
      return query select false, null::text;
      return;
    end if;
    insert into public.sim_snapshot_transfers (session_id, state)
    values (p_session_id, 'local_draft');
    v_current := 'local_draft';
  end if;

  -- Idempotent repeat of the current state: success, refresh detail only.
  if v_current = p_to_state then
    update public.sim_snapshot_transfers
    set operation_id = coalesce(nullif(p_detail ->> 'operationId', ''), operation_id),
        receipt_hash = coalesce(nullif(p_detail ->> 'receiptHash', ''), receipt_hash),
        updated_at = now()
    where session_id = p_session_id;
    return query select true, v_current;
    return;
  end if;

  -- Stale caller: the state moved on without us — refuse, never regress.
  if v_current is distinct from p_from_state then
    return query select false, v_current;
    return;
  end if;

  v_allowed := case
    when v_current = 'local_draft'  and p_to_state = 'syncing' then true
    when v_current = 'syncing'     and p_to_state in ('server_saved', 'failed', 'local_draft') then true
    when v_current = 'server_saved' and p_to_state in ('submitting', 'local_draft', 'failed') then true
    when v_current = 'submitting'  and p_to_state in ('accepted', 'rejected', 'failed') then true
    when v_current = 'rejected'    and p_to_state = 'local_draft' then true
    when v_current = 'failed'      and p_to_state in ('syncing', 'submitting', 'local_draft') then true
    else false
  end;

  if not v_allowed then
    return query select false, v_current;
    return;
  end if;

  begin
    v_submission_id := nullif(p_detail ->> 'submissionId', '')::uuid;
  exception when others then
    v_submission_id := null;
  end;

  update public.sim_snapshot_transfers
  set state = p_to_state,
      operation_id = coalesce(nullif(p_detail ->> 'operationId', ''), operation_id),
      receipt_hash = coalesce(nullif(p_detail ->> 'receiptHash', ''), receipt_hash),
      submission_id = coalesce(v_submission_id, submission_id),
      failure_code = case
        when p_to_state in ('rejected', 'failed') then p_detail ->> 'failureCode'
        else null
      end,
      failure_message = case
        when p_to_state in ('rejected', 'failed') then p_detail ->> 'failureMessage'
        else null
      end,
      updated_at = now()
  where session_id = p_session_id;

  return query select true, p_to_state;
end;
$$;

-- ---------------------------------------------------------------------------
-- UP-05: submitted evidence is immutable
-- ---------------------------------------------------------------------------
create or replace function public.prevent_snapshot_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'submitted evidence is immutable';
end;
$$;

drop trigger if exists trg_sim_submissions_snapshot_immutable on public.sim_submissions;
create trigger trg_sim_submissions_snapshot_immutable
before update of snapshot on public.sim_submissions
for each row
when (old.snapshot is distinct from new.snapshot)
execute function public.prevent_snapshot_mutation();
