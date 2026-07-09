-- ============================================================================
-- Fydell — Admin permissions patch (idempotent)
-- ----------------------------------------------------------------------------
-- Companion to schema.sql. Paste this WHOLE file into the Supabase SQL editor.
-- Safe to run repeatedly (create or replace / drop policy if exists).
--
-- What this does:
--   1. Adds public.is_admin() — a SECURITY DEFINER helper that returns true
--      only when the caller's profile row has role = 'admin'.
--   2. Adds an ADMIN read (SELECT) policy on every public table. These are
--      *additional* permissive policies: Postgres OR-combines permissive
--      policies, so normal company/candidate access is UNCHANGED — admins
--      simply gain cross-org read access on top of the existing rules.
--   3. Hardens public.handle_new_user() so the role inserted from sign-up
--      metadata is CLAMPED: anything that is not exactly 'candidate' becomes
--      'company'. 'admin' can NEVER be granted via self sign-up metadata
--      (prevents privilege escalation). The existing trigger stays as-is.
--   4. (Bottom) A clearly-marked, commented-out snippet to promote an owner
--      to admin by email.
--
-- NOTE: This file does not create/alter any tables; it assumes schema.sql has
-- already been applied. It only adds a function, policies, and re-defines one
-- function. RLS is expected to already be enabled on every table (it is, in
-- schema.sql).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. is_admin(): true iff the current auth user's profile role = 'admin'.
--    SECURITY DEFINER + fixed search_path so it reads profiles without
--    recursively re-evaluating RLS and cannot be schema-hijacked.
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- 2. Admin read policies — one permissive SELECT policy per table.
--    Each ORs with the existing company/candidate policies, so it only ever
--    GRANTS additional access to admins; it never restricts anyone else.
-- ----------------------------------------------------------------------------
drop policy if exists organizations_admin_select on public.organizations;
create policy organizations_admin_select on public.organizations
  for select using (public.is_admin());

drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select on public.profiles
  for select using (public.is_admin());

drop policy if exists pilots_admin_select on public.pilots;
create policy pilots_admin_select on public.pilots
  for select using (public.is_admin());

drop policy if exists candidate_invites_admin_select on public.candidate_invites;
create policy candidate_invites_admin_select on public.candidate_invites
  for select using (public.is_admin());

drop policy if exists simulation_attempts_admin_select on public.simulation_attempts;
create policy simulation_attempts_admin_select on public.simulation_attempts
  for select using (public.is_admin());

drop policy if exists simulation_events_admin_select on public.simulation_events;
create policy simulation_events_admin_select on public.simulation_events
  for select using (public.is_admin());

drop policy if exists evidence_reports_admin_select on public.evidence_reports;
create policy evidence_reports_admin_select on public.evidence_reports
  for select using (public.is_admin());

drop policy if exists hiring_decisions_admin_select on public.hiring_decisions;
create policy hiring_decisions_admin_select on public.hiring_decisions
  for select using (public.is_admin());

drop policy if exists chat_messages_admin_select on public.chat_messages;
create policy chat_messages_admin_select on public.chat_messages
  for select using (public.is_admin());

drop policy if exists activity_log_admin_select on public.activity_log;
create policy activity_log_admin_select on public.activity_log
  for select using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. Harden handle_new_user(): CLAMP the role coming from user metadata.
--    user_metadata is user-editable, so we must never trust it to grant
--    'admin'. Rule: role = 'candidate' only if the metadata says exactly
--    'candidate'; every other value (including 'admin', null, or garbage)
--    defaults to 'company'. Username/workspace behaviour is unchanged.
--    The trigger trg_on_auth_user_created from schema.sql already points at
--    this function and does not need to be re-created.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, role, workspace)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    case
      when (new.raw_user_meta_data ->> 'role') = 'candidate' then 'candidate'
      else 'company'
    end,
    new.raw_user_meta_data ->> 'workspace'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ============================================================================
-- 4. Promote the founder/owner to admin.
--    This is the ONLY supported way to create an admin (self sign-up cannot).
--    Run once, AFTER the owner has signed up, replacing the email below.
-- ----------------------------------------------------------------------------
-- Promote the founder to admin (run once, replace the email):
-- update public.profiles set role = 'admin' where lower(email) = lower('OWNER_EMAIL_HERE');
-- ============================================================================
-- End of admin.sql
-- ============================================================================
