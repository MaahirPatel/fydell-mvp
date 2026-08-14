-- 024_candidate_view_grant_order.sql
--
-- Forward fix for a defect in the first applied revision of 023.
--
-- 023 revoked `anon` and `authenticated` from public.scenario_events_candidate
-- and then dropped and recreated the view. This project carries
--
--   alter default privileges in schema public grant all on tables
--     to anon, authenticated;
--
-- and that default covers views, so CREATE VIEW immediately handed
-- arwdDxtm straight back. Verification caught it: after 023, `anon` still held
-- SELECT, INSERT and UPDATE on the view. 023 has been reordered in the
-- repository so a fresh database is correct in one step; this migration
-- converges any database that already ran the earlier ordering.
--
-- Idempotent. On a fresh database that ran the corrected 023 this re-asserts the
-- same end state and changes nothing.
--
-- The view itself is not touched. It already has security_invoker = true, so RLS
-- on scenario_events and the 022 column grants apply to the caller. This file is
-- only about who may reach the view at all, and with which verbs.

revoke all on public.scenario_events_candidate from anon;
revoke all on public.scenario_events_candidate from authenticated;

grant select on public.scenario_events_candidate to authenticated;
grant all on public.scenario_events_candidate to service_role;

-- Rollback --------------------------------------------------------------------
--
--   grant all on public.scenario_events_candidate to anon, authenticated;
--
-- Reverting restores an anon-writable auto-updatable view over scenario_events.
-- There is no product reason to do this.
