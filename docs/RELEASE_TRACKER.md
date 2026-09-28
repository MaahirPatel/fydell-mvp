# Fydell paid-release tracker

Tracks every ID in the paid-customer release checklist (version 2026-09-27:
222 requirements, 28 end-to-end journeys) against this repository.

- **Branch / commit:** `claude/checklist-integration` (based on
  `feature/desktop-sim-client` at `8628636`). Assessed 2026-09-28.
- **Environment:** Windows 11 workstation. Node 24, Python 3.14 + pytest 9,
  Rust stable (x86_64-pc-windows-gnu). No Supabase project, no deployed app,
  no isolated runner, no Stripe live account, no second machine, no external
  reviewers. Nothing here has run against a live environment.
- **Owner:** unassigned for every row. Assign during triage.
- Per-area working logs from the parallel build agents remain in
  `CHECKLIST_PROGRESS_*.md`. This file supersedes their statuses where they
  differ: several "DONE-TESTED" rows there are rule libraries with in-process
  tests that no product route or UI calls yet.

## Status key

| Code | Meaning |
| --- | --- |
| **V** | Verified: implemented, and the passing condition itself was observed by a check executed in this repo on the date above. Only possible where the condition does not need a live deployment, device or person. |
| **I** | In progress: code exists and code-level checks pass, but the condition has not been observed end to end (needs a live environment, a real device or person, or the rule is not yet wired into the product). |
| **I (rules only)** | A logic library with in-process tests exists, but no product route or UI uses it. |
| **M** | Missing. |
| **B** | Blocked outside the codebase (credentials, certificates, counsel, customers, qualified reviewers, clean machines). |
| **P1** | Deferred P1: not sold or promised. Promote to P0 if that changes. |

## Headline

- **Stop conditions still open:** unverified sandbox isolation (RUN-01/02),
  scenario not yet reviewed by a qualified engineer (SCEN-09), no clean-machine installer
  test (DESK-02/21, E2E-17), no live cross-tenant test (SEC-06, E2E-09),
  payment lifecycle not run against Stripe (BILL-07, E2E-14).
- **Release gates passed end to end:** none yet. Every gate needs the live
  rehearsal in `docs/ENGINEERING_ASSESSMENT_RUNBOOK.md`.
- **Built and verified in this pass:** the backend scenario and its
  validation (SCEN-01..03), the isolated, revision-bound test runner and its
  integrity checks (RUN-04..06, DESK-12), desktop remote test runs
  (DESK-06/13/17), evaluation in the employer report (AI-01, REP-03),
  role-based authorization on hiring actions (AUTH-04), the desktop version
  endpoint (DESK-19), invitation email correctness and escaping (SEC-07),
  usage held for unevaluated work (BUY-03), removal of fake-success routes
  (UX-04), landing-page contract fixes, a human QA hold on engineering
  reports with an admin review queue (AI-12), and starter-vs-submission code
  diffs in the report (REP-02).

## Visual and interaction

| ID | Status | Implementation / evidence | Remaining |
| --- | --- | --- | --- |
| VIS-01 | I | `src/components/brand/` (`FydellMark`, `/brand/fydell-mark.png`); design log reports no reference-company assets | Confirm the mark is the supplied rings asset |
| VIS-02 | I | `src/styles/fydell-tokens.css` (web), `desktop/src/tokens.css` | Marketing, web app and desktop not yet proven to share one source |
| VIS-03 | I | Type scale tokens; hard-coded sizes removed in marketing (design log) | Browser review at real sizes |
| VIS-04 | I | 4px spacing scale in tokens | Visual review |
| VIS-05 | I | Semantic color tokens; evidence colors documented | Visual review |
| VIS-06 | I | `src/components/ui/*`, `marketing/ui.tsx` | Inventory review across app surfaces |
| VIS-07 | I | No score rings/revenue charts found in employer app (design log) | v2 report still shows a single "Performance" number (see REP-03) |
| VIS-08 | I | loading/error routes on employer app; engineering results show pending/failed/not-configured states | Exhaustive state review in a browser |
| VIS-09 | I | Table components | Dense-data review in a browser |
| VIS-10 | I | Global focus ring, reduced-motion handling, labelled regions (tests panel uses role=status/aria-live) | Keyboard and screen-reader pass; desktop editor/panel keyboard access |
| VIS-11 | I | Responsive CSS; hero actions wrap | Check 390/1024/1440 and desktop minimum window |
| VIS-12 | I | Action labels; landing now "Get started", "Explore demo" | Review app-surface copy |
| VIS-13 | I | `/demo` labelled example data | Demo still uses its own fixtures, not the real report components (DEMO-04) |
| VIS-14 | I | — | Connected-screen review in a browser |
| VIS-15 | P1 | `.theme-ink` exists | — |

