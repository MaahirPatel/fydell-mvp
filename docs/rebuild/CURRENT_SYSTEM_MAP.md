# CURRENT_SYSTEM_MAP

Evidence-based map of what exists in this repository at `HEAD` (`45d95c1`,
"Rebuild the sandbox demo surfaces to match the product design comps").

Every claim below is grounded in a file path that exists in this checkout. Where
a claim depends on runtime state that cannot be read from source (applied
migrations, live credentials, whether an env flag is set in a deployment), it is
labelled **unverifiable from source** rather than asserted.

Status vocabulary used throughout:

| Label | Meaning |
|---|---|
| REAL | Executes against a database or a real worker process, wired end to end from a route a user can reach |
| MOCK | Renders hardcoded fixture/sample constants; no request leaves the component |
| DISCONNECTED | Code exists and compiles but nothing imports or routes to it |
| BROKEN | Wired, but a required step in the chain is missing so the flow cannot complete |
| VISUAL-ONLY | A real route with real chrome whose body is static; may accept params it ignores |
| FLAGGED-OFF | Real, but gated behind an env flag that defaults off in production |

---

## 1. Three-system classification

The repository contains three distinct simulation/evidence systems. They share
the Next.js app, the design tokens, and `RoleKey`, and almost nothing else.

### 1.1 Production Wave 1 — `sim_*` + v2

The only system that a real invited candidate and a real employer currently
touch.

| Element | Path | Status |
|---|---|---|
| Candidate runtime route | `src/app/sim/[sessionId]/page.tsx` | REAL |
| Candidate runtime component | `src/components/sim/WorkbenchRunner.tsx` (~2460 lines) | REAL |
| Result route | `src/app/sim/[sessionId]/result/page.tsx` | REAL |
| Content authoring | `src/lib/simulations/content/*.ts` (6 micro definitions) | REAL |
| Micro → v2 adapter | `src/lib/simulations/v2/from-micro.ts` (`microToV2`) | REAL |
| Candidate-safe projection | `src/lib/simulations/v2/candidate-view.ts` (`toV2CandidateView`) | REAL |
| Scoring | `src/lib/simulations/v2/scoring.ts` (`scoreV2Attempt`) | REAL |
| Scoring orchestration | `src/lib/simulations/v2/run.ts` (`runV2Scoring`) | REAL |
| Data access | `src/lib/simulations/db.ts` | REAL |
| Auth / org guards | `src/lib/simulations/auth.ts` (`requireUser`, `requireOrgMember`) | REAL |
| v3 experiment | `src/lib/simulations/v3/` (`checksum`, `resources`, `state`, `content/northline`) | Partially wired; exercised by `scripts/test-northline-v3.ts` |

`src/app/sim/[sessionId]/page.tsx` is the load-bearing chain: `requireUser()`
→ service-role read of `sim_sessions` → ownership check
(`session.candidate_user_id !== user.id` → redirect) → `getVersionContent()` →
`isMicroContent()` guard → `<WorkbenchRunner sessionId={sessionId} />`.

`WorkbenchRunner` never imports `microToV2`, by design — the file header states
answer keys must not reach the client. It consumes the `workbench` payload from
`GET /api/sim/sessions/[id]`.

**Production `sim_*` tables written or read from application code** (from
`.from("sim_…")` call sites):

`sim_sessions`, `sim_session_state`, `sim_session_events`, `sim_messages`,
`sim_submissions`, `sim_analysis_runs`, `sim_competency_results`,
`sim_evidence_items`, `sim_invitations`, `sim_employer_decisions`,
`sim_templates`, `sim_template_versions`, `sim_credentials`, `sim_feedback`,
`sim_receipt_shares`, `sim_receipt_share_access`.

**Current production write paths** (these are the writes that must not be
disturbed):

