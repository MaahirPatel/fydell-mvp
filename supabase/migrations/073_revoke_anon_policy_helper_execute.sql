-- Follow-up to 071: the seven security-definer helpers that 071 left
-- executable by signed-out callers.
--
-- Each one answers only for auth.uid(), so a signed-out caller always got
-- false, and no policy on the tables that use them grants rows to anon. The
-- app reads those tables with the service role (or as a signed-in user), and
-- the browser and desktop clients never query them, so public pages are
-- unaffected. After this, a signed-out REST query on one of those tables is
-- refused instead of returning an empty list, and the helpers are no longer
-- callable as anonymous RPCs.

-- Guarded: not every environment has every helper (production has no
-- is_workspace_* functions).
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.is_active_organization_member(uuid)',
    'public.is_org_member(uuid)',
    'public.is_workspace_manager(uuid)',
    'public.is_workspace_member(uuid)',
    'public.receipt_visible(uuid)',
    'public.relay_session_is_owner(uuid)',
    'public.session_visible(uuid)'
  ] loop
    if to_regprocedure(fn) is not null then
      execute format('revoke execute on function %s from public, anon', fn);
      execute format('grant execute on function %s to authenticated, service_role', fn);
    end if;
  end loop;
end $$;