## Page contracts

| Screen | Status | Evidence | Remaining |
| --- | --- | --- | --- |
| Landing | I | Hero has both audiences, Get started → `/get-started`, Explore demo → `/demo`, developer path → `/developers`; `scripts/test-homepage-positioning.ts` passes | Visitor comprehension check (E2E-28) |
| Signup / sign-in | I | `/get-started`, `/signup?as=developer|employer`; invite links under `/invite/[token]` | Live check that developers are never asked for a company and invites land correctly |
| Developer home | I | `/app/candidate` | Review primary-action logic with real account states |
| GitHub import | I | `/api/passport/github`, coverage + skip reasons | Live import against GitHub |
| Passport | I | Passport UI and share routes | Live share/revoke round trip |
| Employer home | I | `/app/employer` queue-first home | Review with real data |
| Role detail | I | `/app/employer/roles` | Role definitions are not persisted (EMP-01) |
| Candidate list | I | `/app/employer/candidates` | Filter/sort review with real data |
| Employer report | I | `EvidenceReport` + `EngineeringResults` (test groups, code changes, practice-run facts); held as "Report in review" until released | Live review of the released report |
| Desktop welcome | I | Invitation inbox, provisioning stepper | Live run |
| Desktop assessment | I | Editor, files, team thread, tests panel | Live run on a laptop-size window |
| Desktop submission | I | Submit dialog with sync warning, receipt | Live lost-response test (E2E-20) |
| Billing / settings | I | Stripe checkout/portal (owner/admin only) | Usage ledger not shown to buyers |

## Desktop application

