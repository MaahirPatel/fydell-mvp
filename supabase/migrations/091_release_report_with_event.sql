-- Releasing a report and recording its history event happen in one
-- transaction, so a crash can no longer leave a released report without its
-- "report released" event. The event carries a fixed client event id per
-- report, so a repeated call cannot log it twice. Additive: the original
-- eng_release_report stays as it is.

create or replace function public.eng_release_report_with_event(
  p_report_id uuid,
  p_actor text,
  p_actor_user_id uuid,
  p_actor_email text,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.eng_reports;
begin
  select * into r from public.eng_reports where id = p_report_id for update;
  if r.id is null or r.status <> 'draft' then
    raise exception 'report % is not a draft', p_report_id;
  end if;
  update public.eng_reports set status = 'superseded'
    where attempt_id = r.attempt_id and status = 'released';
  update public.eng_reports set status = 'released', released_at = now()
    where id = p_report_id;
  update public.eng_evaluation_runs set status = 'ready'
    where id = r.evaluation_run_id and status = 'human_review';
  insert into public.eng_attempt_events (attempt_id, event_type, actor, actor_user_id, actor_email, payload, client_event_id)
  values (
    r.attempt_id,
    case when r.supersedes_id is null then 'report_released' else 'report_correction_released' end,
    p_actor,
    p_actor_user_id,
    p_actor_email,
    coalesce(p_payload, '{}'::jsonb),
    'report_released:' || p_report_id::text
  )
  on conflict (attempt_id, client_event_id) where client_event_id is not null do nothing;
end;
$$;

revoke all on function public.eng_release_report_with_event(uuid, text, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.eng_release_report_with_event(uuid, text, uuid, text, jsonb) to service_role;