| Write | Call site |
|---|---|
| `sim_session_events` insert (append-only, idempotent by `client_event_id`) | `src/lib/simulations/db.ts:581` `recordEvent()` |
| `sim_session_state` optimistic update (`revision` compare-and-set) | `src/lib/simulations/db.ts:563` `saveSessionState()` |
| `sim_analysis_runs` / `sim_competency_results` / `sim_evidence_items` inserts | `src/lib/simulations/v2/run.ts:145,167,193,210,245` |
| `sim_sessions` status transitions | `src/lib/simulations/v2/run.ts:295,304,324`, `src/app/api/sim/sessions/[id]/consent/route.ts:70`, `.../decision/route.ts:58,64` |
| `sim_employer_decisions` | `src/app/api/sim/sessions/[id]/decision/route.ts:43` |
| `sim_invitations` | `src/app/api/sim/invitations/route.ts`, `.../invitations/manage/[id]/route.ts:49` |
| `sim_receipt_shares` / `sim_receipt_share_access` | `src/lib/pilot/receipt-share.ts:29,60,83,91,98,104` |
| `sim_feedback` | `src/app/api/sim/feedback/route.ts:60` |

`recordEvent()` reaches `sim_session_events` from five route families:
`events`, `messages`, `curveball`, `assistant`, plus two internal calls in
`db.ts` (lines 522 and 810). `listEvents()` feeds `micro-scoring.ts:966`,
`v2/run.ts:176`, and `report/route.ts:96` — the event ledger is a **scoring
input**, not just telemetry.

### 1.2 Isolated proof graph — `proof_*` + Python worker

Declared isolated in `GRAPH_STATE.md`: "`proof_*` is deployed to the
`fydell-dev` project; no production simulation, report, or `sim_session_events`
write path is used."

| Element | Path | Status |
|---|---|---|
| Schema | `supabase/migrations/025_proof_graph.sql` | 24 `proof_*` tables, per-table RLS, `proof_run_visible()` helper, `proof_events_assign_sequence()` trigger |
| Graph data layer | `src/lib/sim-engine/proof/db.ts` | REAL |
| Job outbox | `src/lib/sim-engine/proof/jobs.ts` (`proof_analysis_jobs`) | REAL |
| State machine | `src/lib/sim-engine/proof/state-machine.ts` | REAL |
| Agents / fixtures / types | `proof/agents.ts`, `proof/fixtures.ts`, `proof/types.ts` | REAL |
| Analysis result validation | `src/lib/sim-engine/proof/validate-analysis.ts` | REAL |
| Python bridge | `src/lib/sim-engine/proof/python-client.ts` | REAL — HTTP `POST {EVIDENCE_ENGINE_URL}/analyze` when set, otherwise `spawn` of `python -m evidence_engine` in `services/evidence-engine` |
| Python worker | `services/evidence-engine/` (`worker.py`, `evidence_engine/{app,analyze,__main__}.py`, `tests/test_fixtures.py`) | REAL |
| Sandbox subsystem | `src/lib/sim-engine/proof/sandbox/` (21 modules incl. `lifecycle`, `service`, `steps`, `world-state`, `proof-repos`, `capability`, `kill-switch`, `receipt-hash`, `cleanup`) | REAL |
| Second implementation | `src/lib/sim-engine/golden-path/` (`contracts.ts`, `persistence.ts`, `workflow.ts`) | REAL against the worker; DB round-trip unproven per `GRAPH_STATE.md` |

The Python worker has **no database authority** — `python-client.ts` passes a
`RunSnapshot` in and validates an `AnalysisResult` out. Persistence stays in
TypeScript.

`proof_*` tables reached from app code: `proof_runs`, `proof_invitations`,
`proof_events`, `proof_artifacts`, `proof_artifact_versions`,
`proof_analysis_jobs`, `proof_evidence_claims`, `proof_claim_events`,
`proof_claim_reviews`, `proof_defense_sessions`, `proof_decision_briefs`,
`proof_role_calibrations`, `proof_outcomes`, `proof_audit_logs`,
`proof_product_events`.

Whether `025_proof_graph.sql` is applied to any given project is **unverifiable
from source**. `GRAPH_STATE.md` records it as applied to `fydell-dev` as
`025_proof_graph_schema` + `025_proof_graph_rls`.

### 1.3 Simulation Architecture Engine lab — `src/lib/sim-engine/` (non-proof)

