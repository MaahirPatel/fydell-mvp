-- 066: Coding-assistant interactions in the authored simulation workspace.
--
-- Additive only. One server-only table records every request a candidate makes
-- to the optional coding assistant, the answer, any proposed patch and the
-- candidate's decision about it. Simulated-teammate conversation stays in
-- eng_messages; the two are never mixed.
--
-- A row can change twice at most: a running request is finished once, and a
-- proposed patch is accepted or rejected once. Rows cannot be deleted.

create table if not exists public.eng_assistant_interactions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.eng_attempts(id) on delete cascade,
  seq bigint generated always as identity,
  client_msg_id text not null check (client_msg_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  prompt text not null check (char_length(prompt) between 1 and 4000),
  context_paths text[] not null default '{}' check (cardinality(context_paths) <= 6),
  context_sha256 text check (context_sha256 is null or context_sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'running'
    check (status in ('running', 'answered', 'provider_unavailable', 'limit_reached', 'policy_blocked', 'invalid_output')),
  answer text not null default '' check (char_length(answer) <= 12000),
  patch jsonb check (patch is null or (jsonb_typeof(patch) = 'array' and pg_column_size(patch) <= 262144)),
  decision text not null default 'none' check (decision in ('pending', 'accepted', 'rejected', 'none')),
  decided_at timestamptz,
  applied_revision integer check (applied_revision is null or applied_revision >= 1),
  provider text,
  model text,
  usage jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (attempt_id, client_msg_id)
);
create index if not exists idx_eng_assistant_interactions_attempt on public.eng_assistant_interactions (attempt_id, seq);

create or replace function public.eng_assistant_interaction_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'assistant interactions cannot be deleted';
  end if;
  if new.id is distinct from old.id or new.attempt_id is distinct from old.attempt_id or new.seq is distinct from old.seq
     or new.client_msg_id is distinct from old.client_msg_id or new.prompt is distinct from old.prompt
     or new.context_paths is distinct from old.context_paths or new.context_sha256 is distinct from old.context_sha256
     or new.created_at is distinct from old.created_at then
    raise exception 'assistant interaction identity cannot change';
  end if;
  if old.status = 'running' then
    if new.status = 'running' or new.decided_at is not null or new.applied_revision is not null
       or new.decision not in ('pending', 'none') then
      raise exception 'a running assistant interaction can only be finished';
    end if;
    return new;
  end if;
  if old.decision = 'pending' and new.decision in ('accepted', 'rejected')
     and new.status is not distinct from old.status and new.answer is not distinct from old.answer
     and new.patch is not distinct from old.patch and new.provider is not distinct from old.provider
     and new.model is not distinct from old.model and new.usage is not distinct from old.usage
     and new.finished_at is not distinct from old.finished_at and new.decided_at is not null then
    return new;
  end if;
  raise exception 'assistant interaction % is final', old.id;
end $$;

drop trigger if exists eng_assistant_interactions_guard on public.eng_assistant_interactions;
create trigger eng_assistant_interactions_guard before update or delete on public.eng_assistant_interactions
  for each row when (pg_trigger_depth() = 0) execute function public.eng_assistant_interaction_guard();

-- Atomic, idempotent claim. A retry with the same client id returns the
-- existing row. Otherwise the request is counted against p_limit under a
-- per-attempt advisory lock; past the limit a final limit_reached row is
-- stored instead, so the attempt record shows the request was refused.
-- Running rows older than p_stale_seconds no longer count.
create or replace function public.eng_claim_assistant_interaction(
  p_attempt_id uuid,
  p_client_msg_id text,
  p_prompt text,
  p_context_paths text[],
  p_context_sha256 text,
  p_limit integer,
  p_stale_seconds integer
)
returns setof public.eng_assistant_interactions
language plpgsql security definer set search_path = public as $$
declare
  existing public.eng_assistant_interactions;
  used integer;
begin
  perform pg_advisory_xact_lock(hashtext('eng_assistant_interactions:' || p_attempt_id::text));
  select * into existing from public.eng_assistant_interactions
    where attempt_id = p_attempt_id and client_msg_id = p_client_msg_id;
  if found then
    return next existing;
    return;
  end if;
  select count(*) into used from public.eng_assistant_interactions
    where attempt_id = p_attempt_id
      and (status in ('answered', 'invalid_output')
           or (status = 'running' and created_at > now() - make_interval(secs => p_stale_seconds)));
  if used >= p_limit then
    return query insert into public.eng_assistant_interactions
        (attempt_id, client_msg_id, prompt, context_paths, context_sha256, status, finished_at)
      values (p_attempt_id, p_client_msg_id, p_prompt, p_context_paths, p_context_sha256, 'limit_reached', now())
      returning *;
    return;
  end if;
  return query insert into public.eng_assistant_interactions
      (attempt_id, client_msg_id, prompt, context_paths, context_sha256)
    values (p_attempt_id, p_client_msg_id, p_prompt, p_context_paths, p_context_sha256)
    returning *;
end $$;

revoke all on function public.eng_claim_assistant_interaction(uuid, text, text, text[], text, integer, integer) from public, anon, authenticated;
grant execute on function public.eng_claim_assistant_interaction(uuid, text, text, text[], text, integer, integer) to service_role;

alter table public.eng_assistant_interactions enable row level security;
alter table public.eng_assistant_interactions force row level security;
revoke all on public.eng_assistant_interactions from anon;
revoke all on public.eng_assistant_interactions from authenticated;
