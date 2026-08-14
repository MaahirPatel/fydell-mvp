# Wave 1 database security verification

Target: `fydell-dev` (`btbmvrvynnrhapjdkunz`). Production (`qtrhwrcxthtqvkeerptp`) was
not contacted at any point in this work.

Migrations applied: `023_org_rls_and_view_invoker`, `024_candidate_view_grant_order`.

## What was actually wrong

Both reported findings were real, and both were worse than the linter said.

**`public.organizations` had RLS disabled.** Migration 009 created
`organizations_select_member`, but no migration ever ran `enable row level
security`, so Postgres never consulted the policy. The table also still carried
the schema's default grants. Measured before the fix, `anon` and `authenticated`
each held `SELECT`, `INSERT` and `UPDATE` on all seventeen columns with nothing
filtering rows. This was a full read *and* write hole on the tenant root, not
the read-only exposure the advisor described.

**`public.scenario_events_candidate` was not `security_invoker`.** Migration 017
created it without the option, so it executed as `postgres`, which holds
`BYPASSRLS`. Both RLS policies on `scenario_events` were skipped for every
caller. Worse, it is a simple auto-updatable view and `anon` held
`INSERT`/`UPDATE`/`DELETE` on it, so the view was a write path into the base
table that ignored RLS entirely. Migration 022 had revoked the evaluator column
from `authenticated` on the base table; the view was the way around that.

Three further gaps surfaced while verifying:

- 022 revoked answer-key columns from `authenticated` only. `anon` kept `SELECT`
  on `scenario_events.evaluator_only`, `oral_defense_questions.expected_understanding`
  and `evaluation_case_results.expected`. RLS denied the rows, so nothing leaked,
  but the grant was the half of 022 that did not land.
- `sim_template_versions.content` is the DA-01 answer key in full. RLS with no
  policy was the only thing denying it; `anon` and `authenticated` both held
  `SELECT` on the column.
- `simulation_templates.configuration` (legacy, migration 010) was readable by
  every visitor for any row with `status = 'published'`. The staging row's
  configuration is empty, so nothing leaked here either, but the shape of the
  exposure was real.

## What 023 and 024 do

`organizations` gets RLS enabled and forced, the `anon`/`authenticated` grants
revoked, and `SELECT` granted back to `authenticated` alone. The member policy is
recreated. No insert, update or delete policy exists for either client role, so
writes are refused at the privilege layer before RLS is even consulted.

Organization creation is unaffected. Every write in the product runs through
`createAdminSupabaseClient`, and `service_role` has `BYPASSRLS` (confirmed
against the live catalog: `rolbypassrls = true` for both `service_role` and
`postgres`). `FORCE` is therefore a no-op today and exists to close the
owner-side bypass if the table is ever reassigned.

The candidate view is recreated with `security_invoker = true`, granted `SELECT`
to `authenticated` only, and revoked from `anon`.

`024` exists because the first applied revision of `023` had an ordering bug.
The project carries `alter default privileges in schema public grant all on
tables to anon, authenticated`, and that default covers views, so the revoke
written *before* `CREATE VIEW` was handed straight back by the create. The live
grant check caught it: after 023, `anon` still held `SELECT`, `INSERT` and
`UPDATE` on the view. 023 is reordered in the repository so a fresh database is
correct in one step, and 024 converges the database that already ran the earlier
ordering. `scripts/test-db-security-contract.ts` now asserts the ordering.

## Live role matrix

Run against `fydell-dev` inside a transaction that created six identities, two
organizations, an accepted invitation, a submitted session, a submission, a
mission, a relay session and a scenario event carrying an answer key, exercised
every actor, and then rolled back. Nothing persisted.

Actors act through `set local role` plus `request.jwt.claims`, which is the same
path PostgREST uses for a real session. No service-role key was involved.

`DENIED` means the statement raised. A number is the row count the actor could
reach or change.

