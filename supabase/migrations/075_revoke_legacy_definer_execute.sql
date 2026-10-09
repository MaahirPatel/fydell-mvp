-- 075: Signed-out callers cannot execute the legacy SECURITY DEFINER
-- functions, and no function in public or mvp keeps a mutable search_path.
--
-- Production still carries objects from supabase/schema.sql and the first MVP
-- (the `mvp` schema and its public `mvp_*` RPC wrappers, gated by a shared
-- secret). The app no longer calls any of them: the only caller,
-- src/lib/mvp/rpc.ts via src/lib/platform-store.ts, is removed alongside this
-- migration. Dev never had these objects, so every step is guarded and is a
-- no-op where the object is missing. Each change is reported with RAISE
-- NOTICE so the apply output lists exactly what was touched.
--
-- Privilege and search_path changes only: no table, row or function body is
-- modified. Triggers fire regardless of EXECUTE, so revoking it on trigger
-- functions (handle_new_user, set_updated_at) does not affect them.

do $$
declare
  fn text;
  r record;
  policy_ref boolean;
  legacy_helpers text[] := array[
    'public.current_email()',
    'public.current_org_id()',
    'public.is_company_user()'
  ];
begin
  -- Legacy RLS helpers. They answer only about auth.uid(); signed-in users
  -- keep EXECUTE because legacy policies on production may reference them.
  foreach fn in array legacy_helpers loop
    if to_regprocedure(fn) is not null then
      execute format('revoke execute on function %s from public, anon', fn);
      execute format('grant execute on function %s to authenticated, service_role', fn);
      raise notice '075: revoked anon/public on %', fn;
    end if;
  end loop;

  -- Signup trigger function: never called directly by any API role.
  if to_regprocedure('public.handle_new_user()') is not null then
    revoke execute on function public.handle_new_user() from public, anon, authenticated;
    grant execute on function public.handle_new_user() to service_role;
    raise notice '075: revoked anon/public/authenticated on public.handle_new_user()';
  end if;

  -- MVP RPCs: every function in schema mvp and every public.mvp_* wrapper.
  -- Their signatures are not in this repository, so they are found in the
  -- catalog. Signed-in users keep EXECUTE only if a policy references one.
  for r in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.prokind = 'f'
      and (n.nspname = 'mvp' or (n.nspname = 'public' and p.proname like 'mvp\_%'))
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    select exists (
      select 1 from pg_policies pol
      where coalesce(pol.qual, '') || coalesce(pol.with_check, '') ~ ('\m' || r.proname || '\M')
    ) into policy_ref;
    execute format('revoke execute on function %s from public, anon', r.sig);
    if policy_ref then
      execute format('grant execute on function %s to authenticated, service_role', r.sig);
      raise notice '075: revoked anon/public on % (kept authenticated: used by a policy)', r.sig;
    else
      execute format('revoke execute on function %s from authenticated', r.sig);
      execute format('grant execute on function %s to service_role', r.sig);
      raise notice '075: revoked anon/public/authenticated on %', r.sig;
    end if;
  end loop;

  -- Anything else in public or mvp that is SECURITY DEFINER and still
  -- executable by anon. The app needs none (dev has had none since 071 and
  -- 073); signed-in users keep EXECUTE so authenticated RLS is unchanged.
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'mvp')
      and p.prosecdef
      and has_function_privilege('anon', p.oid, 'execute')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke execute on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated, service_role', r.sig);
    raise notice '075: revoked anon/public on % (catch-all)', r.sig;
  end loop;

  -- Pin search_path where none is set (e.g. mvp.set_updated_at). The value
  -- matches the default resolution for these schemas, so bodies resolve
  -- names exactly as before; pg_temp last stops temp-schema shadowing.
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_language l on l.oid = p.prolang
    where n.nspname in ('public', 'mvp')
      and l.lanname in ('plpgsql', 'sql')
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c where c like 'search_path=%')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    begin
      execute format('alter function %s set search_path = public, pg_temp', r.sig);
      raise notice '075: pinned search_path on %', r.sig;
    exception when insufficient_privilege then
      raise notice '075: could not pin search_path on % (not owner)', r.sig;
    end;
  end loop;
end $$;