| ID | Status | Implementation / evidence | Remaining |
| --- | --- | --- | --- |
| DESK-01 | V | `desktop/ARCHITECTURE.md` (updated for remote execution) matches the code | — |
| DESK-02 | I | Linux `.deb/.rpm/.AppImage` reported built earlier; Windows backend compiles and 29 Rust tests pass | Build and install on a clean machine; uninstall test |
| DESK-03 | B | `src/lib/desktop/distribution.ts` (rules only) | Signing certificates and release pipeline |
| DESK-04 | I | System-browser sign-in, state binding, keychain (`auth.rs`); web W1/W2 routes | Live sign-in round trip |
| DESK-05 | I | Invitation inbox in desktop; `src/lib/desktop/assignment-links.ts` (rules only) | Web "Open in Fydell" deep link not wired |
| DESK-06 | I | Provisioning steps with retry; remote-execution packages no longer require any local runtime (`session.rs` runtime step) | Live provisioning on a clean machine |
| DESK-07 | I | Monaco editor; `src/lib/desktop/editor-state.ts` (rules only) | Verify find/replace, undo, protected files in the app |
| DESK-08 | I | Budgets in `src/lib/desktop/responsiveness.ts` (rules only) | Measure on the lowest supported laptop |
| DESK-09 | I | `sync.rs` state machine, unit-tested | Live sync against the platform |
| DESK-10 | I | `recovery.rs`, exit warning | Crash/restart test on a device |
| DESK-11 | I | Single-writer lock + fenced PATCH, unit-tested | Two-window live test (E2E-21) |
| DESK-12 | I | Runs bound to a server snapshot hash; "Results from an earlier version" via `workspace_fingerprint`; result change between defective and fixed code observed through the real pipeline (`npm run validate:scenario`) | Observe through the desktop against a deployment (E2E-18) |
| DESK-13 | I | Remote runs only (no shell), one at a time, rate-limited, bounded output, "Test output" section | No stop/cancel for an in-flight remote run |
| DESK-14 | I | Brief, team thread with polling, requirement update delivered server-side on the message poll | Live check that updates do not cover the editor |
| DESK-15 | I | Operation-id idempotent submit (`src/lib/submissions`), tested in-process | Live DB apply of migration 031 |
| DESK-16 | I | Receipt recovery via GET finalize, tested in-process | Live lost-response test |
| DESK-17 | I | No shell plugin; minimal capabilities; engineering scenarios execute nothing locally | Legacy local runner still exists for old packages |
| DESK-18 | I | `src/lib/desktop/privacy-lifecycle.ts` (rules only); tokens in keychain | Sign-out purge and account scoping in the app |
| DESK-19 | I | Version gate in `version.rs`; `GET /api/desktop/version` now served (7 checks) | No auto-updater, update authenticity or rollback |
| DESK-20 | I | Redacted diagnostics + error references, unit-tested | Support workflow using them |
| DESK-21 | B | — | A person outside development completes install → submit → report |
| DESK-22 | P1 | — | — |

## Job simulation and evidence

| ID | Status | Implementation / evidence | Remaining |
| --- | --- | --- | --- |
| WORK-01 | V | `scenarios/webhook-retry-incident` with regression, permitted fixes, tests, clarification facts and update documented in `.fydell/rubric.json`; no local setup needed; validation passes | Expert review is tracked under SCEN-09 |
| WORK-02 | I | Correctness: trusted + hidden test groups; adaptation: `requirement_update` group; design reasoning: starter-vs-submission diff + handoff; communication: handoff + messages | Live review with real submissions |
| WORK-03 | I | Server timestamps, fair response window, extensions (`timing.ts`, `curveball-policy.ts`) | Live DB |
| WORK-04 | I | Update group reported "Not observed" when the update was never presented; partial-submission rules | Desktop does not warn before submitting ahead of the update |
| WORK-05 | I | Authored teammate rules with fixed facts; hint ledger | Live check of AI redraft constraints |
| WORK-06 | I | `engineering.toolsPolicy` text; AI-use policy in the session payload | Desktop display of the policy |
| WORK-07 | V | Culture-fit language scan passes across all shipped content including the new scenario (`test-sim-grind-content`) | — |
| WORK-08 | I | Report states practice-run facts and their limits; `process-observations.ts` | Review wording with a reviewer |
| WORK-09 | I | Template versions pinned per invitation; comparability rules | Live cohort check |
| WORK-10 | P1 | — | — |

## Network foundations

| ID | Status | Implementation / evidence | Remaining |
| --- | --- | --- | --- |
| NET-01 | I (rules only) | `src/lib/grants/share-grants.ts` | Wire into applications |
| NET-02 | I (rules only) | Provenance fields in grants lib | Wire into passport evidence |
| NET-03 | I (rules only) | — | Evidence selection in the invitation flow |
| NET-04 | I | Passport share projection excludes employer notes and hidden tests; hidden tests never leave the server | Grants lib not wired |
| NET-05 | I | Share preview copy (`passport/view.ts`) | Live share flow |
| NET-06 | I (rules only) | Versioned re-evaluation in grants lib | — |
| NET-07 | I | Passports private by default; no auto-apply | Live check |
| NET-08 | I (rules only) | In-process cross-employer test | Live E2E-26 |
| NET-09..14 | P1 | — | — |

## Paid outcome

