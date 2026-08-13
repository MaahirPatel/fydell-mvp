# Simulation rebuild: baseline audit

Written at the start of the simulation-engine and complete-loop rebuild. This
records what the repository actually is today, not what it should become. The
plan lives in `docs/simulation-rebuild-plan.md`.

## Commit and reconciliation

| | |
|---|---|
| Audited commit | `9c27c4560a6b3195e3fa91fce464889965ec81ce` |
| Working tree at audit start | clean |
| Commit named in the rebuild brief | `f5883dfd4f30a9c777785318b421782685af8acf` |
| Distance | 6 commits ahead |

The brief was written against `f5883df`. Six commits of visual and
productization work have landed since. The brief's observations about the
*engine* still hold; several of its observations about the *surface* are already
addressed. Reconciliation:

**Already done before this rebuild started**

- `hello@fydell.com` replaced with `admin@fydell.com`, centralised in `src/lib/contact.ts`.
- Employer app rebuilt as an operations tool with a first-run state and a populated state.
- Public site rebuilt from real product components against the Northline fixture.
- Candidate surfaces unified behind `CandidateShell`.
- Work Receipt field selection, expiry, revocation and access listing built (`WorkReceiptPermission`, `sim_receipt_shares`).
- Scoring no longer mints `sim_sessions.share_token`.
- The defense API route stopped returning `expected_understanding` to the candidate.

**Contradicts a choice made in the earlier pass, and the brief wins**

- `/results/[token]` was left readable for links already handed out. The brief
  requires the raw path be locked down so a `share_token` cannot grant full
  public result access. Scheduled in the plan; not yet done.

**Confirmed by this audit, unchanged**

- Scoring is keyword and signal matching. Citations are not source coordinates.
- Resources are markdown strings without stable row identity.
- There is no queue, no lease, no outbox, and no attempt manifest.

## Route inventory

67 pages, 48 API routes.

### Public

`/`, `/product`, `/simulations`, `/trust`, `/security`, `/pricing`, `/privacy`,
`/terms`, `/request-pilot`, `/roles`, `/roles/[key]`, `/employers`,
`/candidates`.

### Auth

`/login`, `/signup`, `/signup/role`, `/forgot-password`, `/reset-password`,
`/auth/update-password`, `/auth/confirmation-required`, `/auth/link-invalid`,
`/account/setup-required`, `/onboarding/employer`, `/auth/callback`.

### Employer (canonical)

`/app/employer`, `/app/employer/assessments`,
`/app/employer/assessments/report/[sessionId]`, `/app/employer/candidates`,
`/app/employer/reports`, `/app/employer/settings`, `/app/employer/cohort`,
`/app/employer/compare`.

### Candidate (canonical)

`/invite/[token]`, `/app/candidate`, `/sim/[sessionId]`,
`/sim/[sessionId]/result`, `/record/[token]`.

### Admin

13 routes under `/admin`, mostly ops surfaces for invitations, email, users,
organizations, audit and pilot requests.

### Legacy or superseded pages

Not on the canonical path, still routable:

`/dashboard`, `/app`, `/app/page`, `/app/candidates`, `/app/reports`,
`/app/templates`, `/app/simulations/new`, `/app/fde`, `/results/[token]`,
`/pilot/*` (tester feedback funnel, 5 pages).

`/results/[token]` is the one that matters: it serves a full unredacted result to
anyone holding a plaintext token, with no expiry and no revocation.

## Simulation file map

### Canonical for new production traffic

| Layer | File |
|---|---|
| Authored content | `src/lib/simulations/content/micro-ops-yield.ts` and 30 siblings |
| Content schema | `src/lib/simulations/micro-types.ts` (`MicroSimContent`, `format: "micro"`) |
| Storage | `sim_template_versions.content` jsonb |
| Runtime adapter | `src/lib/simulations/v2/from-micro.ts` (`microToV2`) |
| Runtime contract | `src/lib/simulations/v2/types.ts` (`SimulationDefinitionV2`) |
| Candidate UI | `src/components/sim/WorkbenchRunner.tsx` |
| Scorer | `src/lib/simulations/v2/scoring.ts` via `src/lib/simulations/v2/run.ts` |

The v2 "native" format is not authored and not stored. It is derived from the
legacy micro format by `microToV2()` on every session load and every scoring
run. There is no content anywhere in the repository that satisfies
`isV2Content()`.

### Legacy, retained

| File | State |
|---|---|
| `src/lib/simulations/types.ts` | Long-form `SimulationContent` schema. No content implements it. Analyze returns 410. |
| `src/lib/simulations/scoring.ts` | Long-form scoring math. Not wired to any analyze route; only `BAND_LABELS` is imported. |
| `src/lib/simulations/micro-scoring.ts` | Fallback scorer, runs when v2 throws. Writes `engine_version: "micro-v2"`. |
| `src/components/sim/MicroRunner.tsx` | Dead. Not routed. |
| `js/sim/**`, `sim-engine.js`, `sim-engine.cjs` | Project Meridian. localStorage sessions, separate from `sim_*`. |

