# PRODUCT_GAP_AUDIT

What the repository claims versus what the code at `HEAD` (`45d95c1`) actually
does. One row per surface, classified from source evidence.

Classification vocabulary, applied consistently:

| Label | Meaning |
|---|---|
| REAL | Wired end to end from a reachable route to a database or a real worker |
| MOCK | Renders hardcoded constants; no request leaves the component |
| DISCONNECTED | Exists and compiles; nothing imports or routes to it |
| BROKEN | Wired, but a required link is missing so the flow cannot complete |
| VISUAL-ONLY | Real route and real chrome, static body; may accept params it ignores |
| FLAGGED-OFF | Real, gated behind a flag that defaults off in production |
| UNPROVEN | Implemented, with its verification gate skipping by default |

---

## 1. Severity summary

| # | Gap | Severity |
|---|---|---|
| 1 | `/sandbox/work` is static; the interactive `SandboxWorkbench` is orphaned, which makes the sandbox outcome step unreachable | Critical |
| 2 | Four conflicting Solutions Engineer narratives, two of which invert the same two company names | Critical |
| 3 | Two competing SE implementations (`golden-path/` vs `proof/`) both claim the pilot | Critical |
| 4 | The `proof_*` live gates skip by default; G2/G3/G8/G9/G12 are `TESTING`, G19 `BLOCKED` | High |
| 5 | `/sandbox/evidence/[runId]` and `/sandbox/receipts/[publicId]` discard their ID params | High |
| 6 | Employer signup cannot complete without a real service-role key | High |
| 7 | Preview mode serves synthetic employer data to any visitor when enabled | High |
| 8 | `/app/employer/receipts` is a permanent hardcoded empty state | Medium |
| 9 | Role calibration is one hardcoded SE role with no production-side equivalent | Medium |
| 10 | Three unrelated receipt implementations | Medium |
| 11 | `/app/employer/reports` and `/app/employer/evidence` are the same list twice | Medium |
| 12 | Orphaned engine persistence adapters aimed at a protected production table | Medium |
| 13 | Empty marketing component directories, root-level HTML/Python scratch, ~60 overlapping docs | Low |

---

## 2. Gap 1 — the sandbox demo is a screenshot, and its last step is unreachable

**Critical.** This is the single largest gap between claim and behaviour.

The sandbox tells visitors what it is: `/sandbox` renders an "Experience guide"
with the subtitle "Real interactions, isolated demo state." The top bar says
"You're exploring a Fydell sandbox. Actions here do not affect live hiring
decisions." The seven-step guide promises "Experience Candidate 01 work" and
"See what changed".

What actually happens:

| Layer | Evidence | Status |
|---|---|---|
| `/sandbox/work` route | `src/app/sandbox/work/page.tsx` → `<SandboxApp surface="work" />` | REAL route |
| Body for `surface === "work"` | `SandboxApp.tsx:272` → `<SandboxLiveSimulation />` | MOCK |
| `SandboxLiveSimulation` | imports only `SAMPLE_*` from `./sample-artifacts`; one `useState` for file-tab selection; zero `fetch` | MOCK |
| `SandboxWorkbench` | the real interactive workbench — six artifact fields, autosave on blur, `commit_initial`, `deliver_constraint`, `submit_revised`, before/after "What changed" panel, oral-defense form | DISCONNECTED |
| `SandboxEvidence` | imports `SAMPLE_BRIEF`, `SAMPLE_CLAIMS`, `SAMPLE_LINEAGE_*`, `SAMPLE_INTERVIEW_PLAN`, … | MOCK |
| `SandboxWorkReceipt` | `SAMPLE_*` | MOCK |

`SandboxWorkbench` is imported by nothing. A repo-wide grep for the symbol
returns its own definition plus documentation. Git shows this is a regression,
not an unfinished feature: `git show 158650d:src/components/sandbox/SandboxApp.tsx`
contains

```
import { SandboxWorkbench } from "./SandboxWorkbench";
<SandboxWorkbench session={session} busy={busy} onAction={...} onEnsure={...} />
```

