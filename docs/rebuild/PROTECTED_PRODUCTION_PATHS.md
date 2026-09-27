# PROTECTED_PRODUCTION_PATHS

Change-control boundary for the rebuild. Written against `HEAD` (`45d95c1`).

This document exists because the repository contains one system that real
candidates and employers depend on (production Wave 1) and two systems that are
still being built (the isolated `proof_*` graph and the sim-engine lab). The
rebuild happens in the latter two. The first is frozen.

`.cursor/rules/simulation-engine.mdc` already states the rule; this file names
the exact files, tables, and write paths it protects, so that "do not modify
`WorkbenchRunner`" is enforceable rather than aspirational.

---

## 0. The five hard freezes

Stated first and without qualification.

1. **`WorkbenchRunner`** — `src/components/sim/WorkbenchRunner.tsx` is frozen.
2. **v2 scoring** — `src/lib/simulations/v2/*` is frozen.
3. **`sim_session_events` write paths** — every call site of `recordEvent()` is
   frozen.
4. **Current reports** — the `/api/sim/sessions/[id]/report` chain and its
   renderers are frozen.
5. **Historical migrations** — `supabase/migrations/001_*` through `025_*` are
   immutable. No new migrations in this phase.

Everything below elaborates on these five.

---

## 1. `WorkbenchRunner` — FROZEN

| Item | Path |
|---|---|
| Component | `src/components/sim/WorkbenchRunner.tsx` (~2460 lines) |
| Only production entry point | `src/app/sim/[sessionId]/page.tsx` |
| Data contract | `GET /api/sim/sessions/[id]` (`workbench` payload) |
| Candidate-safe projection | `src/lib/simulations/v2/candidate-view.ts` |

Do not edit, rename, move, reformat, "extract shared parts from", refactor the
props of, or wrap this component. Do not route any new surface through it. Do not
change the shape of the `workbench` payload it consumes.

Two invariants must survive untouched:

- **The answer-key boundary.** The file header states it "Never imports
  `microToV2` (answer keys) on the client". Any change that pulls
  `microToV2`, `scoreV2Attempt`, or a v2 definition into a `"use client"`
  module ships the answer key to the browser. This is the single highest-severity
  regression available in this repository.
- **The ownership gate.** `src/app/sim/[sessionId]/page.tsx` redirects unless
  `session.candidate_user_id === user.id`, and redirects again unless
  `isMicroContent(content)`. Neither check may be relaxed, reordered, or moved
  behind a flag.

`src/components/sim/{MicroResultClient,MicroResultView,ResourceViewer,FeedbackForm,AcceptInviteButton}.tsx`
belong to the same runtime and are frozen with it.

New candidate runtime work belongs in `src/components/simulations/` per the
isolation rule, never as an edit here.

---

## 2. v2 scoring — FROZEN

| Item | Path |
|---|---|
| Scorer | `src/lib/simulations/v2/scoring.ts` (`scoreV2Attempt`, line 330) |
| Orchestration | `src/lib/simulations/v2/run.ts` (`runV2Scoring`) |
| Definition adapter | `src/lib/simulations/v2/from-micro.ts` (`microToV2`) |
| Candidate projection | `src/lib/simulations/v2/candidate-view.ts` |
| Types / validation / events / barrel | `v2/{types,validate,events,index}.ts` |
| Upstream content | `src/lib/simulations/content/*.ts` (6 micro definitions) |
| Legacy scorer still read | `src/lib/simulations/micro-scoring.ts` |
| Persisted-shape predicate | `isV2PersistedResult()` |

Frozen because scores are already persisted. `runV2Scoring` writes
`sim_analysis_runs`, `sim_competency_results`, and `sim_evidence_items`
(`run.ts:145,167,193,210,245`) and transitions `sim_sessions`
(`run.ts:295,304,324`). Any change to weights, rubric mapping, competency keys,
evidence extraction, or the persisted JSON shape **silently re-interprets
evaluations that have already been shown to employers**, and breaks
`isV2PersistedResult()` for every historical row.

Also frozen: the six micro content files. Editing a rubric, a resource, a
stakeholder, or a question changes the meaning of scores already computed against
the published `sim_template_versions` row.