The engine described by `.cursor/rules/simulation-engine.mdc`.

| Element | Path | Status |
|---|---|---|
| Scenario catalog | `src/lib/sim-engine/scenarios/catalog.ts` — 7 scenarios across 5 roles | REAL |
| Runtime | `runtime/` — `simulationRuntime`, `eventEngine`, `personaRuntime`, `taskManager`, `worldState`, `artifactManager`, `communicationRuntime`, `resourceLibrary`, `sqlRuntime`, `technicalRuntime`, `telemetryRuntime` | REAL |
| Analysis | `analysis/analysisEngine.ts`, `northlineEvaluator.ts`, `northlineWorkflow.ts` | REAL |
| Validation | `validation/validateScenario.ts` | REAL |
| Registries | `registry/rendererRegistry.ts`, `registry/workbenchLayout.ts` | REAL, availability-aware |
| Lab routes | `src/app/(lab)/lab/sim/`, `lab/sim/[scenarioId]/`, `.../analysis/`, `lab/pilot/` | FLAGGED-OFF in production |
| Workspace routes | `src/app/app/employer/workbench/`, `workbench/[scenarioId]/`, `.../analysis/` | FLAGGED-OFF in production |
| Hosts | `src/components/simulations/hosts/{ScenarioWorkbenchHost,ScenarioAnalysisHost,WorkbenchClient}.tsx` | REAL |
| Role sandboxes | `src/components/simulations/sandboxes/` — `ConfigDrivenSandbox`, `DataAnalyst`, `ImplementationConsultant`, `SolutionsEngineer`, `TechnicalSupport` | REAL |
| Dev persistence | `adapters/persistence.ts` — `InMemoryPersistenceAdapter` + localStorage (`fydell.sim-engine.dev.`) | REAL, explicitly development-only in its own header |
| Lab API | `src/app/api/lab/sim-engine/evidence/route.ts` | REAL |

Flag semantics, `src/lib/sim-engine/featureFlag.ts`:

- `isSimEngineEnabled()` — `false` if `SIM_ENGINE_ENABLED=0`; in
  `NODE_ENV=production` requires `SIM_ENGINE_ENABLED=1`; otherwise `true`.
- `isSimEngineSelfServeOptIn()` — additionally requires `SIM_ENGINE_SELF_SERVE=1`,
  default off everywhere including development.

The strangler seam is `src/app/simulations/start/[slug]/route.ts`: with self-serve
opt-in **and** a slug that `resolveEngineScenarioId()` maps, it redirects to
`/lab/sim/<id>`; otherwise it calls `createSelfServeAttempt()` and redirects to
`/sim/<sessionId>`. Default behaviour is the production path.

Note that `src/app/app/employer/workbench/[scenarioId]/page.tsx` puts the lab
engine **inside the authenticated employer shell** behind `requireUser()` +
`requireOrgMember()` + `isSimEngineEnabled()`. Its own copy states "Your
attempt. Not recorded against a candidate." This is the thinnest point of the
isolation boundary in the current tree.

---

## 2. Route map

### 2.1 Candidate / evaluation

| Route | Backing | Status |
|---|---|---|
| `/sim/[sessionId]` | `WorkbenchRunner` + `sim_*` | REAL (production) |
| `/sim/[sessionId]/result` | `sim_analysis_runs` | REAL |
| `/simulations` | marketing narrative page, `lib/fixtures/northline` | MOCK content, REAL route |
| `/simulations/start/[slug]` | `createSelfServeAttempt()` or lab redirect | REAL |
| `/app/simulations/new` | employer-side start | REAL |
| `/app/candidate`, `/app/candidates` | `requireUser()` + service-role reads | REAL |
| `/invite/[token]`, `/work/[token]`, `/results/[token]`, `/record/[token]` | token surfaces | REAL |
| `/receipts/[publicId]` | `ArtifactWorkReceiptIssuer.loadPublic()` | REAL, proof-side |

### 2.2 Employer workspace (`/app/employer/*`)