and `HEAD` (`45d95c1`, "Rebuild the sandbox demo surfaces to match the product
design comps") replaced it with the static scene while leaving the file in place.

### The consequence is a BROKEN chain, not just a MOCK screen

`SandboxApp`'s `act()` helper — the only caller of `POST /api/sandbox/actions` —
survives in exactly one place: `SandboxOutcomes`. That button is disabled unless
`session?.step !== "finalized"` is false, i.e. it requires a **finalized** run.

The actions that move a run toward `finalized` are `start`, `save_work`,
`commit_initial`, `deliver_constraint`, `submit_revised`, `begin_defense`,
`submit_defense`, `review`, `advance` — and every one of them lived in the
orphaned workbench.

So: **no shipped UI can finalize a sandbox run, therefore
`/sandbox/outcomes` can never record an outcome.** The last step of the
seven-step guide is unreachable.

### Live server code with no caller

| Component | Path |
|---|---|
| Action endpoint | `POST /api/sandbox/actions` |
| Action union (11 variants) | `proof/sandbox/service.ts` `SandboxAction` |
| World-state machine | `proof/sandbox/{world-state,steps,service}.ts` |
| Proof repositories | `proof/sandbox/proof-repos.ts` → `proof_runs`, `proof_events`, `proof_artifact_versions` |
| Receipt hashing | `proof/sandbox/receipt-hash.ts` (canonicalize + integrity hash) |
| Evidence analysis | `proof/python-client.ts` → `services/evidence-engine` |
| Capability auth | `proof/sandbox/capability.ts` + `loadOwnedSandbox(runId, secret)` |
| Kill switch | `proof/sandbox/kill-switch.ts` |
| Cleanup cron | `proof/sandbox/cleanup.ts`, `/api/cron/sandbox-cleanup` |

Only `GET`/`POST /api/sandbox` (create + poll a session) and
`record_outcome` remain reachable, and the latter only in an unreachable state.
`SandboxApp` still runs a 2s→16s backoff poll of `GET /api/sandbox` to keep a
session no shipped surface can advance.

### Recommendation

Reconnect one path rather than deleting either component. The static scenes match
approved design comps and the workbench holds the real interaction contract, so
the work is to render the comp's layout against `SandboxSessionView` and
`act()` — not to choose between them. Until then, the sandbox copy overstates
what it does: "Real interactions, isolated demo state" is currently accurate for
neither the work step nor the outcome step.

---

## 3. Gap 2 — four conflicting Solutions Engineer narratives

**Critical.** The SE role is the declared wedge (`GRAPH_STATE.md` G0: "Find →
Prove → Match. SE wedge."). There are four incompatible tellings of it in one
tree.

| # | Source | Identity as written |
|---|---|---|
| 1 | `sim-engine/scenarios/solutions-engineer/northstar-integration.ts` | `scenarioId "northstar-integration"`, `scenarioVersion 1.0.0`, `engineVersion 0.1.0`; title "Northstar Health, CRM sync failure before board demo"; `companyName: "Acme Cloud (customer: Northstar Health)"`; 7 tasks from "Understand the customer situation" to "Respond to customer escalation" |
| 2 | `sim-engine/proof/sandbox/fixture.ts` | `ACME_FIXTURE_ID "acme-rollout"`, `fixtureVersion "acme-rollout-v1"`; `organization: { name: "Northstar", customer: "Acme" }`; `role.slug "solutions-engineer"`; surfaced as "Acme technical discovery and rollout" |
| 3 | `sim-engine/golden-path/contracts.ts:142-143` | `roleKey "solutions_engineer"`, `scenarioVersion "northstar-pilot-1.0.0"` |
| 4 | `lib/simulations/content/micro-solutions-delivery-2.ts` | `roleKey "solutions_engineer"`; title "SSO Is Not Provisioning"; `companyName "Ridgemont Financial (customer)"` |

The sharpest contradiction is between (1) and (2): they use the same two proper
nouns with the **vendor and customer swapped**. In the lab scenario Acme Cloud is
the employer's company and Northstar Health is the customer; in the proof sandbox
fixture Northstar is the organization and Acme is the customer.

A fifth retelling, `src/components/sandbox/sample-artifacts.ts`, hardcodes prose
for whichever variant the design comps used, with no link back to either
definition — so a copy fix to the fixture will not move the demo, and vice versa.

Three different versioning vocabularies also coexist for the same role:
`scenarioVersion 1.0.0` + `engineVersion 0.1.0`, `fixtureVersion
"acme-rollout-v1"`, and `scenarioVersion "northstar-pilot-1.0.0"`.

**Recommendation.** Pick one canonical SE narrative with one company relationship
and one version string, and make every other surface derive from it. Nothing can
be described as "the SE pilot" while four definitions disagree about who the
customer is.

---

## 4. Gap 3 — two competing implementations of the same pilot

**Critical**, and already self-reported. `GRAPH_STATE.md` §"Two implementations
exist" opens with "This is the main open architectural question, not a detail":

| | `sim-engine/golden-path/` | `sim-engine/proof/` |
|---|---|---|
| What it is | tested walking skeleton | DB-backed graph |
| Two-pass loop | proven against the real Python worker | implemented |
| Persistence | service-role `proof_*` adapter added; UI still on browser localStorage | `025_proof_graph.sql` + API routes + workbench + A–D fixtures |
| Event sequence | in-memory | server-assigned trigger |
| Jobs | current idempotent job | idempotent outbox `proof_analysis_jobs` |
| RLS | n/a | per-table + `proof_run_visible()` |

Both consume the same Python worker via `proof/python-client.ts`. Both have their
own persistence module (`golden-path/persistence.ts` and `proof/db.ts` +
`proof/sandbox/proof-repos.ts`). Both are exercised by separate npm scripts
(`test:sim-engine` vs `test:proof`). Duplicated concepts include claims,
defense, review, and brief generation.

They do agree on the evidence vocabulary — `direction` (`STRENGTH` / `CONCERN` /
`INSUFFICIENT_EVIDENCE`) held independently from `confidence` (`HIGH` /
`MODERATE` / `LOW`), matching the engine rule that outcomes support
`INSUFFICIENT_EVIDENCE`. That shared contract is the natural convergence point.

**Recommendation.** Resolve the fork before extending either side. The DB-backed
`proof/` path already has the properties the skeleton lacks (server-assigned
sequence, job outbox, RLS), so the likely direction is to keep `golden-path/` as
a contract test harness and stop growing it as a second product path.

---

## 5. Gap 4 — the verification gates skip by default

**High.** From `GRAPH_STATE.md`, node by node:

| Node | Status | What is actually unproven |
|---|---|---|
| G2 Data | TESTING | "Implemented, not live-proven." `FYDELL_DEV_SERVICE_ROLE_KEY` and `FYDELL_DEV_DB_URL` are placeholders; the persistence script never loads `.env.local`; the round-trip gate skipped |
| G3 Security | TESTING | Cross-org isolation, candidate denial for unpublished claims, employer access after publication, write attempts on events/jobs/claims, anon denial — **all skipped**; runtime properties not proven |
| G8 Event ledger | TESTING | Sequence assignment, five-connection concurrency, sustained load, crash recovery — **skipped** |
| G9 Workspace + artifacts | TESTING | Adapter write-back to `fydell-dev` unproven; browser localStorage is still the UI's persistence |
| G12 Human review | TESTING | Skeleton-tested, not live-DB-tested |
| G19 Pilot gate | BLOCKED | Real employer signup cannot complete without a real service-role key; queue recovery and sustained load still required |

The skip is deliberate and safe — live proof tests refuse to accept the app's
normal `DATABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` as a substitute, because
those names can point at production in another checkout, and every target must be
visibly bound to `btbmvrvynnrhapjdkunz` before a client is created. The gap is
not the design; it is that **nothing has run**.

`REQUIRE_PROOF_DATABASE_TESTS=true` converts a skip into a failure. Until a run
happens with real `FYDELL_DEV_*` values in process env, RLS, event ordering, and
persistence are design intent rather than observed behaviour.

---

## 6. Gap 5 — sandbox detail routes discard their IDs

**High.** `SandboxApp`'s props type is
`{ surface: Surface; runId?: string; publicId?: string }`, but the function
signature destructures only `{ surface }`.

- `src/app/sandbox/evidence/[runId]/page.tsx` awaits `params`, extracts `runId`,
  passes `runId={runId}` — **discarded**.
- `src/app/sandbox/receipts/[publicId]/page.tsx` does the same with `publicId` —
  **discarded**.

Every `runId` and every `publicId` renders identical static `SAMPLE_*` content.
VISUAL-ONLY behind a URL contract that promises otherwise, and the type
signature makes the omission look intentional rather than dropped.

Note the contrast: the **production** receipt route `/receipts/[publicId]` and
`GET /api/receipts/[publicId]` do resolve real data through
`ArtifactWorkReceiptIssuer.loadPublic()` and return an `integrityHash`. The
sandbox mirror of that surface does not.

---

## 7. Gap 6 — employer signup cannot complete

**High**, and fail-closed by design. Per `GRAPH_STATE.md`:

| Flow | Verdict |
|---|---|
| Public `/signup`, `/login`, `/forgot-password`, `/auth/link-invalid`, `/auth/confirmation-required` | pages load |
| Employer signup creating an Auth user + org | **broken until credentials** — `/api/auth/signup` returns 503 because the service-role value is a placeholder |
| `/onboarding/employer` creating a workspace | happy path not verified |
| `/login` + `next=` | partial — form loads, same-origin `next` preserved, external dropped, unknown password 401; **no successful login observed** |
| Session persistence | not verified |
| Sign out | partial |
| Forgot-password email delivery | not verified |
| Invite accept with a real token | not verified |
| `/app/employer` route protection | not verified on `:3000` (preview mode interfered) |
| `/admin` anonymous | works — redirects to login |
| Org A cannot read org B | not verified |

The 503 is correct behaviour: `isPlausibleServiceRoleKey()` in
`project-guard.ts` refuses placeholders precisely so a fake key cannot create
orphan Auth users. The gap is that the signed-in product has therefore never been
observed working end to end from signup.

---

## 8. Gap 7 — preview mode is the largest mock surface inside the real app

**High.** `src/lib/dev/preview.ts` is ~700 lines of `server-only` synthetic
fixtures that short-circuit `getInvitationRecords`, `getReportRecords`,
`getOverviewMetrics`, `getWorkspaceHealth`, `getNeedsReviewRecords`,
`getOperationalSnapshot`, and the settings page identity
(`PREVIEW_ORG` / `PREVIEW_USER`).

Guards, all present: disabled unconditionally when `NODE_ENV === "production"`;
opt-in via `FYDELL_UI_PREVIEW=1`; every fixture name visibly synthetic so a
screenshot cannot be mistaken for customer activity.

The residual risk is documented in `GRAPH_STATE.md`: `npm run dev:preview` sets
`FYDELL_UI_PREVIEW=1`, which "serves synthetic employer data to anyone", and this
is why `/app/employer` route protection could not be verified in a live
non-preview process. Any screenshot or audit taken under preview must be labelled
as such — several files in `docs/screenshots/` and `docs/wave1-visual/` cannot be
distinguished from real data by filename alone.

---

## 9. Gap 8 — `/app/employer/receipts` is a permanent empty state

**Medium.** `src/app/app/employer/receipts/page.tsx` has no data source at all.
It renders a `PageHeader`, a hardcoded panel titled "No employer-visible Work
Receipts", two links (`/sandbox`, `/trust`), and three static value props
("Candidate controlled", "Evidence backed", "Explicit limits").

The stated reason is a real product position — a receipt belongs to the candidate
and appears only after authorization. But the page cannot ever show a receipt,
because nothing queries for one. VISUAL-ONLY.

The irony: real receipt data exists on both sides — `sim_receipt_shares` /
`sim_receipt_share_access` (`src/lib/pilot/receipt-share.ts`) and
`ArtifactWorkReceiptIssuer` — and neither is consulted here.

---

## 10. Gap 9 — role calibration exists once, for one hardcoded role

**Medium.**

| Surface | Reality |
|---|---|
| `/app/employer/proof/calibration` | REAL. Client form ↔ `/api/proof/calibration`, upserting `proof_role_calibrations` on `role_id = PROOF_ROLE_ID` with `approved_by` / `approved_at` and an `audit()` entry. Five fields: `common_tasks`, `stakeholders`, `expensive_mistakes`, `top_performer`, `work_environment`. Confirmation copy: "Calibration saved. Founder still approves publication." |
| Production `sim_*` side | **No employer-editable calibration.** `src/lib/simulations/roles.ts` is a static list |
| `/sandbox/roles` | MOCK — `SandboxRole` falls back to five hardcoded competency strings when no session exists |

`GRAPH_STATE.md` G4 is `NOT_STARTED`: "Sprint 1 intentionally uses one hardcoded
SE role." So calibration is real, single-tenant-single-role, and disconnected
from the system that actually scores candidates. An employer calibrating a role
in the proof UI changes nothing about a `sim_*` evaluation.

---

## 11. Gap 10 — three unrelated receipt implementations

**Medium.**

| Implementation | Path | Status |
|---|---|---|
| Production share links | `src/lib/pilot/receipt-share.ts` → `sim_receipt_shares`, `sim_receipt_share_access` (with access logging); `/api/sim/results/[sessionId]/share` | REAL |
| Proof artifact receipts | `proof/sandbox/proof-repos.ts` `ArtifactWorkReceiptIssuer` + `receipt-hash.ts` canonicalization; `/receipts/[publicId]`, `GET /api/receipts/[publicId]` returning `integrityHash` | REAL |
| Sandbox demo receipt | `src/components/sandbox/SandboxWorkReceipt.tsx` from `sample-artifacts.ts` | MOCK |
| Employer index | `/app/employer/receipts` | VISUAL-ONLY (Gap 8) |

Three integrity models, three URL shapes, one product concept. The public
`/trust` page describes sharing boundaries for a single "Work Receipt" that does
not exist as a single implementation.

---

## 12. Gap 11 — Reports and Evidence are the same list twice

**Medium.** `/app/employer/reports` and `/app/employer/evidence` both call
`getReportRecords(org.organizationId)` and both render
`components/employer/ReportsList`. Only header copy and empty-state copy differ:

- Reports: "Completed evaluations. Open one to read the conclusion and the
  evidence behind it."
- Evidence: "Candidate claims that can be traced back to observed work, with
  limitations kept visible."

Reports additionally supports a `?review=needs` filter. Two IA concepts, one
data set. Related: `/app/employer/work` is a third projection of
`getInvitationRecords()` with a derived `workState()` label, and
`/app/employer/candidates` is a fourth.

---

## 13. Gap 12 — orphaned engine persistence aimed at a protected table

**Medium**, and the highest-risk latent seam in the tree.

`src/lib/sim-engine/server/attemptPersistence.ts` writes sim-engine attempt
snapshots into `sim_session_state.workspace` under an `engineAttempt` key, reusing
`getSessionForCandidate` / `getSessionState` / `saveSessionState` from the frozen
`src/lib/simulations/db.ts`. Its file header explains the intent carefully:
service-role only because `authenticated` has SELECT but no write on
`sim_session_state`; ownership re-checked per call; namespaced so it cannot
collide with the v2 runner; no engine telemetry stored.

Its only consumer, `src/lib/sim-engine/adapters/supabasePersistence.ts`, is
imported by nothing. So today the lab engine has **no** production write path.

Two adjacent orphans point the same way:

- `sim-engine/adapters/legacy-compat.ts:8` — a `sim_session_events`-shaped
  payload marked "not written yet".
- `sim-engine/adapters/persistence.ts` — `InMemoryPersistenceAdapter` plus a
  localStorage adapter under the `fydell.sim-engine.dev.` prefix, whose header
  states it is development-only and "NOT production evidence durability".

Wiring any of the three would put lab code on a protected production write path.
`GRAPH_STATE.md` G9 already flags the underlying gap honestly: "Browser
localStorage remains the UI's development persistence until the adapter is wired
into a server boundary."

---

## 14. Gap 13 — accumulated debris

**Low**, but it makes every audit slower and every claim harder to trust.

- Empty directories: `src/components/marketing/motifs/`,
  `src/components/marketing/simulations/`, `src/components/marketing/v3/`.
- Root-level orphan HTML: `company.html`, `index.html`, `pricing.html`,
  `product.html`, `report.html`, `resources.html`, `simulation.html`,
  `solutions.html`, `_verify.html` — outside the Next.js app, duplicating routes
  that exist in `src/app/`.
- Root-level scratch Python: `_apply_98.py`, `_apply_visual_rebuild.py`,
  `_qa98.py`, `_qa_check.py`, `_qa_pass2.py`, `_rebuild_reference.py`,
  `_strip_premium.py`.
- Build artifacts committed at root: `sim-engine.js`, `sim-engine.cjs`,
  `build-out.txt`, `lint-errors.txt`, `spike-out.txt`, `fde-unit-out.txt`,
  `tsconfig.tsbuildinfo`.
- Documentation sprawl: ~50 files in `docs/` plus 12 at root
  (`PRODUCT.md`, `BACKEND_MVP.md`, `DESIGN.md`, `GRAPH_STATE.md`,
  `FYDELL_VISUAL_SYSTEM.md`, `APPROVED_VISUAL_CONTRACT.md`,
  `CURRENT_STATE_VISUAL_AUDIT.md`, `FUNCTIONAL_GOLDEN_PATH.md`,
  `PRODUCT_VISUAL_MANIFEST.md`, `REFERENCE_TRANSLATION.md`,
  `VISUAL_DIRECTIONS.md`, `VISUAL_QA_SCORECARD.md`) describing several
  mutually inconsistent generations. Multiple overlapping audits already exist:
  `docs/simulation-rebuild-audit.md`, `docs/pilot-audit.md`,
  `docs/pilot-overhaul-audit.md`, `docs/production-rescue-baseline.md`,
  `docs/ui-slop-audit.md`, `docs/ui-reference-audit.md`,
  `docs/marketing-visual-audit.md`, `docs/fde-rebuild-m0-audit.md`.

---

## 15. What is genuinely real

Recorded so the audit is not read as uniformly negative. The following are wired
end to end and defended by tests:

- **The production Wave 1 candidate path.** `/sim/[sessionId]` → ownership gate →
  `WorkbenchRunner` → `sim_session_state` optimistic concurrency →
  `sim_session_events` append-only ledger → `runV2Scoring` →
  `sim_analysis_runs` / `sim_competency_results` / `sim_evidence_items` →
  `/api/sim/sessions/[id]/report` → `EvidenceReportV2`. Covered by `test:v2`,
  `test:sims`, `test:october`, `test:disclosure`.
- **The answer-key boundary.** `WorkbenchRunner` never imports `microToV2`;
  `022_close_answer_key_reads.sql` closed the DB side.
- **The environment guard.** `project-guard.ts` fails closed on production refs,
  hard-stops service-role keys in `NEXT_PUBLIC_` vars, requires URL/anon/service
  refs to agree, rejects placeholder keys, and never logs a key. Covered by
  `test:project-guard` and `test:db-security`.
- **The employer workspace over real data.** `_lib/data.ts` and `_lib/catalog.ts`
  behind `requireUser()` + `requireOrgMember()`, with
  `test:navigation` / `test:identity` / `test:availability`.
- **The `proof_*` schema as designed.** 24 tables with per-table RLS,
  `proof_run_visible()`, a server-assigned event sequence trigger, an idempotent
  job outbox, and no client write policy on
  `proof_analysis_jobs` / `proof_claim_reviews` / `proof_audit_logs` /
  `proof_product_events`.
- **The Python evidence worker.** `services/evidence-engine/` runs for real over
  HTTP or `spawn`, has no database authority, and its output is validated by
  `validate-analysis.ts`.
- **The sim-engine lab.** 7 scenarios across 5 roles resolved through
  `catalog.ts`, a full runtime, `validateScenario()`, an availability-aware
  renderer registry, config-driven workbench layout, and colocated tests.
- **Motion discipline.** Only three files touch the animation stack;
  `HomeMotionController` returns early on `prefers-reduced-motion: reduce`;
  `scripts/check-motion-safety.ts` guards it.
- **Honest self-reporting.** `GRAPH_STATE.md` distinguishes "implemented" from
  "proven" node by node and says plainly which gates skipped. Most of the High
  findings above were found there first, not discovered against it.

---

## 16. Recommended order of work

1. Resolve Gap 3 (`golden-path/` vs `proof/`) — every other SE decision depends
   on it.
2. Resolve Gap 2 (one canonical SE narrative, one version vocabulary), then make
   `sample-artifacts.ts` derive from it instead of restating it.
3. Fix Gap 1 by rendering the approved comp layout against `SandboxSessionView`
   and `act()`, restoring a reachable path to `finalized`, and with it Gap 5.
4. Close Gap 4 by running the live `proof_*` gates with real `FYDELL_DEV_*`
   credentials in process env and `REQUIRE_PROOF_DATABASE_TESTS=true`.
5. Unblock Gap 6 with a real service-role key on `fydell-dev`, then observe
   signup → onboarding → invite → work → report once, end to end.
6. Then the Medium items: receipts consolidation (8, 10), Reports/Evidence IA
   (11), calibration scope (9), and an explicit decision about the orphaned
   persistence adapters (12) — which, per
   `PROTECTED_PRODUCTION_PATHS.md` §7.1, is to leave them unwired in this phase.

Throughout, `PROTECTED_PRODUCTION_PATHS.md` applies: `WorkbenchRunner`, v2
scoring, `sim_session_events` writes, the current report chain, and the 25
historical migrations are frozen, and no new migration is created in this phase.