| ID | Status | Implementation / evidence | Remaining |
| --- | --- | --- | --- |
| BUY-01 | I | `docs/BUYER_PROMISE.md`: Backend Engineer, webhook retry incident, hiring step, reviewer | Agree with the first buyer |
| BUY-02 | I | Candidate time 60 min, turnaround, volume, limits | Named support address not configured |
| BUY-03 | I | Billable event defined; engineering usage held until an evaluation actually ran (`src/lib/engineering/billing.ts`, 5 checks) | Live Stripe meter check |
| BUY-04 | B | Rehearsal protocol in BUYER_PROMISE | A hiring manager reviews rehearsal reports |
| BUY-05 | B | Measurement protocol | A real pilot |
| BUY-06 | V | Unsupported claims (fake invite code, fake sample report id, 90 minutes) removed; forbidden-claim scan passes | — |
| BUY-07 | B | CRM log protocol | Real buyers |

## Ease of use and navigation

| ID | Status | Implementation / evidence | Remaining |
| --- | --- | --- | --- |
| UX-01 | I | `/get-started` with separate developer and employer paths | Live signup check |
| UX-02 | I | Queue-first employer home | Review with data |
| UX-03 | I | Primary actions on core screens | Uncoached test (E2E-28) |
| UX-04 | I | Removed `/api/employer/invitations/**` and `/api/auth/invitations/accept`, which returned success without saving | App-surface control audit |
| UX-05 | I | Run states persisted (`sim_test_runs`), report shows pending/failed/not-configured | Refresh/reload checks live |
| UX-06 | I | Run/submit errors carry recovery text and "work is saved" | Live review |
| UX-07 | I | Labels, focus, aria-live on test results | Keyboard pass |
| UX-08 | B | — | Real devices, two browsers |
| UX-09 | I | Idempotent runs and submits | Live back/refresh checks |
| UX-10 | P1 | — | — |

## Accounts and organization access

| ID | Status | Implementation / evidence | Remaining |
| --- | --- | --- | --- |
| AUTH-01 | I | Supabase signup/login/reset routes | Live flows for each method |
| AUTH-02 | I (rules only) | `src/lib/auth/oauth-state.ts`; GitHub import uses public repos by name, no account linking | Only needed if account linking ships |
| AUTH-03 | I | Employer onboarding creates the workspace server-side | Live check that client-supplied org ids are ignored |
| AUTH-04 | I | Role capability matrix enforced on invite/resend/revoke, cohort, proof invitations and both decision routes (`src/lib/orgs/capabilities.ts`, 32 checks); billing owner/admin only | No in-product member management; live multi-member test |
| AUTH-05 | M | In-product team invitations are not offered; operators add members through the admin portal | Build Supabase-backed member invitations if teams self-serve |
| AUTH-06 | I | Every org route re-checks `status = active` per request | Live removal test |
| AUTH-07 | I | Platform-admin MFA and role checks (`src/lib/ops/mfa.ts`, `require-platform-role.ts`) | Live operator setup |
| AUTH-08 | P1 | — | — |

## Database, storage and provenance

| ID | Status | Implementation / evidence | Remaining |
| --- | --- | --- | --- |
| DATA-01 | I | Migrations 001–034 cover the workflow; `sim_test_runs` added | No persisted employer role definitions |
| DATA-02 | I | Service-role-only RLS on new tables; hidden material server-only | Live policy audit |
| DATA-03 | I | Unique/partial indexes for idempotent runs; immutability triggers | Apply to staging |
| DATA-04 | I | Runs pin scenario, suite, environment and snapshot hash; analysis runs pin engine version | Model/prompt versions for LLM review (not in the engineering path yet) |
| DATA-05 | I | Routes check ownership before service-role reads | Full path audit live |
| DATA-06 | B | — | Verify bucket privacy in the live project |
| DATA-07 | I | Additive migrations, numbering fixed (031–034) | Fresh + upgrade apply on staging |
| DATA-08 | B | — | Staging restore drill |
| DATA-09 | I | `docs/RETENTION_SCHEDULE.md`; test runs deletable for retention | Automated deletion jobs |
| DATA-10 | P1 | Indexes on hot lookups | — |

