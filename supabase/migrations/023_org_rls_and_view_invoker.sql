-- 023_org_rls_and_view_invoker.sql
--
-- Two release-blocking findings, plus the anon half of 022 that was missed.
-- Additive and policy/grant only. Creates no table, drops no data.
--
-- Finding 1 — public.organizations had RLS disabled while carrying a policy.
--
--   009 created `organizations_select_member`, but nothing ever ran
--   `alter table public.organizations enable row level security`. A policy on a
--   table with RLS disabled is inert: Postgres never consults it. The table also
--   still carried the default `anon`/`authenticated` grants, so in the exposed
--   `public` schema every signed-out visitor could SELECT, INSERT and UPDATE
--   every organization row through PostgREST. This is a read *and* write hole,
--   not only the read the linter reports.
--
-- Finding 2 — public.scenario_events_candidate ran as its owner.
--
--   017 created the candidate-safe view without `security_invoker`, so it
--   executes as `postgres`, which holds BYPASSRLS. Both RLS policies on
--   `scenario_events` were therefore skipped for anyone querying the view, and
--   the view is a simple auto-updatable view with INSERT/UPDATE/DELETE granted
--   to `anon` and `authenticated` — so it was a cross-session read channel and a
--   write channel into the base table. 022 revoked the base table's evaluator
--   column from `authenticated`; the view was the way around that.
--
-- Finding 3 — 022 revoked answer-key columns from `authenticated` only.
--
--   `anon` kept SELECT on `scenario_events.evaluator_only`,
--   `oral_defense_questions.expected_understanding` and
--   `evaluation_case_results.expected`. RLS denies those rows to `anon` today,
--   so the grant is not currently reachable, but the grant is what 022 meant to
--   remove and it is the only thing standing between a future policy mistake and
--   a published answer key.
--
-- Why the writes stay working
-- ---------------------------
-- Every organization insert/update in the application runs through the admin
-- client (`createAdminSupabaseClient`): employer workspace bootstrap, pilot
-- lifecycle, pilot approval, workspace rename, admin repair. `service_role` has
-- BYPASSRLS, so enabling and forcing RLS does not touch the signup or
-- organization-creation path. No browser code reads these tables directly; the
-- only browser Supabase client is used for auth sessions.
--
-- FORCE is included because it removes the owner-side bypass if the table is
-- ever reassigned to a role without BYPASSRLS. It is a no-op for `postgres` and
-- `service_role` as they stand today.
--
-- Rollback is at the bottom of this file.

-- ---------------------------------------------------------------------------
-- 1. organizations: RLS on, forced, read-only for members, no client writes
-- ---------------------------------------------------------------------------

revoke all on table public.organizations from anon;
revoke all on table public.organizations from authenticated;

-- Members read their own organization. Nothing else is granted, so INSERT,
-- UPDATE and DELETE are refused at the privilege layer before RLS is consulted.
grant select on table public.organizations to authenticated;
grant all on table public.organizations to service_role;

alter table public.organizations enable row level security;
alter table public.organizations force row level security;

drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member on public.organizations
  for select to authenticated
  using (
    public.is_organization_member(id)
    or public.is_platform_admin()
    or owner_id = auth.uid()
  );

-- No insert/update/delete policy is defined for anon or authenticated. Writes
-- belong to the server's service-role client, which validates the Wave 1
-- permission matrix (edit_workspace: owner/admin) before it writes.

comment on table public.organizations is
  'Tenant root. RLS enabled and forced. Members read their own row; all writes go through the service role after a server-side permission check.';

-- ---------------------------------------------------------------------------
-- 2. scenario_events_candidate: security_invoker, read-only, authenticated only
-- ---------------------------------------------------------------------------

drop view if exists public.scenario_events_candidate;

create view public.scenario_events_candidate
  with (security_invoker = true)
as
  select id, session_id, event_key, triggered_at, acknowledged_at, candidate_visible_text
  from public.scenario_events;

-- Order matters. This project carries
-- `alter default privileges in schema public grant all on tables to anon,
-- authenticated`, and that default applies to views as well as tables. A revoke
-- written before the CREATE is silently undone by the CREATE. Revoke after.
revoke all on public.scenario_events_candidate from anon;
revoke all on public.scenario_events_candidate from authenticated;

-- With security_invoker the view is evaluated as the caller, so both the
-- `scenario_events` RLS policies and the 022 column grants now apply through it.
-- SELECT only: the view is auto-updatable and must not be a write path.
grant select on public.scenario_events_candidate to authenticated;
grant all on public.scenario_events_candidate to service_role;

comment on view public.scenario_events_candidate is
  'Candidate-safe projection of scenario_events. security_invoker = true, so the base table RLS and column grants apply to the caller. Read-only; never granted to anon.';

-- ---------------------------------------------------------------------------
-- 3. Finish 022 for anon: answer keys and evaluator-only columns
-- ---------------------------------------------------------------------------

revoke all on public.scenario_events from anon;
revoke all on public.oral_defense_questions from anon;
revoke all on public.evaluation_case_results from anon;

-- ---------------------------------------------------------------------------
-- 4. sim_template_versions: authored content is the answer key
-- ---------------------------------------------------------------------------
--
-- `content` holds the DA-01 fixture in full: correct options, expected evidence,
-- scoring concepts, keyword lists and stakeholder withholds. RLS is enabled with
-- no policy, so rows are already unreachable, but the table-level SELECT grant
-- to `anon` and `authenticated` should never have been there. The catalog and
-- the workbench read this table through the admin client only.

revoke all on public.sim_template_versions from anon;
revoke all on public.sim_template_versions from authenticated;

-- ---------------------------------------------------------------------------
-- 5. simulation_templates (legacy 010): configuration is not public
-- ---------------------------------------------------------------------------
--
-- 022 narrowed this policy to published rows, which was right, but a published
-- row still exposed `configuration` to every visitor. Column privileges are the
-- only way to say "this row, minus that column", so revoke first and grant the
-- catalog columns back. `anon` gets nothing: the public catalog is rendered by
-- the server.

revoke all on public.simulation_templates from anon;
revoke all on public.simulation_templates from authenticated;
grant select (
  id,
  key,
  name,
  description,
  version,
  role_family,
  duration_minutes,
  status,
  published_at,
  created_at,
  updated_at
) on public.simulation_templates to authenticated;

-- Rollback --------------------------------------------------------------------
--
--   alter table public.organizations no force row level security;
--   alter table public.organizations disable row level security;
--   grant all on table public.organizations to anon, authenticated;
--   drop view if exists public.scenario_events_candidate;
--   create view public.scenario_events_candidate as
--     select id, session_id, event_key, triggered_at, acknowledged_at,
--            candidate_visible_text
--     from public.scenario_events;
--   grant select on public.scenario_events_candidate to authenticated;
--   grant select on public.sim_template_versions to anon, authenticated;
--   grant select on public.simulation_templates to anon, authenticated;
--
-- Reverting re-opens cross-tenant reads and writes on organizations and turns
-- the candidate view back into an RLS bypass. Do not revert to unblock a broken
-- employer or admin screen; those reads belong on the server behind the admin
-- client and a projection.