Consumers that must keep working unchanged:
`src/components/sim/{EvidenceReport,EvidenceReportV2,MicroResultClient}.tsx`,
`src/app/record/[token]/page.tsx`, `src/app/api/sim/sessions/[id]/report/route.ts`,
`scripts/test-v2-scoring.ts`, `scripts/test-october-pilot.ts`,
`scripts/smoke-vertical-slice.ts`.

`npm run test:v2` and `npm run test:october` must pass unchanged before and after
any rebuild commit.

---

## 3. `sim_session_events` write paths — FROZEN

The event ledger is append-only, idempotent by `client_event_id`, and ordered by
a `seq` column. **It is a scoring input, not telemetry** — `listEvents()` feeds
`micro-scoring.ts:966`, `v2/run.ts:176`, and `report/route.ts:96`. Rewriting,
back-filling, deduplicating, re-typing, or renaming events retroactively changes
scores and reports.

Frozen writer and reader:

- `src/lib/simulations/db.ts:581` `recordEvent()` — insert, `23505` duplicate
  recovery by `(session_id, client_event_id)`.
- `src/lib/simulations/db.ts:623` `listEvents()` — `.order("seq")`.
- Internal calls at `db.ts:522` and `db.ts:810`.

Frozen call sites:

| Route | Lines |
|---|---|
| `src/app/api/sim/sessions/[id]/events/route.ts` | 56 |
| `src/app/api/sim/sessions/[id]/messages/route.ts` | 62, 70, 89 |
| `src/app/api/sim/sessions/[id]/curveball/route.ts` | 49, 83 |
| `src/app/api/sim/sessions/[id]/assistant/route.ts` | 124, 159 |

Prohibited without an explicit, separately approved decision:

- A second write path to `sim_session_events` from any new module.
- Changing `event_type` vocabulary, `actor` enum, `schema_version`, or payload
  shape.
- Any `UPDATE` or `DELETE` against the table.
- Removing `client_event_id` idempotency.
- Emitting engine or scenario/world events into this table. Per the engine rule,
  candidate/telemetry events and scenario/world events are separate, and engine
  telemetry must not be written to production DB tables. `sim-engine`'s own
  ledger is `sim-engine/events/labEventLedger.ts`.

`src/lib/sim-engine/adapters/legacy-compat.ts:8` documents a
`sim_session_events`-shaped payload and explicitly notes it is "not written
yet". **It must stay not-written in this phase.**

Sibling state table, frozen with it: `sim_session_state` and
`saveSessionState()` (`db.ts:563`), whose `revision` compare-and-set is the only
concurrency control on candidate work.

---

## 4. Current reports — FROZEN

| Item | Path |
|---|---|
| Composer | `src/app/api/sim/sessions/[id]/report/route.ts` |
| Renderers | `src/components/sim/EvidenceReport.tsx`, `EvidenceReportV2.tsx` |
| Employer list | `src/components/employer/ReportsList.tsx` |
| Employer routes | `/app/employer/reports`, `/app/employer/evidence`, `/app/employer/assessments/report/[sessionId]`, `/app/employer/candidates/[sessionId]` |
| Data helpers | `src/app/app/employer/_lib/data.ts` (`getReportRecords`, `getInvitationRecords`, `getOverviewMetrics`, `getNeedsReviewRecords`, `getOperationalSnapshot`, `getWorkspaceHealth`), `_lib/catalog.ts` |
| Candidate-facing | `/sim/[sessionId]/result`, `/results/[token]`, `/record/[token]` |
| Share plumbing | `src/lib/pilot/receipt-share.ts`, `/api/sim/results/[sessionId]/share` |
| PDF | `/api/admin/candidates/[id]/pdf` |

The report route reads `sim_analysis_runs`, `sim_competency_results`,
`sim_evidence_items`, `sim_submissions`, `sim_employer_decisions`,
`sim_invitations`, `sim_credentials`, and `listEvents()`, and branches on
`isV2PersistedResult()`. A hiring decision has been made against this output.
Do not change what a report claims, how it is worded, which evidence it shows,
or its JSON shape.

Guard rails inside the report surface that must not be weakened: `requireUser()`
+ `requireOrgMember()` on every employer report route; the disclosure boundary
covered by `scripts/test-disclosure-boundary.ts`; the retired-terminology scan
`scripts/scan-retired-terms.ts`.

**Not protected, and safe to rebuild:** proof-graph briefs
(`/app/employer/proof/[runId]`, `proof_decision_briefs`), the marketing
`/evidence-report` page, and the static sandbox evidence view.