## GitHub extraction

| ID | Status | Evidence | Remaining |
| --- | --- | --- | --- |
| GH-01..GH-11 | I | `src/lib/passport/github/*`, wired to `/api/passport/github`; 152 in-process checks with a fake GitHub fetcher (`test-passport-grind-*`) | Live GitHub import, multi-snapshot retention and disconnect against the database |
| GH-12 | P1 | Private repos refused | — |

## Engineering Passport

| ID | Status | Evidence | Remaining |
| --- | --- | --- | --- |
| PASS-01 | I | `src/lib/passport/store.ts` | Live cross-device persistence |
| PASS-02..PASS-05 | I | Passport assembly and view rules, tested | Live UI review |
| PASS-06 | I | Share expiry/revocation; migration 033 (`expires_at`) restored after it was deleted by accident | Apply 033; live round trip |
| PASS-07 | I | Portability copy | Live review |
| PASS-08 | I | Corrections + export; migration 033 (`passport_corrections`) restored | Apply 033; live round trip |
| PASS-09 | I (rules only) | `src/lib/passport/simulationEvidence.ts` | Produce a portable summary from the webhook scenario |

## Employer role and invitation workflow

| ID | Status | Evidence | Remaining |
| --- | --- | --- | --- |
| EMP-01 | I | `/api/employer/roles` validates but returns `persisted: false` | Role table + persistence |
| EMP-02 | I (rules only) | `src/lib/employer/preview.ts` | Preview screen showing instructions, rubric and example report |
| EMP-03 | I | Invitations pin `template_version_id`; sessions load the pinned version | Live check |
| EMP-04 | I (rules only) | `src/lib/employer/customization.ts` | — |
| EMP-05 | I | Email validation, active-duplicate refusal, delivery status, copyable link; email now names the right role and duration | Live send |
| EMP-06 | I | Invitation + session + report statuses | Map to the full state list in the UI |
| EMP-07 | I | Resend (new token, same invitation) and revoke | Deadline extension is not exposed in the product |
| EMP-08 | I | Decisions persist with actor/time, send nothing, now role-gated | Live check |

## Assessment content

| ID | Status | Evidence | Remaining |
| --- | --- | --- | --- |
| SCEN-01 | I | Full scenario: repo, brief, logs, runbook, 12 provided tests, requirement update, teammate facts, handoff; 60 min target | Expert review (SCEN-09) |
| SCEN-02 | V | Four dimensions with observable anchors in `.fydell/rubric.json`; groups map tests to correctness and response-to-requirements | — |
| SCEN-03 | V | `npm run validate:scenario`: reference + 2 alternative solutions pass all 45 checks; 4 defective and 1 partial variant fail exactly the relevant groups | — |
| SCEN-04 | I | Package from allowlist only; test asserts no hidden tests, solutions or metadata in the package; runner image/snapshot supplies pytest | Live automatic provisioning |
| SCEN-05 | B | Linux reported; Windows compiles | Clean-machine verification per declared OS |
| SCEN-06 | I | Desktop preflight + provisioning before the timer | Live |
| SCEN-07 | I | Tools/AI policy in content and session payload | Show it in the desktop before start |
| SCEN-08 | I | Extensions with reasons; fair window | Live |
| SCEN-09 | B | Versioned, immutable publishing; known issues and intended failures recorded; answers server-only | A qualified engineer reviews scenario, rubric and hidden tests |
| SCEN-10 | P1 | — | — |

## Simulation and team communication