| Route | Data source | Status |
|---|---|---|
| `/app/employer` | `_lib/data.ts` metrics + attention queue | REAL |
| `/app/employer/candidates` | `getInvitationRecords()` → `sim_invitations` | REAL |
| `/app/employer/candidates/[sessionId]` | `sim_sessions` | REAL |
| `/app/employer/reports` | `getReportRecords()` → `sim_analysis_runs` | REAL |
| `/app/employer/evidence` | same `getReportRecords()` as Reports | REAL, duplicate surface |
| `/app/employer/work` | `getInvitationRecords()`, derives `workState()` | REAL |
| `/app/employer/assessments` | `_lib/catalog.ts` → `sim_templates` | REAL |
| `/app/employer/assessments/report/[sessionId]` | report chain | REAL |
| `/app/employer/settings` | `memberIdentity()` + preview fallback | REAL |
| `/app/employer/roles`, `/roles/[roleKey]` | `lib/simulations/roles.ts` | REAL over static role list |
| `/app/employer/receipts` | none — hardcoded empty state + links to `/sandbox` | VISUAL-ONLY |
| `/app/employer/proof` | client component calling `/api/proof/*` | REAL, proof graph |
| `/app/employer/proof/[runId]` | `proof_*` reads | REAL |
| `/app/employer/proof/calibration` | `/api/proof/calibration` | REAL |
| `/app/employer/workbench`, `/workbench/[scenarioId]`, `/…/analysis` | sim-engine catalog | FLAGGED-OFF |
| `/app/employer/compare`, `/cohort`, `/outcomes` | pilot APIs | REAL |
| `/app/fde` | `lib/fde/` | separate FDE surface |

### 2.3 Sandbox (`/sandbox/*`)

All nine sandbox routes call `checkSandboxHealth()` then render
`<SandboxApp surface="…" />`. See §4 for the static/orphan split.

`/sandbox`, `/sandbox/roles`, `/sandbox/overview`, `/sandbox/candidates`,
`/sandbox/work`, `/sandbox/simulation`, `/sandbox/evidence`,
`/sandbox/evidence/[runId]`, `/sandbox/receipts`,
`/sandbox/receipts/[publicId]`, `/sandbox/outcomes`.

### 2.4 Admin (`/admin/*`)

`overview`, `users`, `users/[id]`, `organizations`, `invitations`, `audit`,
`email`, `settings`, `settings/security`, `pilot-requests`,
`pilot-requests/[id]`, `pilot-feedback`, `proof`, `proof/[runId]`, `shadow`,
`repair`, `forbidden`. All REAL against `platform_*` / `proof_*` / `sim_*`.

### 2.5 Marketing

`/`, `/product`, `/pricing`, `/how-it-works`, `/simulations`, `/roles`,
`/roles/[key]`, `/employers`, `/candidates`, `/security`, `/trust`, `/terms`,
`/privacy`, `/contact`, `/request-pilot`, `/pilot/*`, `/evidence-report`.

### 2.6 Auth

`/login`, `/signup`, `/signup/role`, `/forgot-password`, `/reset-password`,
`/auth/update-password`, `/auth/confirmation-required`, `/auth/link-invalid`,
`/account/setup-required`, `/onboarding/employer`, `/dashboard` (redirect to
`/app/employer`).

---

## 3. Supabase clients, guards, and API surface

### 3.1 Clients

| Module | Purpose |
|---|---|
| `src/lib/supabase/admin.ts` | service-role client (`createAdminSupabaseClient`, `isSupabaseConfigured`) |
| `src/lib/supabase/server.ts` | RLS-scoped server client |
| `src/lib/supabase/client.ts` | browser client |
| `src/lib/supabase/middleware.ts` | `updateSession()` cookie refresh |
| `src/lib/supabase/project-guard.ts` | environment boundary |
| `src/lib/sim-engine/proof/db.ts` | `proofAdmin()` — proof-graph client |
| `src/lib/sim-engine/proof/sandbox/client.ts` | `sandboxAdmin()` — sandbox client |

### 3.2 Guards

`project-guard.ts` is the hard environment boundary:

