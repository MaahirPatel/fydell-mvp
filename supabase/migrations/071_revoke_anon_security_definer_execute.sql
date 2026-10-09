-- 071: Signed-out callers cannot execute SECURITY DEFINER helpers.
--
-- Postgres grants EXECUTE to PUBLIC by default, so every helper below was
-- callable through /rest/v1/rpc by the anon role. Each one answers about
-- auth.uid(), so anon only ever got false or an exception, but a definer
-- function reachable without signing in is attack surface with no purpose.
--
-- Only helpers whose RLS policies are all scoped TO authenticated are
-- changed here; helpers referenced by policies that apply to every role
-- (is_active_organization_member, is_org_member, is_workspace_*,
-- receipt_visible, relay_session_is_owner, session_visible) keep their
-- grants so anon reads of those tables keep returning empty sets instead of
-- permission errors. Privilege changes only: no table, row or function body
-- is modified.

do $$
declare
  fn text;
  helpers text[] := array[
    'public.bump_manual_project_version(uuid)',
    'public.has_organization_role(uuid, text[])',
    'public.has_platform_role(text[])',
    'public.is_organization_member(uuid)',
    'public.is_platform_admin()',
    'public.proof_run_visible(uuid)',
    'public.sim_session_owned(uuid)'
  ];
begin
  foreach fn in array helpers loop
    if to_regprocedure(fn) is not null then
      execute format('revoke execute on function %s from public, anon', fn);
      execute format('grant execute on function %s to authenticated, service_role', fn);
    end if;
  end loop;

  -- Trigger function: triggers fire regardless of EXECUTE, so no API role
  -- needs to call it directly.
  if to_regprocedure('public.prevent_last_super_admin_removal()') is not null then
    revoke execute on function public.prevent_last_super_admin_removal() from public, anon, authenticated;
    grant execute on function public.prevent_last_super_admin_removal() to service_role;
  end if;
end $$;
