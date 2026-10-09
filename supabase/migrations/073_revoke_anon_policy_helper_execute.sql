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

revoke execute on function public.is_active_organization_member(uuid) from public, anon;
revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.is_workspace_manager(uuid) from public, anon;
revoke execute on function public.is_workspace_member(uuid) from public, anon;
revoke execute on function public.receipt_visible(uuid) from public, anon;
revoke execute on function public.relay_session_is_owner(uuid) from public, anon;
revoke execute on function public.session_visible(uuid) from public, anon;

grant execute on function public.is_active_organization_member(uuid) to authenticated, service_role;
grant execute on function public.is_org_member(uuid) to authenticated, service_role;
grant execute on function public.is_workspace_manager(uuid) to authenticated, service_role;
grant execute on function public.is_workspace_member(uuid) to authenticated, service_role;
grant execute on function public.receipt_visible(uuid) to authenticated, service_role;
grant execute on function public.relay_session_is_owner(uuid) to authenticated, service_role;
grant execute on function public.session_visible(uuid) to authenticated, service_role;