- `PRODUCTION_PROJECT_REF = "qtrhwrcxthtqvkeerptp"`, `STAGING_PROJECT_REF = "btbmvrvynnrhapjdkunz"`.
- Production requires `FYDELL_ALLOW_PRODUCTION_DB=true`; anything else fails closed.
- `assertNoPublicServiceKey()` hard-stops a service-role key in any `NEXT_PUBLIC_` var.
- URL ref, anon-key ref, and service-key ref must agree.
- `isPlausibleServiceRoleKey()` rejects placeholders, so a placeholder cannot
  create orphan Auth users.

`src/middleware.ts` forwards `x-pathname` and sets
`Cache-Control: private, no-store` for `/admin`, `/account`, `/app`, `/sim/`,
`/simulations`, `/invite/`, `/results/`.

Row guards: `requireUser()` and `requireOrgMember()` from
`src/lib/simulations/auth.ts`; `src/lib/simulations/invitation-gate.ts`;
sandbox capability cookie (`proof/sandbox/capability.ts`) +
`loadOwnedSandbox(runId, secret)`; `proof_run_visible()` in SQL.

### 3.3 Sandbox APIs

| Route | Behaviour |
|---|---|
| `GET /api/sandbox` | health gate → capability cookie → `loadOwnedSandbox` → `buildSandboxView` |
| `POST /api/sandbox` | `createSandboxRun(clientIp)` + capability cookie |
| `POST /api/sandbox/actions` | validates and applies a `SandboxAction` |
| `POST /api/sandbox/reset` | restores the fixture |
| `GET /api/cron/sandbox-cleanup` | `proof/sandbox/cleanup.ts` |

`SandboxAction` union (`proof/sandbox/service.ts`): `start`, `save_work`,
`commit_initial`, `deliver_constraint`, `submit_revised`, `begin_defense`,
`submit_defense`, `review`, `record_outcome`, `advance`, `retry_analysis`.

### 3.4 Other API families

- `sim`: `catalog`, `attempts`, `invitations`, `invitations/[token]`,
  `invitations/manage/[id]`, `results/[sessionId]`, `results/[sessionId]/share`,
  `feedback`, and `sessions/[id]/{route,start,state,events,messages,assistant,curveball,decision,defense,analyze,report,submit,preflight,consent}`.
- `proof`: `start`, `calibration`, `invitations`, `shortlist`, `logo`,
  `runs/[runId]`, `runs/[runId]/{retry,defense,review,outcomes}`.
- `platform` / `auth` / `admin`: `login`, `logout`, `signup`, `me`,
  `forgot-password`, `role`, `invite`, `repair`, `users/[id]`,
  `candidates/[id]/{score,pdf}`, `invitations/[id]`, `pilot-requests/[id]`.
- `pilot`: `compare`, `cohort`, `pilot-feedback`, `public/pilot-requests`.
- infra: `health`, `receipts/[publicId]`, `employer/workspace`,
  `webhooks/resend`, `cron/process-email-outbox`, `cron/sandbox-cleanup`,
  `lab/sim-engine/evidence`.

---

## 4. Reports, receipts, role calibration, candidate pages, settings, marketing, animations

### 4.1 Reports — two generations coexist

Production: `GET /api/sim/sessions/[id]/report` composes `sim_analysis_runs` +
`sim_competency_results` + `sim_evidence_items` + `sim_submissions` +
`sim_employer_decisions` + `listEvents()`, and branches on
`isV2PersistedResult()`. Rendered by `src/components/sim/EvidenceReport.tsx`
and `EvidenceReportV2.tsx`. **REAL.**

Proof-side: `proof_decision_briefs` + `proof_evidence_claims`, rendered by
`src/app/app/employer/proof/[runId]/page.tsx`. **REAL, isolated.**

Marketing: `src/app/evidence-report/page.tsx` is a hand-written brief. Its own
comment says the values keep matching `sim-engine/golden-path/contracts.ts`.
**MOCK, deliberately.**

### 4.2 Receipts — three unrelated implementations

