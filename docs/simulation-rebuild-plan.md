# Simulation rebuild: plan and ledger

Companion to `docs/simulation-rebuild-audit.md`. Updated after each phase. This
is a ledger, not a substitute for the work.

## The blocking dependency

No isolated Supabase environment exists. Everything the audit could not verify —
the entire loop from invitation to revocation — is blocked on it. A Supabase
*branch* costs about $9.70/month recurring and was declined. A separate Supabase
*project* is free on the current plan and is the chosen route.

Until that project exists and the 22 migrations are applied to it, phases that
depend on real data cannot be closed honestly. Deterministic work that does not
need a database is sequenced first so the blocker stops nothing that can proceed
without it.

## Status

| Phase | Scope | State |
|---|---|---|
| 0 | Audit, ledger, hermetic runner, lint zero, security migration | **done, except the dev environment** |
| 0b | Isolated Supabase project, gated seed, `.env.example` | **blocked on project creation** |
| 1 | Domain types and server-side state machines | **defined and tested; not yet enforced at any call site** |
| 2 | Simulation Definition V3 schema and attempt manifest | not started |
| 3 | Northline resource bundle with stable IDs and checksums | **bundle, ground truth and fixture test done; not yet served to a workbench** |
| 4 | Durable workbench: leases, outbox, idempotency, recovery | not started |
| 5 | Submission as an atomic server-controlled boundary | not started |
| 6 | Analysis Engine V3 and the evidence graph | not started |
| 7 | Oral defense: immutable, versioned, actor-safe | not started |
| 8 | Employer report and candidate result as distinct projections | not started |
| 9 | Work Receipts: close the raw `/results/[token]` bypass | not started |
| 10 | Consolidate signup, onboarding, invitation return | partly done |
| 11–13 | Employer app, candidate experience, public site | largely done in the prior pass |
| 14 | Outcome loop and first-90-days | not started |
| 15–16 | Authorization matrix, API contracts | partly done |
| 17 | Golden fixtures, integration tests, true Playwright path | not started |
| 18–19 | Operator controls, staged rollout | not started |

## Phase 0: completed in this pass

**Invariant established:** the repository can be linted, typechecked and built
reproducibly, its history is described accurately, and no signed-in browser can
read an assessor-only column.

Changed:

- `package.json` — `tsx` added to `devDependencies`; 22 scripts moved off `npx` so no release command downloads an undeclared package.
- `eslint.config.mjs` — vendored agent skills and generated `sim-engine` bundles removed from scope; `require()` allowed in CommonJS Node scripts. Both documented in the config.
- 16 real lint errors fixed rather than suppressed. See the audit for the breakdown.
- `src/lib/client/local-storage.ts` — new. `useStoredString` and `useIsHydrated` over `useSyncExternalStore`.
- `supabase/migrations/015_fde_evidence_math.sql` — repaired. It contained 23 leaked line-number prefixes and was invalid SQL.
- `supabase/migrations/022_close_answer_key_reads.sql` — new. Closes four read paths.

### Migration 022

Policy and privilege only. No tables, no data movement.

| Target | Change |
|---|---|
| `oral_defense_questions` | table SELECT revoked from `authenticated`, safe columns granted back; `expected_understanding` and `source_evidence_ids` withheld |
| `scenario_events` | same shape; `evaluator_only` withheld |
| `evaluation_case_results` | same shape; `expected` withheld |
| `simulation_templates` | always-true policy replaced with `status = 'published'` |
| `system_heartbeats` | RLS enabled |

Column privileges rather than policies because RLS is row-level and cannot
express "this row, minus two columns". Postgres ignores a column-level revoke
while a table-level grant stands, so the grant is revoked first and the safe
column list granted back.

**Safe because** every read of these tables in `src/` is server-side through
`createAdminSupabaseClient()` in a `server-only` module. The service role is
untouched.

**Rollback** is written into the migration footer.

**Not yet applied to any database.** It must be applied to the isolated project
first and the employer report, defense generation and health check re-verified
before it goes near production.

## Phases 1 and 3: completed in this pass

Both are deterministic and need no database, which is why they were sequenced
ahead of the blocked environment work.

### Phase 1: the state machines

`src/lib/simulations/v3/state.ts` declares five machines — invitation, attempt,
analysis, defense, receipt — as data rather than as scattered `if` statements.
Each edge names the actors allowed to traverse it, so authorization is part of
the transition rather than a check someone remembers to write beside it.

Three properties the loop depends on, now enforced by `npm run test:states`:

- **Repeats are safe.** A retried submission, a re-opened invitation link and a
  second revoke all succeed without claiming a change happened. Retryable
  operations need this or the outbox in phase 4 has nothing to build on.
- **The order cannot be skipped.** An attempt cannot reach a report without
  passing through submission, a submitted attempt cannot return to active, and a
  finished report cannot be reopened. `submission_pending` falls back to
  `active` on failure rather than advancing, which is what makes phase 5's
  atomic boundary expressible.
