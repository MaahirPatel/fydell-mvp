-- Runs the evaluation worker and the email outbox drain every minute from the
-- database, without Vercel Pro crons. pg_cron fires a pg_net HTTP GET at the
-- app's existing cron endpoints with the CRON_SECRET bearer header.
--
-- No secret appears here. Both values live in Supabase Vault:
--   fydell_app_url      https base URL of the deployment, e.g. https://app.example.com
--   fydell_cron_secret  the same value as the app's CRON_SECRET
-- Until both exist, scheduling is a no-op. After inserting them, run
--   select public.fydell_schedule_workers();
-- Additive only: new extensions, two functions, and named cron jobs.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function public.fydell_call_worker(target text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text;
  secret text;
  request_id bigint;
begin
  if target not in ('/api/eng/worker', '/api/cron/process-email-outbox') then
    raise exception 'fydell_call_worker: unknown target %', target using errcode = '22023';
  end if;
  select decrypted_secret into base from vault.decrypted_secrets where name = 'fydell_app_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'fydell_cron_secret';
  if base is null or secret is null or base !~ '^https://' or length(secret) < 16 then
    return null;
  end if;
  select net.http_get(
    url := rtrim(base, '/') || target,
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret),
    timeout_milliseconds := 60000
  ) into request_id;
  return request_id;
end;
$$;

create or replace function public.fydell_schedule_workers()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text;
  secret text;
begin
  select decrypted_secret into base from vault.decrypted_secrets where name = 'fydell_app_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'fydell_cron_secret';
  if base is null or secret is null then
    return 'skipped: vault secrets fydell_app_url and fydell_cron_secret are not both set';
  end if;
  if base !~ '^https://' then
    return 'skipped: fydell_app_url must start with https://';
  end if;
  if length(secret) < 16 then
    return 'skipped: fydell_cron_secret is too short';
  end if;
  perform cron.schedule('fydell-evaluation-worker', '* * * * *', $job$select public.fydell_call_worker('/api/eng/worker')$job$);
  perform cron.schedule('fydell-email-outbox', '* * * * *', $job$select public.fydell_call_worker('/api/cron/process-email-outbox')$job$);
  return 'scheduled';
end;
$$;

create or replace function public.fydell_unschedule_workers()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed int := 0;
begin
  if exists (select 1 from cron.job where jobname = 'fydell-evaluation-worker') then
    perform cron.unschedule('fydell-evaluation-worker');
    removed := removed + 1;
  end if;
  if exists (select 1 from cron.job where jobname = 'fydell-email-outbox') then
    perform cron.unschedule('fydell-email-outbox');
    removed := removed + 1;
  end if;
  return format('unscheduled %s job(s)', removed);
end;
$$;

revoke all on function public.fydell_call_worker(text) from public, anon, authenticated;
revoke all on function public.fydell_schedule_workers() from public, anon, authenticated;
revoke all on function public.fydell_unschedule_workers() from public, anon, authenticated;

select public.fydell_schedule_workers();