| Implementation | Path | Status |
|---|---|---|
| Production share links | `src/lib/pilot/receipt-share.ts` → `sim_receipt_shares`, `sim_receipt_share_access` | REAL |
| Proof artifact receipts | `proof/sandbox/proof-repos.ts` `ArtifactWorkReceiptIssuer` + `receipt-hash.ts`; served by `/receipts/[publicId]` and `GET /api/receipts/[publicId]` (returns `integrityHash`) | REAL |
| Sandbox demo receipt | `src/components/sandbox/SandboxWorkReceipt.tsx` from `sample-artifacts.ts` | MOCK |
| Employer receipts index | `/app/employer/receipts` | VISUAL-ONLY — hardcoded "No employer-visible Work Receipts" + three static value props |

### 4.3 Role calibration

- Proof: `/app/employer/proof/calibration` (client) ↔ `/api/proof/calibration`,
  upserting `proof_role_calibrations` on `role_id = PROOF_ROLE_ID` with
  `approved_by` / `approved_at` and an `audit()` entry. **REAL but single
  hardcoded role.** `GRAPH_STATE.md` marks G4 `NOT_STARTED`: "Sprint 1
  intentionally uses one hardcoded SE role."
- Sandbox: `/sandbox/roles` renders `SandboxRole`, which falls back to five
  hardcoded competency strings when no session exists. **MOCK/partial.**
- Production: `src/lib/simulations/roles.ts` is a static role list; there is no
  employer-editable calibration on the `sim_*` side.

### 4.4 Candidate pages

`/app/candidate` is REAL (`requireUser()` + service-role reads + `ROLE_BY_KEY`).
`/app/employer/candidates` and `/candidates/[sessionId]` are REAL. Sandbox
`SandboxCandidates` falls back to four hardcoded demo identities. The public
`/candidates` route is marketing.

### 4.5 Settings

`/app/employer/settings` is REAL — `getAuthenticatedUser()`,
`isSupabaseConfigured()`, `memberIdentity()`, `WorkspaceNameForm`,
`SignOutButton`, `MANAGER_ROLES = {owner, admin}` — **with a preview fallback**
to `PREVIEW_ORG` / `PREVIEW_USER` when `isPreviewMode()`. Admin settings live at
`/admin/(ops)/settings` and `/settings/security`.

### 4.6 Marketing and animations

Components: `src/components/marketing/{ClosingCTA,PageIntro,PilotRequestForm,ui}.tsx`,
`home/{HeroComposition,HeroEvidenceScene,HeroShortlistScene,HeroSimPreview,HomeMotionController,HomeProductStory,NarrativeScenes,PrincipleDiagrams,ProductFrame}.tsx`,
`home/homepage.module.css`, `product/{EvidenceWalkthrough.tsx,DecisionBriefExample.module.css}`.

`src/components/marketing/{motifs,simulations,v3}/` are **empty directories**.

Animation stack — only three files import it:

| File | Library |
|---|---|
| `src/components/marketing/home/HomeMotionController.tsx` | `gsap` + `@gsap/react` `useGSAP` + `ScrollTrigger`, `gsap.matchMedia()`, early return on `prefers-reduced-motion: reduce` |
| `src/components/layout/LenisProvider.tsx` | `lenis` smooth scroll |
| `src/components/motion/Reveal.tsx` | `motion` |

`scripts/check-motion-safety.ts` exists as the guard.

### 4.7 Preview mode — the largest mock surface inside the real app

`src/lib/dev/preview.ts` (≈700 lines, `server-only`) short-circuits
`getInvitationRecords`, `getReportRecords`, `getOverviewMetrics`,
`getWorkspaceHealth`, `getNeedsReviewRecords`, `getOperationalSnapshot` and the
settings identity. Guards: disabled unconditionally when
`NODE_ENV === "production"`, opt-in via `FYDELL_UI_PREVIEW=1`, all fixture
names visibly synthetic. `GRAPH_STATE.md` records the consequence:
`npm run dev:preview` "serves synthetic employer data to anyone", which is why
route protection on `:3000` could not be verified.

---

## 5. Tests

