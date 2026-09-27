-- W4: atomic file-snapshot submission.
--
-- Wraps the submission insert + session/invitation/event updates in a single
-- transaction: the file snapshot, the server-computed receipt hash, and the
-- status flips are stored all-or-nothing. Partial failure stores nothing.
--
-- Additive: creates one function. Alters no existing tables, RLS policies,
-- or triggers. Called only by the file-snapshot submit path
-- (submitSessionWithSnapshot); the existing submitSession() flow is untouched.

create or replace function public.submit_session_atomic(
  p_session_id uuid,
  p_snapshot jsonb,
  p_disclosed boolean
)
returns table (
  submission_id uuid,
  already_submitted boolean,
  receipt_hash text
)
language plpgsql
as $$
declare
  v_session public.sim_sessions%rowtype;
  v_existing_id uuid;
  v_existing_receipt text;
  v_new_id uuid;
begin
  -- Lock the session row so concurrent submits serialize here.
  select * into v_session
  from public.sim_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'session not found';
  end if;

  -- Idempotency: a submission row already exists (unique on session_id).
  select s.id, s.snapshot ->> 'receiptHash'
    into v_existing_id, v_existing_receipt
  from public.sim_submissions s
  where s.session_id = p_session_id;

  if found then
    return query select v_existing_id, true, v_existing_receipt;
    return;
  end if;

  if v_session.status <> 'active' then
    raise exception 'session is not active';
  end if;

  -- The whole file snapshot lives in this single row: one insert is
  -- inherently all-or-nothing for the file set. The remaining updates join
  -- the same transaction, so a failure anywhere rolls everything back.
  insert into public.sim_submissions (session_id, snapshot, external_ai_disclosed)
  values (p_session_id, p_snapshot, p_disclosed)
  returning id into v_new_id;

  update public.sim_sessions
  set status = 'submitted',
      submitted_at = now(),
      external_ai_disclosed = p_disclosed
  where id = p_session_id;

  update public.sim_invitations
  set status = 'completed'
  where id = v_session.invitation_id
    and status <> 'completed';

  insert into public.sim_session_events
    (session_id, event_type, actor, client_event_id, payload, schema_version)
  values
    (p_session_id, 'submission_confirmed', 'system',
     'submit_' || p_session_id::text, '{}'::jsonb, 1)
  on conflict (session_id, client_event_id)
    where client_event_id is not null
    do nothing;

  return query select v_new_id, false, p_snapshot ->> 'receiptHash';
end;
$$;
