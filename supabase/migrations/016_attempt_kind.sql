-- First-class attempt kinds so preview/demo runs never mix into production analytics.
-- scored = real candidate attempt; preview = employer walkthrough; demonstration = labeled demo.

alter table public.relay_sessions
  add column if not exists attempt_kind text not null default 'scored';

alter table public.relay_sessions
  drop constraint if exists relay_sessions_attempt_kind_check;

alter table public.relay_sessions
  add constraint relay_sessions_attempt_kind_check
  check (attempt_kind in ('scored', 'preview', 'demonstration'));

create index if not exists relay_sessions_attempt_kind_idx
  on public.relay_sessions (mission_id, attempt_kind)
  where attempt_kind <> 'scored';

comment on column public.relay_sessions.attempt_kind is
  'scored = production candidate attempt; preview/demonstration excluded from hiring analytics';