| ID | Status | Evidence | Remaining |
| --- | --- | --- | --- |
| SIM-01 | I | Attempt binding and resume rules | Live DB |
| SIM-02 | I | Desktop has brief, editor, tests, team thread, submission | Live run |
| SIM-03 | I | Teammates labelled simulated in every candidate view | Check desktop rendering |
| SIM-04 | I | Authored facts only; update-specific rule gated on the update | Live |
| SIM-05 | I | Update presented server-side, once, on the poll the desktop already makes (it previously never received updates) | Live |
| SIM-06 | I | Idempotent message/event intake | Live DB dedupe |
| SIM-07 | I | Outage streak + extension policy | Live provider failure |
| SIM-08 | I | Disclosed taxonomy, now including `test_run_completed` | Live |
| SIM-09 | I | Four handoff fields as questions | Live |
| SIM-10 | P1 | — | — |

## Submission and file safety

| ID | Status | Evidence | Remaining |
| --- | --- | --- | --- |
| UP-01 | I | Desktop file snapshot → submit/finalize | Live |
| UP-02 | I | Ownership per request; crossed manifests rejected (in-process) | Live |
| UP-03 | I | Transfer state machine (SQL + TS mirror) | Apply migration 031 |
| UP-04 | V | Adversarial path/size/duplicate validation executed (`test-submit-grind-paths`, `test-engineering-runner`) | — |
| UP-05 | I | Server receipt hash; immutable submissions and finished runs (triggers) | Live apply |
| UP-06 | I | Durable receipts, operation-id idempotency (in-process) | Live |
| UP-07 | I | JSON-only intake; hostile names escaped; candidate code executes only in the isolated providers | Live isolation (RUN-01) |
| UP-08 | I | Errors carry recovery text; runner failures reported as not about the code | Live |

## Independent evaluation runtime

| ID | Status | Evidence | Remaining |
| --- | --- | --- | --- |
| RUN-01 | I | Vercel Sandbox microVM provider and gVisor worker (`services/engineering-runner`): no network, no host mounts, no app credentials; local provider refused in production | Live isolation checks (worker README) |
| RUN-02 | I | Network denied; CPU/memory/pids/files/time limits in both providers and the bootstrap | Live exhaustion tests |
| RUN-03 | I | pytest pinned; worker refuses images not pinned by digest; snapshot script installs exact pins | Build and pin the real image/snapshot |
| RUN-04 | V | Provided tests restored, conftest/config dropped, hidden tests mounted server-side only, verdict from JUnit only; weakened-test and conftest fixtures observed failing honestly through real pytest | Re-observe on the isolated provider |
| RUN-05 | V | Trusted bootstrap, nonce-tagged envelope, harness canary; a real reporting-tamper fixture was caught as indeterminate; defective variants re-run on every validation | Re-observe on the isolated provider |
| RUN-06 | V | Infra error, timeout, import error and tamper classified distinctly; infinite loop observed hitting the limit | Live platform-outage case |
| RUN-07 | I | Idempotent run ids, per-snapshot evaluation idempotency, abandoned-run recovery (18 checks) | Durable retry cap for evaluations; live DB |
| RUN-08 | I | Bounded output; fresh VM/container per run; results persisted before cleanup | Live cleanup verification |
| RUN-09 | B | Concurrency cap in worker; per-attempt rate limit | Live cohort-scale run |

## Analysis engine and evaluation quality

| ID | Status | Evidence | Remaining |
| --- | --- | --- | --- |
| AI-01 | V | Engineering results come only from executed tests and are a separate report section; no model can mark tests passed | — |
| AI-02..AI-10 | I (rules only) | `src/lib/analysis/*` (232 in-process checks); only `validate-review` route uses part of it | No LLM review in the engineering path yet; wire these before adding one |
| AI-11 | I | 22-fixture analysis benchmark; 9-variant scenario matrix | 20+ submissions adjudicated by experienced engineers |
| AI-12 | I | Engineering reports are withheld ("Report in review") until a platform reviewer releases them from `/admin/reviews`; release of a non-clean evaluation needs a note; append-only history (migration 035, `src/lib/engineering/report-review.ts`, 33 checks) | Apply migration 035; staff the reviewer role; track turnaround; non-engineering micro sims are not held |
| AI-13 | B | Minimization rules | Provider retention/training settings |
| AI-14 | P1 | — | — |