---

## 5. Historical migrations — IMMUTABLE

`supabase/migrations/001_mvp_core.sql` … `025_proof_graph.sql` (25 files, listed
in `CURRENT_SYSTEM_MAP.md`) are append-only history. Never edit, renumber,
delete, reorder, or "clean up" an existing file. Applied checksums exist in
remote projects; `scripts/verify-migration-state.ts` compares against them.

**No new migrations in this phase.** This is a standing instruction from
`.cursor/rules/simulation-engine.mdc`, not a preference. `025_proof_graph.sql`
already provides 24 `proof_*` tables, per-table RLS, `proof_run_visible()`, and
the `proof_events_assign_sequence()` trigger — the rebuild works inside that
schema.

Particularly load-bearing history that must not be revisited:
`022_close_answer_key_reads.sql`, `023_org_rls_and_view_invoker.sql`,
`024_candidate_view_grant_order.sql`, `009_org_rls_helpers.sql`,
`018_shadow_lock.sql`. These closed specific security holes; their ordering is
part of the fix.

---

## 6. Environment and credential boundary — FROZEN

`src/lib/supabase/project-guard.ts` is frozen in full.

| Constant / behaviour | Value |
|---|---|
| `PRODUCTION_PROJECT_REF` | `qtrhwrcxthtqvkeerptp` |
| `STAGING_PROJECT_REF` | `btbmvrvynnrhapjdkunz` (fydell-dev) |
| Production opt-in | `FYDELL_ALLOW_PRODUCTION_DB=true`, else fail closed |
| `assertNoPublicServiceKey()` | hard stop on a service-role key in any `NEXT_PUBLIC_` var |
| Ref agreement | URL ref, anon-key ref, service-key ref must match |
| `isPlausibleServiceRoleKey()` | rejects placeholders so signup cannot create orphan Auth users |
| Logging | never log or return a key; errors name project refs only |

Do not add a bypass, a "local override", a default, or a try/catch that swallows
`SupabaseProjectMismatchError`.

Also frozen: `src/lib/supabase/{admin,server,client,middleware}.ts`,
`src/middleware.ts` (including the `private, no-store` list for `/admin`,
`/account`, `/app`, `/sim/`, `/simulations`, `/invite/`, `/results/`), and
`src/lib/simulations/{auth,invitation-gate}.ts`.

Rebuild work uses the separate proof/sandbox clients — `proofAdmin()` in
`sim-engine/proof/db.ts` and `sandboxAdmin()` in
`sim-engine/proof/sandbox/client.ts` — and the `FYDELL_DEV_*` credential family
that live proof tests require. Never substitute the app's `DATABASE_URL` or
`SUPABASE_SERVICE_ROLE_KEY` for a `FYDELL_DEV_*` value; `GRAPH_STATE.md` records
that this refusal is deliberate because those names can point at production in
another checkout.

---

## 7. The three thin spots in the isolation boundary

Named here because they are where an isolated change most easily becomes a
production change.

### 7.1 `attemptPersistence` writes to a protected production table

`src/lib/sim-engine/server/attemptPersistence.ts` stores sim-engine attempt
snapshots inside `sim_session_state.workspace` under the `engineAttempt` key,
reusing `getSessionForCandidate`, `getSessionState`, and `saveSessionState` from
`src/lib/simulations/db.ts`.

Currently harmless: its only consumer is
`sim-engine/adapters/supabasePersistence.ts`, which nothing imports.

Rule for this phase: **leave both unwired.** Do not connect
`supabasePersistence.ts` to a host, a route, or a server action. If durable
engine persistence is needed later, it is a separate, explicitly approved
decision — not a side effect of a rebuild milestone.

### 7.2 The lab engine renders inside the authenticated employer shell

`src/app/app/employer/workbench/page.tsx`,
`workbench/[scenarioId]/page.tsx`, and `workbench/[scenarioId]/analysis/page.tsx`
run sim-engine code behind `requireUser()` + `requireOrgMember()` +
`isSimEngineEnabled()`, and state in copy: "Your attempt. Not recorded against a
candidate."

Protected properties:

- `isSimEngineEnabled()` must keep requiring `SIM_ENGINE_ENABLED=1` under
  `NODE_ENV=production` (`sim-engine/featureFlag.ts`).