| Probe | anon | owner | member | candidate | outsider | removed |
| --- | --- | --- | --- | --- | --- | --- |
| read own organization | DENIED | 1 | 1 | 0 | 0 | 0 |
| read another organization | DENIED | 0 | 0 | 0 | 1 (own) | 0 |
| insert an organization | DENIED | DENIED | DENIED | DENIED | DENIED | DENIED |
| update own organization | DENIED | DENIED | DENIED | DENIED | DENIED | DENIED |
| read `sim_template_versions.content` | DENIED | DENIED | DENIED | DENIED | DENIED | DENIED |
| read `sim_templates` catalog | 0 | 1 | 1 | 1 | 1 | 1 |
| read `simulation_templates.configuration` | DENIED | DENIED | DENIED | DENIED | DENIED | DENIED |
| read `scenario_events_candidate` | DENIED | 0 | 0 | 1 (own) | 0 | 0 |
| read `scenario_events.evaluator_only` | DENIED | DENIED | DENIED | DENIED | DENIED | DENIED |
| insert via `scenario_events_candidate` | DENIED | DENIED | DENIED | DENIED | DENIED | DENIED |
| read `sim_sessions` | 0 | 1 | 1 | 1 (own) | 0 | 0 |
| read `sim_submissions` | 0 | 1 | 1 | 1 (own) | 0 | 0 |
| read `sim_invitations` | 0 | 1 | 1 | 0 | 0 | 0 |
| update session status | 0 | 0 | 0 | 0 | 0 | 0 |

Read the rows that matter:

- The **removed member** behaves exactly like an outsider. `is_organization_member`
  requires `status = 'active'`, so revoking membership revokes reads in the same
  statement.
- The **candidate** can reach their own session, submission and scenario events
  and nothing else. They cannot see the invitation record, the organization, or
  any other candidate's events.
- The **owner and member** can see their organization and its sessions but get
  zero rows from the candidate view, because the base policy scopes those events
  to the relay session's own user. That matches 017's intent.
- Nobody, at any privilege level below `service_role`, can read authored content,
  answer keys, evaluator-only fields or scoring fixtures.

Before 023, the candidate-view row would have read `1` for every actor including
`anon`, because the view bypassed RLS.

## Unauthorized writes into the simulation tables

Second rolled-back transaction, same method.

| Probe | anon | session owner |
| --- | --- | --- |
| insert `sim_sessions` | 0 (no readable template to insert from) | DENIED, RLS |
| insert `sim_submissions` | DENIED, RLS | DENIED, RLS |
| insert `sim_session_events` | DENIED, RLS | DENIED, RLS |
| insert `sim_analysis_runs` | DENIED, RLS | DENIED, RLS |
| insert `sim_template_versions` | DENIED, privilege | DENIED, privilege |
| publish a template | 0 | 0 |
| delete a submission | 0 | 0 |

A candidate cannot forge a submission, fabricate session events, write their own
analysis run and verdict, publish a template, or delete evidence.

## Whole-schema checks

- No table in `public` has RLS disabled: the catalog query returns zero rows.
- Supabase security advisors report no `rls_disabled_in_public` and no
  `security_definer_view` finding, and no ERROR-level finding at all.
- `scripts/test-db-security-contract.ts` (17 checks) guards the migration source
  so the fix cannot silently regress, including a check that every table with a
  policy also enables RLS.

## Known residual, not a blocker

The project's default privileges grant `ALL` on every newly created table in
`public` to `anon` and `authenticated`. Most `sim_*` tables therefore still carry
broad grants, and RLS is what actually denies the writes, as the table above
demonstrates. That is the standard Supabase posture and it is holding, but it
means a future migration that creates a table and forgets RLS is exposed the
moment it lands. The contract test's "policy implies RLS" check covers part of
this; tightening the default privileges themselves is a follow-up worth doing
before the pilot, not a Wave 1 release blocker.

## Service-role key

No service-role key was used for any check on this page. Every probe ran as
`anon` or `authenticated` through the same role and claims path the product
uses. `src/lib/supabase/project-guard.ts` now refuses to construct any Supabase
client when the URL, anon key and service key do not all resolve to the same
project, when a service-role key appears in a `NEXT_PUBLIC_` variable, or when
the target is the production project without an explicit
`FYDELL_ALLOW_PRODUCTION_DB=true`. `scripts/test-project-guard.ts` covers all
eleven cases, including that a refusal never echoes key material.

**Deployment note:** because production is now on an explicit denylist, the
production deployment must set `FYDELL_ALLOW_PRODUCTION_DB=true` before the next
release or the server will refuse to build its Supabase clients. This is
deliberate and fail-closed.