- **Actors are separated.** A candidate cannot mark their own defense reviewed,
  void their own attempt, or authorize their own retake. No employer actor
  appears anywhere in the receipt machine, which is the state-machine expression
  of "the candidate controls the receipt" — asserted directly, so a later edit
  that hands an employer a revoke right fails the suite.

`assertSameTenant` is separate on purpose: a transition can be perfectly legal
in isolation and still be refused because the record belongs to another
organization. The test asserts exactly that pairing.

Structural checks run over every machine: no unreachable state, no non-terminal
dead end, no edge to an undeclared state, no outgoing edge from a terminal
state. Adding a state without wiring it in fails.

**What this is not:** no call site enforces these yet. The machines are the
contract; wiring them into the session and invitation routes is phase 5 and
after. Until then a route can still make a move the machine forbids.

### Phase 3: the Northline bundle

`src/lib/simulations/v3/content/northline/data.ts` holds the scenario as
structured records — production runs, quality events, reported metrics, and
three documents — every row and section carrying a stable ID. `EvidenceSourceRef`
addresses a cell, a row or a section by those IDs, so a citation points at a
coordinate rather than at a quoted string that drifts when the data is edited.

`truth.ts` recomputes the scenario's facts from the bundle instead of restating
them. Nothing in the ground truth is typed twice.

`npm run test:v3` verifies structure, SHA-256 checksums over canonicalized
content, internal arithmetic, and that every evidence reference resolves. It
already caught the reason this rebuild exists: the published yields in the
original scenario did not reconcile with the events that were supposed to
explain them. A candidate doing the arithmetic correctly would have disagreed
with the answer key. The data was corrected; the test now fails if any row moves
without the expected values and checksums moving with it.

**What this is not:** the bundle is not yet reachable from a template version or
a workbench. That needs the phase 2 definition schema and the attempt manifest.

## Phase 0b: the isolated environment

Ordered steps:

1. Create a free Supabase project, separate from production.
2. Apply migrations `001`–`022` in order. Record which fail and why; the audit
   already predicts disagreement because `004` and `005` are notes and
   `organizations` lives in `schema.sql`.
3. Reconcile the migration chain with the live schema so the directory becomes a
   true description of the database.
4. Write `.env.example` with every required variable and no values.
5. Build a seed command that refuses to run when the Supabase host matches the
   production project, seeds one workspace, one evaluator, three candidate
   personas, a published Northline template version and invitations in several
   states, and cleans up only within its own tenant.
6. Re-point `verify:migrations` at the full table set rather than migration 010.

**Gate:** `npm run verify:migrations` and `npm run test:rls-smoke` pass against
the isolated project, and the RLS matrix in the audit is confirmed by execution
rather than by reading policy text.

## Then: run the loop before rebuilding it

Before any V3 work, run the existing loop end to end against the isolated
project: create a workspace, invite a candidate, accept, consent, preflight,
start, work, trigger the curveball, submit, score, read the employer report,
answer a defense question, create a receipt share, open it as an outsider,
revoke it, confirm denial.

This is not ceremony. The audit lists ten integrity risks inferred from source
that have never been observed. Rebuilding on top of unverified assumptions about
what currently breaks would waste the rebuild.

**Gate:** a written account of every step that failed, which becomes the real
input to phases 1 through 9.

## Feature flag

`SIMULATION_V3_ENABLED`, plus a capability field on the template version, so V3
attempts can be created for an internal tenant while existing sessions continue
to read and score through the current path. Not yet added; it belongs with the
first V3 schema work in phase 2, where it has something to gate.

## Rollback points

- Every migration from `022` onward carries a rollback note in its footer.
- V3 rolls back by disabling new V3 assignment, never by deleting data.
- Old attempt readers and reports stay stable throughout; `engine_version` on
  `sim_analysis_runs` already distinguishes generations.

## Standing acceptance gates

Every phase: `npm run lint`, `npm run typecheck`, `npm run build`,
`npm run test:unit`, `npm run test:copy`. Zero lint errors is now the baseline
and regressions are not accepted.

Phases touching the database add `verify:migrations` and `test:rls-smoke`.
Phases touching analysis add golden fixtures. Phases touching UI add
`test:a11y`, `test:responsive` and screenshots at 1440x900 and 1280x800.

## Honest statement of scale

The brief describes 20 phases. Three are complete: 0, 1 and 3. All three are
deterministic groundwork that runs without a database, which is precisely why
they could be finished while the environment stays blocked.

What remains is the larger half and it is not sequenced this way by accident.
Durable sync with leases and an outbox, atomic submission, an evidence graph,
immutable defense sets and the golden-path suite all need a database to be
verified rather than asserted. The isolated project is still the gate. Until the
existing loop has been run end to end against it, phases 4 through 9 would be
built on ten integrity risks that have been inferred from source and never
observed.

This remains a multi-week effort and should not be represented otherwise in any
status update.