## Employer report and decisions

| ID | Status | Evidence | Remaining |
| --- | --- | --- | --- |
| REP-01 | I | Report summary, competencies, interview guide; engineering test groups | Decision-brief format (`src/lib/reports/assemble.ts`, rules only) |
| REP-02 | I | Per-test outcomes and per-file unified diffs against the pinned starter (`src/lib/engineering/diff.ts`) | Message links; line-level links from findings once LLM findings exist |
| REP-03 | I | Coding results, interpretation and infrastructure status separated | v2 "Performance" number is a single aggregate; review against "no universal hireability number" |
| REP-04 | I | Versions and snapshot hash shown | Versioned corrections not wired |
| REP-05 | I | Decisions with notes persist | Finding flags/correction requests (rules only) |
| REP-06 | I | Org-member access; hidden test names only in the employer report | Live cross-org test |
| REP-07 | I (rules only) | `src/lib/reports/sharing.ts` | — |
| REP-08 | P1 | — | — |

## Deep public demo

| ID | Status | Evidence | Remaining |
| --- | --- | --- | --- |
| DEMO-01..04, 06, 07 | I (rules only) | `src/lib/demo/*` (48 checks); `/demo` has a 4-step story | Wire the 8-beat story and real components into `/demo` |
| DEMO-05 | I | Demo isolation guard used by the reset route | Live |
| DEMO-08 | P1 | — | — |

## Payment and entitlements

| ID | Status | Evidence | Remaining |
| --- | --- | --- | --- |
| BILL-01 | B | Stripe test mode; `docs/BILLING_POLICY.md` | Live activation (account holder) |
| BILL-02 | I | Stripe-hosted checkout and portal only | — |
| BILL-03 | V | Signature verification through the real Stripe SDK path with a test secret (`test-platform-grind-billing`) | — |
| BILL-04 | I | Event-id dedupe | Live replay |
| BILL-05 | I | Prices from server config; owner/admin only | Live |
| BILL-06 | I | Meter usage once per session; engineering usage held until evaluated; ledger lib (rules only) | Buyer-visible ledger |
| BILL-07 | I | In-process lifecycle test | Stripe test-mode run |
| BILL-08 | B | Customer portal | Support contact |
| BILL-09 | P1 | — | — |

## Security and privacy

| ID | Status | Evidence | Remaining |
| --- | --- | --- | --- |
| SEC-01..03 | B | Drafts in `docs/` | Counsel review |
| SEC-04 | V | Source scan: no screen/camera capture APIs (`test-platform-grind-security`) | — |
| SEC-05 | I | Secret scan; runner never receives app secrets | Rotation/revocation procedures live |
| SEC-06 | I | Ownership checks on routes; access-guard (rules only) | Live cross-tenant test (E2E-09) |
| SEC-07 | I | Invite and resend emails now escape org/candidate names; desktop markdown escapes | Wider output-escaping audit |
| SEC-08 | I | Test runs rate-limited per attempt; login/signup throttles | Invite/import/AI limits live |
| SEC-09 | I | Data-request process doc | First fulfilment |
| SEC-10 | I (rules only) | `src/lib/security/revocation.ts` | — |
| SEC-11..12 | B | Env separation and incident docs | Named responder, live environments |
| SEC-13 | P1 | — | — |

## Operational reliability