- These routes must not acquire a write path to any `sim_*` table.
- The "not recorded against a candidate" claim must stay literally true.

### 7.3 The self-serve strangler seam

`src/app/simulations/start/[slug]/route.ts` is the one place a production start
can be diverted to the lab engine, and only when
`isSimEngineSelfServeOptIn()` — `SIM_ENGINE_ENABLED` **and**
`SIM_ENGINE_SELF_SERVE=1`, default off everywhere including development — and
`resolveEngineScenarioId(slug)` returns a mapping.

Protected: `SIM_ENGINE_SELF_SERVE` stays default-off; the fallback stays
`createSelfServeAttempt()` → `/sim/<sessionId>`; `legacy-slug-map.ts` mappings
are not silently broadened.

---

## 8. What is explicitly open for the rebuild

For symmetry, so "protected" is not read as "everything".

| Area | Path |
|---|---|
| Sim-engine lab | `src/lib/sim-engine/` except `server/attemptPersistence.ts` and `adapters/supabasePersistence.ts` |
| Engine components | `src/components/simulations/` |
| Proof graph inside existing schema | `src/lib/sim-engine/proof/`, `/api/proof/*`, `/app/employer/proof/*`, `/admin/(ops)/proof/*` |
| Sandbox demo | `src/components/sandbox/`, `/sandbox/*`, `/api/sandbox/*` — including repairing the static-`/sandbox/work`-vs-orphan-`SandboxWorkbench` break |
| Python worker | `services/evidence-engine/` |
| Lab routes | `src/app/(lab)/lab/*`, `/api/lab/*` |
| Marketing | `src/components/marketing/`, marketing routes |
| Docs | `docs/rebuild/`, `GRAPH_STATE.md` |

Constraints that still apply to open areas, from
`.cursor/rules/simulation-engine.mdc`: use the existing `RoleKey` from
`src/lib/simulations/types.ts` and never invent `RoleType` or
`FORWARD_DEPLOYED_AI`; keep the renderer registry `Partial`/availability-aware
with no placeholder renderers; resolve scenarios through
`scenarios/catalog.ts`; validate with `validateScenario()` before start; keep
OBSERVATION distinct from INFERENCE and support `INSUFFICIENT_EVIDENCE`; keep
`AiToolInteraction` distinct from `PersonConversation`; describe localStorage as
development-only; no `any`; no fake buttons; no TODO placeholders in shipped
paths; Fydell design tokens only.

---

## 9. Pre-merge checklist

A rebuild commit is acceptable only if all of the following hold.

**Diff review**

- [ ] No diff in `src/components/sim/WorkbenchRunner.tsx`.
- [ ] No diff in `src/lib/simulations/v2/**` or `src/lib/simulations/content/**`.
- [ ] No diff in `src/lib/simulations/db.ts` (`recordEvent`, `listEvents`,
      `saveSessionState`) or in the four `recordEvent` route files.
- [ ] No diff in `src/app/api/sim/sessions/[id]/report/route.ts`,
      `EvidenceReport.tsx`, or `EvidenceReportV2.tsx`.
- [ ] No diff in `supabase/migrations/**` and no new migration file.
- [ ] No diff in `src/lib/supabase/**` or `src/middleware.ts`.
- [ ] `src/lib/sim-engine/adapters/supabasePersistence.ts` and
      `src/lib/sim-engine/server/attemptPersistence.ts` still have no importer.
- [ ] No new `.from("sim_…")` call site outside the frozen modules.
- [ ] No new `"use client"` module imports `microToV2`, `scoreV2Attempt`, or a
      v2 definition type.

**Gates**

- [ ] `npm run typecheck`
- [ ] `npm run test:release` (includes `test:v2`, `test:sims`, `test:v3`,
      `test:october`, `test:disclosure`, `test:db-security`,
      `test:project-guard`)
- [ ] `npm run test:proof` and `npm run test:sim-engine`
- [ ] `npx tsx scripts/verify-migration-state.ts` reports no drift
- [ ] `npm run test:e2e` — `e2e/sandbox-isolation.spec.ts` in particular

**Escalate rather than proceed** if a rebuild step appears to require editing a
frozen file, a new migration, a second `sim_session_events` writer, a change to
the persisted v2 result shape, or wiring engine persistence into
`sim_session_state`. Each of those is a separate decision with its own approval,
not an implementation detail of this milestone.