| Command | Covers |
|---|---|
| `test:unit` | pilot validation/lifecycle, safe-next, state machines, disclosure boundary, wave1 contract, workspace navigation/identity/availability, db-security contract, project guard, then `test:proof` |
| `test:release` | sims, v2, v3, states, disclosure, october, auth, copy, db-security, project-guard, identity, availability, typecheck |
| `test:proof` | `test-proof-graph`, `test-sandbox-contracts`, `test-proof-database`, `test-golden-path-persistence` |
| `test:proof:live` | `test-sandbox-live`, `test-proof-database`, `test-golden-path-persistence` |
| `test:sim-engine` | `test-sim-engine-runtime`, `test-sim-engine-analysis`, `test-golden-path-skeleton`, golden-path persistence |
| `test:v2` / `test:sims` / `test:v3` / `test:october` | v2 scoring, micro scoring, northline v3, october pilot |
| `test:e2e` | Playwright: `e2e/{pilot-request,relay-golden-path,sandbox-isolation}.spec.ts`, `tests/e2e/{october-pilot-path,pilot-golden-path}.spec.ts` |
| audits | `audit-accessibility`, `audit-responsive`, `audit-marketing-visual`, `check-motion-safety`, `scan-retired-terms` |

In-tree colocated tests: `sim-engine/analysis/northlineWorkflow.test.ts`,
`sim-engine/runtime/sqlRuntime.test.ts`,
`sim-engine/scenarios/data-analyst/northline-fixtures.test.ts`.

**Known gaps, per `GRAPH_STATE.md`.** The live `proof_*` gates (event-sequence
concurrency, cross-org RLS, service-role persistence round trip) **skip by
default**: they read only process env, never `.env.local`, and
`FYDELL_DEV_DB_URL` / `FYDELL_DEV_SERVICE_ROLE_KEY` are recorded as
placeholders. `REQUIRE_PROOF_DATABASE_TESTS=true` converts a skip into a
failure. So G2, G3, G8, G9, G12 are `TESTING`, not proven; G19 is `BLOCKED`.

---

## 6. Named defects

### 6.1 `/sandbox/work` is static while the interactive workbench is orphaned

Hard evidence:

- `src/app/sandbox/work/page.tsx` renders `<SandboxApp surface="work" />`.
- `SandboxApp.tsx:272` renders `<SandboxLiveSimulation />` for
  `surface === "work" || surface === "simulation"`.
- `SandboxLiveSimulation.tsx` imports only `SAMPLE_*` constants from
  `./sample-artifacts` and holds one `useState` for file tab selection. It issues
  no request.
- `SandboxWorkbench.tsx` — the component with the six artifact fields,
  `commit_initial`, `deliver_constraint`, `submit_revised`, the before/after
  "What changed" panel, and the oral-defense form — is imported by **nothing**.
  A repo-wide grep for `SandboxWorkbench` outside its own definition returns
  only docs.