### One authoritative answer per question

| Question | Answer today |
|---|---|
| Which definition type creates new attempts? | `MicroSimContent` |
| Which scorer creates new analysis runs? | `runV2Scoring`, with `runMicroScoring` as an unannounced fallback |
| Which report schema is employer-facing? | `sim_analysis_runs.result` (`format: "v2"`) plus `sim_evidence_items` |
| Which candidate projection creates a Work Receipt? | `sim_credentials` + `sim_receipt_shares` |
| Which invitation API creates employer invitations? | `POST /api/sim/invitations` |
| Which signup path creates employer workspaces? | `/api/platform/signup`, with `/api/auth/signup` still present |

The fallback scorer is a problem. A v2 failure silently produces a different
engine's result shape under a different `engine_version`, and the candidate and
employer are told nothing.

## Database

21 migrations, `001` to `021`. Next number is `022`, now used by
`022_close_answer_key_reads.sql`.

`organizations` is created in `supabase/schema.sql`, outside the numbered chain.
Migrations `004` and `005` are notes only, pointing at changes applied remotely
through MCP. The migration directory is therefore not a complete description of
the database, which is itself a finding.

Four parallel simulation stacks coexist:

1. `001` workspaces: `workspaces` → `simulations` → `simulation_attempts`
2. `010` org pilot: `pilot_candidates` → `pilot_simulation_sessions` → `evidence_reports_v2`
3. `011`/`017` FDE Relay: `fde_missions` → `relay_sessions` → workspace engine
4. `019`–`021` applied roles: `sim_*` — **the current code path**

Stack 4 is canonical. Stacks 1 to 3 are not written to by current product code
but retain tables, policies and in some cases routable UI.

### Missing tables for the rebuild

No table exists today for: resource bundles and files with checksums, immutable
attempt manifests, versioned work artifacts and revisions, stable evidence
source references, a server-backed editing lease, an evidence graph of claims
and counterevidence, or outcome plans tied to `sim_sessions`.

Partially present: `durable_jobs` exists and is **entirely unused** — analysis
runs inline in the HTTP request. `technical_incidents` exists but is bound to
`relay_sessions`, not `sim_sessions`. `command_outbox` and `artifact_versions`
exist for Relay only.

## Access-control matrix, canonical path

Writes are service-role only across `sim_*`; no INSERT/UPDATE/DELETE policy is
granted to `authenticated`. Reads:

| Table | Anonymous | Candidate | Employer member | Service |
|---|---|---|---|---|
| `sim_templates` | deny | published only | published only | bypass |
| `sim_template_versions` | deny | deny | deny | bypass |
| `sim_sessions` | deny | own row | own org | bypass |
| `sim_session_state` / `_events` / `_messages` | deny | own session | own org | bypass |
| `sim_analysis_runs` / `_competency_results` / `_evidence_items` | deny | own session | own org | bypass |
| `sim_employer_decisions` | deny | **deny** | own org | bypass |
| `sim_credentials` | deny | own only | deny | bypass |
| `sim_receipt_shares` | deny | own only | deny | bypass |
| `sim_receipt_share_access` | deny | deny | deny | bypass |
| `oral_defense_*` | deny | own session | own org | bypass |
| `preflight_checks` | deny | own only | deny | bypass |

Employers cannot create or revoke a candidate's receipt share, by schema and by
route. That requirement is met.

## Data-integrity and security risks

Ordered by severity. Items 1 to 5 were found by this audit.

### 1. Migration 015 was corrupt and could never have applied — fixed

`supabase/migrations/015_fde_evidence_math.sql` contained 23 lines carrying a
leaked `NNN|` line-number prefix from a numbered file read, at roughly every
tenth line, including inside `create table` bodies:

```sql
create table if not exists public.evaluation_case_results (
    40|  id uuid primary key default gen_random_uuid(),
```

This is a syntax error. The file as committed cannot have been applied to any
database. Whatever exists in the live project for these tables was created from
some other source, so the migration directory and the live schema are known to
disagree. Repaired in this pass by stripping the prefixes; the result is
coherent SQL and is what the rest of the file plainly intends. **The live
database still needs to be checked against it.**

### 2. Oral-defense answer key readable by the candidate — fixed in 022

`oral_defense_questions.expected_understanding` is what a good answer looks
like. The RLS policy grants the candidate SELECT on the whole row. An earlier
pass fixed the API route to project the column away, which is necessary but not
sufficient: a candidate could query PostgREST directly and read the answer
before answering. Closed by column privileges in `022`.

### 3. Draft templates readable across tenants — fixed in 022

Migration 010:

```sql
create policy sim_templates_read on public.simulation_templates
  for select using (status = 'published' or auth.role() = 'authenticated');
```

The second branch is true for every signed-in user, so the clause is always
true. Unpublished templates and their `configuration` payload were readable by
any authenticated user of any tenant.