| ID | Status | Evidence | Remaining |
| --- | --- | --- | --- |
| OPS-01 | I (rules only) | `src/lib/security/logger.ts` | Wire logging/alerts |
| OPS-02 | M | Error references in desktop diagnostics | Visible support channel |
| OPS-03 | I | Engineering runbook: stuck runs self-recover, analysis retry is idempotent; recovery lib (rules only) | Operator tools in the admin portal |
| OPS-04 | I (rules only) | `src/lib/ops/feature-flags.ts` | Wire a scenario/evaluator kill switch |
| OPS-05 | B | `docs/SERVICE_TARGETS.md` draft | Measure p50/p95 |
| OPS-06 | I | Per-attempt run limit; cost-caps lib (rules only) | Measure real costs |
| OPS-07 | I | Idempotent runs/submits, abandoned-run recovery | Worker-restart drill |
| OPS-08 | I | This tracker lists every known blocker | Launch sign-off |

## Access matrix and state machines

| Item | Status | Evidence | Remaining |
| --- | --- | --- | --- |
| Access matrix | I | Hidden tests server-only; employer reports org-scoped; candidate runs see provided/own tests only; billing owner/admin | Live verification of each cell |
| Import / attempt / decision machines | I | Rules tested in-process | Enforce in routes |
| Snapshot transfer | I | SQL function + TS mirror | Apply migration 031 |
| Evaluation | I | Run statuses (running → completed / indeterminate / infrastructure_error / not_configured) enforced by an immutability trigger; report review pending → released / changes_requested → reopened | Live |
| Billing | I | Webhook states; usage hold | Live |

## End-to-end journeys

| Gate | Status | What has been observed | What is needed |
| --- | --- | --- | --- |
| E2E-01 | I | Passport journey in-process | Live |
| E2E-02 | I | Assessments need no GitHub | Live |
| E2E-03 | I | Real invite route + correct email copy | Live |
| E2E-04 | I | Pipeline pieces verified separately | Clean-machine desktop run |
| E2E-05 | I | Reference solution → all groups pass through real pytest | Full employer report live |
| E2E-06 | I | Partial variant → only the update group fails | Live, with handoff |
| E2E-07 | I | Two alternative designs pass without reference text matching | Live |
| E2E-08 | I | Traversal paths rejected; tamper, conftest and loop fixtures handled | Hostile archive/Markdown live; isolation live |
| E2E-09 | I | Route checks + in-process matrix | Live two-tenant test |
| E2E-10 | I | Idempotency and recovery in-process | Live |
| E2E-11 | I | Runner outage reported as not about the candidate; usage held | Live provider outages |
| E2E-12 | I | Decisions persist, send nothing, role-gated | Live |
| E2E-13 | I | Passport revoke in-process | Live |
| E2E-14 | I | In-process payment lifecycle | Stripe test mode |
| E2E-15 | B | — | Staging restore drill |
| E2E-16 | I | Demo isolation guard | Live |
| E2E-17 | B | — | Second clean machine |
| E2E-18 | I | Defective → fixed result change observed through the runner; stale label implemented | Through the desktop, live |
| E2E-19 | I | Recovery rules unit-tested | Device test |
| E2E-20 | I | Lost-response recovery in-process | Live |
| E2E-21 | I | Lock + fencing unit-tested | Two windows live |
| E2E-22 | I | Version gate + endpoint | Live update scenario |
| E2E-23 | I | Minimal renderer capabilities; escaping | Hostile link/path fixture in the app |
| E2E-24 | I | Update group "Not observed" when not presented | Desktop warning before early submit |
| E2E-25 | I (rules only) | Report versioning lib | Wire corrections |
| E2E-26 | I (rules only) | Grants in-process | Wire grants |
| E2E-27 | B | — | Accessibility pass with a person |
| E2E-28 | B | — | Uncoached users |

## Quality targets, value measures and milestones

All targets and value measures need real candidates, employers and timing
data; none has been measured. Milestone status: Milestone 0 (audit and
contract) is complete with this tracker; Milestone 1 (desktop-to-employer
loop) has every server and client piece built for the webhook scenario but
has not been observed end to end; Milestones 2–4 remain open.
