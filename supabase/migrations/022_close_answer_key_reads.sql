-- 022_close_answer_key_reads.sql
--
-- Additive, policy-only. Creates no tables and moves no data.
--
-- Four tables let a signed-in browser read columns that the product treats as
-- assessor-only. Row-level policies cannot express "this row, minus these two
-- columns", so the fix is column privileges: revoke the table-level SELECT that
-- implicitly covers every column, then grant back the safe list. Postgres
-- deliberately ignores a column-level revoke while a table-level grant is still
-- in place, so revoking first is what makes this work.
--
-- The service role is untouched. Every server route already reads these tables
-- through the admin client, so the employer report, the defense generator and
-- the analysis engine keep working; only direct PostgREST reads lose access.

-- 1. Oral defense answer key ---------------------------------------------------
--
-- `expected_understanding` is what a good answer looks like, and
-- `source_evidence_ids` points at the evidence the question was built from. The
-- API route projects both away, but the RLS policy grants the candidate SELECT
-- on the whole row, so a candidate querying Supabase directly could read the
-- answer before answering. The projection was necessary and not sufficient.

revoke select on public.oral_defense_questions from authenticated;
grant select (
  id,
  defense_set_id,
  sort_order,
  question_text,
  purpose,
  generator_version,
  created_at
) on public.oral_defense_questions to authenticated;

-- 2. Relay scenario events -----------------------------------------------------
--
-- Migration 017 says "block direct select of evaluator_only by denying select on
-- the base table for non-service" and then creates a policy that does not do
-- that. The candidate-safe view exists; the base table was still readable.

revoke select on public.scenario_events from authenticated;
grant select (
  id,
  session_id,
  event_key,
  utility_score,
  triggered_at,
  acknowledged_at,
  candidate_visible_text
) on public.scenario_events to authenticated;

-- 3. Evaluation case results ---------------------------------------------------
--
-- `expected` is the golden-set answer for a graded case. `session_visible()`
-- resolves true for the candidate who owns the session, so ground truth was
-- readable by the person being graded against it.

revoke select on public.evaluation_case_results from authenticated;
grant select (
  id,
  run_id,
  case_id,
  predicted,
  severity,
  ok,
  created_at
) on public.evaluation_case_results to authenticated;

-- 4. Draft simulation templates ------------------------------------------------
--
-- The 010 policy reads `status = 'published' or auth.role() = 'authenticated'`.
-- The second branch is true for every signed-in user, so the whole clause is
-- always true and unpublished templates, including their `configuration`
-- payload, were readable across tenants. Published-only was the intent.

drop policy if exists sim_templates_read on public.simulation_templates;
create policy sim_templates_read on public.simulation_templates
  for select using (status = 'published');

-- 5. Ops heartbeat table -------------------------------------------------------
--
-- Created in 010 without RLS. Only the health endpoint writes it, via the
-- service role, so denying client access costs nothing.

alter table public.system_heartbeats enable row level security;

-- Rollback --------------------------------------------------------------------
--
--   grant select on public.oral_defense_questions to authenticated;
--   grant select on public.scenario_events to authenticated;
--   grant select on public.evaluation_case_results to authenticated;
--   drop policy if exists sim_templates_read on public.simulation_templates;
--   create policy sim_templates_read on public.simulation_templates
--     for select using (status = 'published' or auth.role() = 'authenticated');
--   alter table public.system_heartbeats disable row level security;
--
-- Reverting restores the reads described above. Do not revert to work around a
-- broken employer view; those reads belong on the server, through the admin
-- client, behind a projection.