### 4. Relay evaluator data readable by the candidate — fixed in 022

Migration 017 carries the comment "block direct select of `evaluator_only` by
denying select on base table for non-service" directly above a policy that does
not do that. A candidate-safe view exists; the base table remained readable.
Same class of issue for `evaluation_case_results.expected`, the golden-set
answer, readable by the candidate being graded against it.

### 5. Regenerating a defense set destroys candidate answers

`src/lib/pilot/oral-defense.ts:43` deletes every question in a set before
inserting the new ones. `oral_defense_responses.question_id` references those
rows, so any answer the candidate already gave is destroyed with them. The brief
forbids exactly this. Not fixed in this pass; it belongs to the oral-defense
rebuild.

### 6. `/results/[token]` bypasses candidate control

`sim_sessions.share_token` is plaintext, has no expiry and cannot be revoked.
Minting stopped, but existing tokens still resolve to a full unredacted result.

### 7. Analysis has no queue and a silent fallback

Analysis runs inline in the request with `maxDuration = 120`. A v2 failure falls
through to a different scorer without surfacing anything. `durable_jobs` exists
and is unused.

### 8. Evidence citations are not evidence

The citation a reviewer sees is built as:

```ts
citations.push({
  claim: opp.label,
  eventOrArtifactId: opp.id,
  detail: `Quality ${quality} from required signals [${opp.requiredSignals.join(", ")}].`,
});
```

`eventOrArtifactId` is a scoring opportunity ID such as `opp_primary_driver`. It
does not address a row, a cell, a document section or a message. There is
nothing for an "open evidence" action to open.

### 9. Resources have no stable identity

Resources are markdown table strings. Row identity in the UI is array position
(`cap_${index}`). Any reordering or filtering invalidates a reference.

### 10. `system_heartbeats` had no RLS — fixed in 022

## State machines as implemented

None of these are modelled as types. All are free-form strings compared inline.

- **Invitation** — `sim_invitations.status`: pending, accepted, revoked, expired. Email delivery status is not separated from acceptance.
- **Session** — `sim_sessions.status`: created, active, submitted, scored (plus `report_status`). No preflight, sync-warning, human-review, defense-required, voided-technical or retake state.
- **Analysis** — `sim_analysis_runs.status`: complete, failed. No queued, running, review_required, superseded.
- **Defense** — `oral_defense_sets.status`: pending, in_progress, completed, unavailable.
- **Receipt** — derived from `revoked_at` and `expires_at`; no state column.

There are no server-side transition guards.

## Test inventory

| Command | Covers |
|---|---|
| `test:unit` | pilot validation, pilot lifecycle, safe-next redirects |
| `test:sims` | micro scoring across the 31-simulation catalog |
| `test:v2` | v2 scoring |
| `test:october` | pilot cohort path |
| `test:copy` | retired-term scan |
| `test:a11y` | contrast, headings, names, focus, 200% reflow |
| `test:responsive` | overflow and text size at 390/768/1280/1440 |
| `test:rls-smoke` | RLS smoke, requires live Supabase |
| `verify:migrations` | presence of migration 010 tables only |
| `test:e2e` | 2 Playwright specs |

Gaps against the brief: no golden analysis fixtures, no integration tests
against an isolated Supabase, no test of state transitions, idempotency,
conflict handling, receipt projection filtering, or cross-tenant denial.
`verify:migrations` checks 11 tables from migration 010 and would not have
caught finding 1.

## Verified in a browser vs inferred from source

**Verified by rendering, in this pass and the immediately preceding one:** every
public page, every employer route in empty and populated states, and the
candidate invite, workbench pre-start, result and receipt pages, at 390, 768,
1280 and 1440. Accessibility and responsive audits pass with zero defects. These
were rendered against `src/lib/dev/preview.ts` fixtures, not a live database.

**Inferred from source only, never executed end to end:** invitation creation
and email delivery, invitation acceptance, session start, the timer, curveball
delivery, submission, scoring, report generation, defense generation, receipt
share creation, public receipt viewing, revocation, and every RLS policy in the
matrix above. No database has been available to this work.

That gap is the single most important fact in this document. The loop has never
been run.

## Lint and type state

`npm run lint` and `npm run typecheck` pass with zero errors at the end of this
pass, from a starting point of 38 lint errors.

Of the 38: 15 were in vendored agent-skill scripts under `.cursor/`, now out of
lint scope; 7 were `require()` in CommonJS Node scripts, now allowed for
`**/*.cjs` and `scripts/**/*.js`; 16 were real and were fixed, not suppressed —
`useAuthBackend` renamed to `authBackendEnabled` (it is not a hook), `Date.now()`
lifted out of a component body, three `prefer-const`, and eight React effect
violations rewritten to derive state or to fetch through a cancellable effect
keyed by a reload counter. `src/lib/client/local-storage.ts` was added so
localStorage is read through `useSyncExternalStore` rather than copied into
state from an effect.

14 warnings remain and are not yet triaged.