- `git show 158650d:src/components/sandbox/SandboxApp.tsx` contains
  `import { SandboxWorkbench } from "./SandboxWorkbench";` and renders it with
  `session`/`busy`/`onAction`/`onEnsure`. `HEAD` (`45d95c1`, "Rebuild the
  sandbox demo surfaces to match the product design comps") replaced it with the
  static scene.

Consequences:

1. The only surviving `act()` caller in `SandboxApp` is `SandboxOutcomes`.
2. `SandboxOutcomes` gates its button on `session?.step !== "finalized"`, and the
   actions that advance a run toward `finalized` lived in the orphaned workbench.
   Nothing in the shipped UI can call `start`, `save_work`, `commit_initial`,
   `deliver_constraint`, `submit_revised`, `begin_defense`, `submit_defense`, or
   `review`. **The sandbox record-outcome button is unreachable → BROKEN.**
3. `POST /api/sandbox/actions`, `applySandboxAction`, the world-state machine,
   `proof-repos` writes, the receipt hasher, and `runEvidenceJob` are all live
   server code with no shipped caller for most of their action space.
4. `SandboxApp`'s prop type accepts `runId?` and `publicId?`, but the function
   destructures only `{ surface }`. `/sandbox/evidence/[runId]` and
   `/sandbox/receipts/[publicId]` therefore pass an ID that is **discarded**, and
   render the same static `SAMPLE_*` evidence and receipt for every ID.
   VISUAL-ONLY with a misleading URL contract.
5. `SandboxEvidence.tsx` and `SandboxWorkReceipt.tsx` are likewise pure
   `SAMPLE_*` renderers.
6. `SandboxApp`'s polling `useEffect` still runs `GET /api/sandbox` on a 2s→16s
   backoff to keep a session whose state no surface can change.

### 6.2 Four conflicting Solutions Engineer narratives

| # | Narrative | Source | Identity |
|---|---|---|---|
| 1 | Lab engine scenario | `sim-engine/scenarios/solutions-engineer/northstar-integration.ts` | `scenarioId: "northstar-integration"`, `scenarioVersion 1.0.0`, `engineVersion 0.1.0`, title "Northstar Health, CRM sync failure before board demo", `companyName: "Acme Cloud (customer: Northstar Health)"`, 7 tasks |
| 2 | Proof sandbox fixture | `sim-engine/proof/sandbox/fixture.ts` | `ACME_FIXTURE_ID = "acme-rollout"`, `fixtureVersion "acme-rollout-v1"`, `organization: { name: "Northstar", customer: "Acme" }`, `role.slug "solutions-engineer"`, surfaced as "Acme technical discovery and rollout" |
| 3 | Golden-path skeleton | `sim-engine/golden-path/contracts.ts:142-143` | `roleKey: "solutions_engineer"`, `scenarioVersion: "northstar-pilot-1.0.0"` |
| 4 | Production micro content | `lib/simulations/content/micro-solutions-delivery-2.ts` | `roleKey: "solutions_engineer"`, title "SSO Is Not Provisioning", `companyName: "Ridgemont Financial (customer)"` |

Narratives 1 and 2 **invert the vendor/customer relationship using the same two
proper nouns**: in (1) Acme Cloud is the vendor and Northstar Health is the
customer; in (2) Northstar is the organization and Acme is the customer. A fifth
retelling — `src/components/sandbox/sample-artifacts.ts` — hardcodes prose for
whichever version the design comps used.

`GRAPH_STATE.md` §"Two implementations exist" names the underlying architectural
fork as the main open question: `golden-path/` is the tested walking skeleton
with localStorage UI persistence, while `proof/` is the DB-backed graph with
server-assigned sequence, job outbox, and RLS. Both claim the same SE pilot.

### 6.3 Other disconnected or duplicated code

- `sim-engine/adapters/supabasePersistence.ts` imports
  `server/attemptPersistence.ts` and is itself imported by nothing.
  `attemptPersistence.ts` writes engine snapshots into the **production**
  `sim_session_state.workspace` JSON under `engineAttempt` — a live seam between
  the lab engine and a protected production table, currently unreachable because
  no caller exists.
- `sim-engine/adapters/legacy-compat.ts:8` documents a
  `sim_session_events`-shaped payload and states it is "not written yet".
- `/app/employer/reports` and `/app/employer/evidence` both render
  `ReportsList` from the same `getReportRecords()`.
- Root-level `company.html`, `index.html`, `pricing.html`, `product.html`,
  `report.html`, `resources.html`, `simulation.html`, `solutions.html`,
  `_verify.html`, plus `_apply_98.py`, `_apply_visual_rebuild.py`, `_qa98.py`,
  `_qa_check.py`, `_qa_pass2.py`, `_rebuild_reference.py`, `_strip_premium.py`,
  `sim-engine.js`, `sim-engine.cjs`, `build-out.txt`, `lint-errors.txt`,
  `spike-out.txt`, `fde-unit-out.txt` are build/scratch artifacts outside the
  Next.js app.
- ~50 overlapping documents in `docs/` and 12 more at the repo root
  (`PRODUCT.md`, `BACKEND_MVP.md`, `DESIGN.md`, `GRAPH_STATE.md`,
  `FYDELL_VISUAL_SYSTEM.md`, `APPROVED_VISUAL_CONTRACT.md`, …) describe several
  mutually inconsistent generations of the product.
