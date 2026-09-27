# Milestone 0 release audit

Date: 2026-09-27. Base commit inspected: `af5c3dc`. Owner for every row: Maahir. No per-row assignees yet.

This is a code, migration, and local-test audit. It is not a staging or production run. Production Supabase `fydell` (`qtrhwrcxthtqvkeerptp`) was not contacted. Staging `fydell-dev` was not queried. A screen existing is not treated as a working backend.

## How to read status

- **V** — this session ran a check that covers the passing condition, and the code does not contradict it.
- **I** — relevant code or schema exists; the passing condition is not met, or it was not executed.
- **M** — nothing in the repo can satisfy the passing condition.
- **B** — stopped on a founder-owned gate (legal review, live Stripe, operator MFA, a qualified reviewer, provider retention settings).
- **U** — not inspected in a way that supports I/M/B (devices, browsers, or an end-to-end journey that was not run).

Evidence below is repository paths plus local commands run on 2026-09-27. "Not run" means this session did not execute that journey.

## What was actually executed

| Check | Result | Scope |
|---|---|---|
| `npm run test:github` | Passed | Fake GitHub HTTP. Public-only intake, bounds, citations, hostile README, private refusal, rate-limit and empty-repo failures, role suggestion shape. |
| `npm run test:execution` | Passed (7) | `services/code-execution/runner.test.mjs`. Docker flag contract, grading outside the container, infra/runtime/timeout/output_limit vs test failures. No live VM. |
| `npm run test:db-security` | Passed | Static scan of migration SQL for the Wave 1 RLS findings. Not a live role matrix. |

## Stacks that must not be confused

| Stack | Where | What it actually does |
|---|---|---|
| Invited work simulation | `src/app/api/sim/**`, `sim_*` tables in migration 019, `/sim/[sessionId]` | Employer invites a published template. Candidate answers are JSON in `sim_submissions`. Stakeholder thread and one curveball exist for that content. Current invite copy is the Data Analyst micro-sim. |
| Engineering execution | `src/lib/code-execution/`, `services/code-execution/`, sandbox routes | One Python task in the labeled sandbox demo. Vercel Sandbox adapter refuses to run without a snapshot and denies network. Not attached to employer invitations or the canonical report. |
| Engineering Passport | migration 026, `src/lib/passport/**` | Public GitHub read, commit pin, DB passport, share token, revoke, employer review of a shared link. |
| Billing | migration 027, `src/lib/billing/**` | Stripe hosted checkout, signed webhook, meter usage per submitted `sim_sessions` row. Invites do not check the plan. |
| Proof / lab engine | `src/lib/sim-engine/**`, `/sandbox`, `/lab` | Separate from production `/sim/[sessionId]`. Do not fold this into the invited path inside this audit's product code. |

Service-role clients write most product tables. RLS does not protect those server paths. Route checks are the real boundary, and they were not attacked this session.

## Tracker

| ID | Status | Implementation path | Evidence | Blocker |
|---|---|---|---|---|
| BUY-01 | M | No buyer/role decision record. Invited copy names Data Analyst (`src/app/api/sim/invitations/route.ts`). Engineering work is the sandbox Applied AI demo (`docs/engineering-execution-increment.md`). | Code read. Not a signed product decision. | Name one role family and who reviews the report before building Milestone 1 content. |
| BUY-02 | I | Prices in `src/lib/marketing/pricing.ts`. Privacy says retention is manual (`src/app/privacy/page.tsx`). | Prices exist. No candidate-time, turnaround, volume, support, and limits sheet tied to what the product can do. | Write the promise against the one supported scenario, not the pricing page alone. |
| BUY-03 | I | Meter event once per submitted `sim_sessions` row (`src/lib/billing/usage.ts`, migration 027). Statuses billed: `submitted`, `analyzed`, `report_ready`. | Ledger unique on `session_id`. A submit still bills if later analysis crashes. Sandbox execution is not the billed event. | Failed infrastructure after submit can still consume a credit. Invites are not tied to included volume. |
| BUY-04 | M | No hiring-manager comprehension study. | Not run. | Needs a sample engineering report and a reviewer who is not the founder interpreting it. |
| BUY-05 | M | No before/after timing study. | Not run. | Depends on one real employer loop existing. |
| BUY-06 | I | `src/app/terms/page.tsx` says results do not predict job performance and the product does not decide hires. Pricing and the developer page advertise "JSON export". | No passport or candidate export route exists (`PASS-08`). | Remove or implement the export claim before it is treated as part of the product. |
| BUY-07 | M | `hiring_outcomes` / `proof_post_hire_outcomes` tables exist. No repeat-purchase log. | Schema only. | P1. Do not build before a first paid loop. |
| UX-01 | I | Signup role split: `src/app/signup/role/page.tsx`, `src/app/api/auth/role/route.ts`. Employer layout creates a workspace; `fde` accounts go to `/app/candidate`. | Code read. Dual-role leakage not tested. | Confirm one person can hold both roles without seeing the other workspace's data. |
| UX-02 | I | Employer home lists attention, roles, and review work (`src/app/app/employer/page.tsx`). Developer home lists invitations and sessions (`src/app/app/candidate/page.tsx`). Passport is a separate route. | No financial charts on those homes. Developer home does not show projects or passport progress. | Put passport progress on the developer home, or accept that it lives only at `/app/candidate/passport`. |
| UX-03 | I | Roles empty state exists, then renders `AppliedAiDemoModule` instead of a create action. | `src/app/app/employer/roles/page.tsx`. | Empty "create a role" state has no create action. |
| UX-04 | I | Routes exist for login, invites, billing, passport, sandbox. | Not clicked. Sandbox is documented as a demo. | Control audit in the browser; remove or explain anything that cannot succeed. |
| UX-05 | I | Invitation `email_delivery`, session statuses, execution `status` in `src/lib/code-execution/contract.ts`. | Separate stacks. Engineering job states are not on the invited session. | One status model for the invited engineering attempt, surviving refresh. |
| UX-06 | I | Workspace failures return a support reference (`src/app/app/employer/layout.tsx`). Submit errors are short strings. | Code read. Forms were not retried in a browser. | Prove draft preservation on the engineering handoff, which does not exist yet. |
| UX-07 | U | `scripts/audit-accessibility.ts` exists. | Not run. No keyboard or contrast check this session. | Run the accessibility audit on signup, invite, task, and report. |
| UX-08 | U | Prior note in `docs/engineering-execution-increment.md` claims sandbox viewport checks. | Not repeated. No declared support matrix for the paid task. | Declare desktop OS/browser support and check two desktop browsers plus a phone-width report. |
| UX-09 | I | Submit merges answers with revision conflict (`src/app/api/sim/sessions/[id]/submit/route.ts`). Messages dedupe on `clientMsgId`. | JSON submit only. No upload to interrupt. | ZIP and message recovery still unproven under refresh and double-click. |
| UX-10 | M | No permission-aware search across roles, candidates, and projects. | Not found. | P1. |
| AUTH-01 | I | Email/password signup, login, forgot-password, reset, and invalid-link pages. `POST /api/auth/signup`, `POST /api/platform/signup`, and the login error path call `email_confirm: true`. | Verified contact is bypassed in those routes. `SignOutButton` calls Supabase `signOut` only and does not hit `/api/platform/logout`. | Stop auto-confirming email, and make sign-out clear the app session cookies. |
| AUTH-02 | M | GitHub access is a server `GITHUB_TOKEN` for API rate limit (`src/lib/passport/github/client.ts`), not a user OAuth link. | No state/redirect account-link flow. | Do not treat a pasted public URL as account ownership. |
| AUTH-03 | I | `ensureDefaultOrganization` inserts the org and owner membership from the authenticated user (`src/app/app/employer/layout.tsx`). | Server chooses the id. Reload not tested. | Runtime: create workspace, reload, confirm the browser cannot substitute another org id. |
| AUTH-04 | I | Roles `owner`, `admin`, `hiring_manager`, `reviewer`, `viewer` in migration 007. Billing and workspace rename require owner/admin. `can()` in `src/lib/contracts/permissions.ts` is not called by any route. `has_organization_role` is unused. | Any active member can create and revoke candidate invites (`requireOrgMember` only). | Enforce reviewer vs admin on invite, report, and billing. There is no member-management UI. |
| AUTH-05 | I | `POST /api/sim/invitations`, `POST /api/sim/invitations/manage/[id]`. Token, expiry, duplicate active invite, revoke, resend. Email uses Resend only when configured; otherwise `email_delivery=not_configured` and the link is still returned. | Code read. `RESEND_API_KEY` absent per health check shape and handoff. No domain auto-join. | Email delivery is blocked on Resend DNS (founder). Link copy works for an internal attempt. |
| AUTH-06 | M | `organization_members.status` allows `removed` (migration 007). | No removal route that drops API access or existing sessions. | Immediate removal is unimplemented. |
| AUTH-07 | B | `src/lib/ops/mfa.ts` blocks sensitive admin actions only when `ADMIN_MFA_REQUIRED=true`. | Default is off. Transitional admin cookie is not AAL2. | Founder must enroll operator TOTP and turn the flag on before production admin use. |
| AUTH-08 | M | No customer MFA enrollment flow. | Not found. | P1 unless a contract requires it. |
| DATA-01 | I | Overlapping models: migrations 001, 007, 010, 011, 014, 017, 019, 021, 025, 026, 027. | Users, orgs, sim attempts, messages, JSON submissions, reports, decisions, passports, billing rows exist. No ZIP artifact, hidden-test secret, or evaluation-job row for the paid loop. | Pick `sim_*` as the invited system of record and add the missing artifact tables additively from 028. |
| DATA-02 | I | Passport owner policies (026). Sim candidate vs org select policies (019). Employer decision notes on `sim_employer_decisions`. | Service role bypasses RLS. Hidden tests are not a separate secret store. | Runtime access matrix for candidate, employer, stranger, operator. |
| DATA-03 | I | FKs and uniques: `sim_submissions.session_id`, `billing_usage_reports.session_id`, passport `(passport_id, repo_id, commit_sha)`. | Orphans are constrained for those rows. Charge duplication is only the usage ledger. | No unique guard that an invite cannot double-charge, because invites are not billed. |
| DATA-04 | I | Passport `commit_sha` + `analysis_version`. Execution result has `sourceHash`, `suiteVersion`, `environmentVersion`. `sim_analysis_runs.engine_version`. | Not one row linking archive hash, scenario version, rubric version, model, and prompt. | Required when the engineering submission exists. |
| DATA-05 | I | RLS enabled across product tables. `npm run test:db-security` passed for organizations forced RLS, candidate view `security_invoker`, and anon revokes. | Static SQL only. Storage, RPC, cron, and export paths were not probed. | Live cross-tenant denial test before any real candidate data. |
| DATA-06 | M | No `storage.from` usage under `src`. | Artifacts are JSONB columns. | Private bucket and short-lived download checks do not exist. |
| DATA-07 | I | Migrations 001–027 are in `supabase/migrations`. 026 and 027 are additive. | Fresh install and upgrade were not run. Handoff: 027 is on staging, not production. | Do not apply 026/027 to production until a founder approves. Recovery plan is "additive only". |
| DATA-08 | M | No restore drill record. | Not run. | Staging restore of database plus objects, after objects exist. |
| DATA-09 | M | Privacy page states there is no automatic deletion window. | Disclosure only. No deletion job. | Manual deletion is allowed later; the schedule is not defined or enforced. |
| DATA-10 | I | Indexes on sim sessions, passport projects, billing usage, proof tables. | No latency or storage monitor. | P1. |
| GH-01 | V | `extractRepository` refuses `private`. `parseGithubInput` rejects non-GitHub hosts. | `npm run test:github`: private refused; other hosts and credential URLs rejected. | Route `POST /api/passport/github` still allows anonymous callers, throttled in memory. That is SEC-08, not this row. |
| GH-02 | I | Findings store `attribution = unverified` (migration 026). Forks add a notice. | Fork notice covered by `test:github`. No "connect GitHub account" flow. | Account connection is missing, so authorship is never proven. That part is safe. The product does not yet explain it in a verified UI. |
| GH-03 | I | `getCommitSha` then tree-by-SHA (`src/lib/passport/github/extract.ts`). `passport_projects.commit_sha` check is 40 hex chars. | Unit test pins a fake SHA. Database save not executed. | Live reimport against a real public repo was not run. |
| GH-04 | V | `LIMITS` in `src/lib/passport/github/types.ts`. `selectFiles` skips binary, vendored, lockfile, secret names, symlink, submodule, minified, oversize. | `test:github` file cap 80 and skip reasons. No model call in this extractor. Per-request timeout is 10s (`client.ts`); route `maxDuration` is 60. | None for the current non-LLM extractor. |
| GH-05 | I | `GithubError` maps not-found, rate limit, unavailable. Empty repo is `failed`. | Those four cases passed in `test:github`. | Truncated-tree and bounded retry behavior not in the passing test list. |
| GH-06 | V | Extractor fetches file text and runs regex detectors. | `test:github` completes through a fake `fetch` only. No `child_process` in `src/lib/passport/github/`. | None for ordinary extraction. |
| GH-07 | I | Parser rejects other hosts and credential URLs. README text is not a finding. Secret-like paths are skipped in `select.ts`. | `test:github` covers those three. Fetched source is stored and can be sent onward with no content redaction. | Redact likely secrets inside file text before display or model use. |
| GH-08 | I | Finding id includes version, SHA, path, and lines. `citationIsValid` drops bad citations. Excerpts stored on `passport_evidence`. | Citation test passed in memory. Insert path in `src/lib/passport/store.ts` not executed. | Need a saved project whose finding opens the stored excerpt at that commit. |
| GH-09 | I | Coverage object and role `gaps` / `partial` status. | `test:github` reports analyzed vs total files. UI not opened. | Confirm the passport screen cannot read as a complete skill profile. |
| GH-10 | I | Upsert on `(passport_id, repo_id, commit_sha)`, then delete other rows for that repo and replace evidence (`saveProject`). | Reimport deletes prior findings. It does not mark them stale. | Violates the stale-history passing condition. Shared employer reviews can lose the cited rows. |
| GH-11 | I | `DELETE /api/passport/projects` calls `removeProject`. | `PassportBuilder` does not call that delete. There is no GitHub account to disconnect. | Add a remove control, and explain which employer review rows remain. |
| GH-12 | M | Private repositories return `private_repository` and stop. | Test passed. | P1. Keep refused until token encryption and sharing rules exist. |
| PASS-01 | I | `passports`, `passport_projects`, `passport_evidence` (migration 026). `saveProject` / `getOwnerPassport`. | Schema and store read. Not saved from a second device. | Demo fixtures live in `src/lib/marketing/demo-fixture.ts` and must stay off this table. |
| PASS-02 | I | Evidence `basis` is only `repository_observation` or `dependency_declaration`. Contribution text is a separate column. | Check constraint in 026. Demo fixture has four labels; the live passport does not store "model interpretation". | UI must show statement vs observation. Not browser-checked. |
| PASS-03 | V | `suggestRoles` in `src/lib/passport/rules.ts`. Evidence ids and gaps. No percent, seniority, or personality fields. | `test:github`: backend suggestion includes evidence ids and gaps. | UI rendering of that payload was not opened. |
| PASS-04 | I | Empty repo returns `failed`, not a low score. Invites do not require a passport. | Empty-repo test passed. Invite-without-GitHub journey not run. | E2E-02 is still unverified. |
| PASS-05 | I | Passport RLS is owner read. Public page is `/p/[token]` for a share hash. | No public directory route found. Default privacy not proven in a browser. | Preview the exact shared fields before send. Expiry does not exist (see PASS-06). |
| PASS-06 | I | `createShare` / `revokeShare` / `resolveShare`. Allowed fields filtered by `SHAREABLE_FIELDS`. Revoked token returns `revoked`. | `passport_shares` has no expiry column. | Add expiry, and confirm email and employer notes are not in the projection. |
| PASS-07 | M | No in-product explanation that a downloaded copy survives revocation. | Not found. | Copy is missing. |
| PASS-08 | M | No finding-correction flag and no passport export route. | Pricing and `/developers` still say "JSON export". | Do not advertise export until a file can be produced without erasing employer review history. |
| PASS-09 | M | No public simulation-evidence export. | Not found. | P1. |
| EMP-01 | M | Roles page lists `getEmployerCatalog()` templates. Empty state does not create a `hiring_roles` row. | `src/app/app/employer/roles/page.tsx`. | Role create/publish is the first product gap in the employer loop. |
| EMP-02 | I | Role detail route exists: `src/app/app/employer/roles/[roleKey]/page.tsx`. | Not read as a full preview of instructions, effort, rubric, and example report. | Preview before send is unconfirmed. |
| EMP-03 | I | `createInvitation` always stores `template_version_id` (`current_version_id` or an explicit cohort version) in `src/lib/simulations/db.ts`. Migration 019 blocks updates and deletes on `sim_template_versions`. | Pin is in the insert path. Not executed against a database. | The pin only helps a published catalog template. There is still no employer-authored scenario to freeze. |
| EMP-04 | M | No bounded company-context editor with a "must revalidate rubric" rule. | Not found. | Missing. |
| EMP-05 | I | Email format check, duplicate active invite, delivery status, invite URL in the response. | `POST /api/sim/invitations` does not read `organization_billing`. | Resend is unconfigured (founder DNS). Billing does not gate sends. |
| EMP-06 | I | Invitation statuses and `sim_sessions.status` exist (migration 019). | They do not match invited/accepted/setup/in progress/submitted/evaluating/review required/ready/expired/withdrawn as one machine. | Define and enforce that machine server-side. |
| EMP-07 | I | Manage route: revoke, resend with a new token. | No deadline-extension action. | Extension is missing. Resend/revoke not executed against a database. |
| EMP-08 | I | `POST /api/sim/sessions/[id]/decision` inserts `advance` / `hold` / `do_not_advance` / `needs_further_evidence` with `decided_by` and audit row. | No email send in that route. Not executed. | Confirm in a browser that recording a decision does not message the candidate. |
| SCEN-01 | M | No reviewed backend repo with incident brief, logs, public tests, hidden tests, requirement update, and handoff as the invited scenario. | Sandbox Python task is a demo. Invited template is the Data Analyst micro-sim. | This blocks starter, ZIP grading, and the engineering report. |
| SCEN-02 | I | Rubric anchors exist for the Northline micro-sim (`src/lib/simulations/content/micro-ops-yield.ts`). | Not the engineering dimensions. | Write correctness, judgment, requirement response, and communication anchors for the one backend scenario. |
| SCEN-03 | M | No reference, alternative, and defective solutions for a paid scenario. | Runner fixture is one demo task, not a diversity study. | Needs the scenario from SCEN-01. |
| SCEN-04 | M | No candidate starter archive. | Not found. | Depends on SCEN-01. |
| SCEN-05 | M | No supported Windows/macOS/Linux setup record for an engineering task. | Not found. | Depends on SCEN-04. |
| SCEN-06 | I | `preflight_checks` (migration 021) and `POST /api/sim/sessions/[id]/preflight`. | Pilot checklist, not a local runtime/public-test preflight. | Distinguish setup help from solution hints once the starter exists. |
| SCEN-07 | I | Submit stores `external_ai_disclosed` (`sim_submissions`). | Self-report only. No policy text for allowed IDEs and tools on an engineering task. | Write the policy and do not treat disclosure as observed tool use. |
| SCEN-08 | M | No accommodation, break, or extension process. | Not found. | Missing. |
| SCEN-09 | I | `sim_template_versions`. Migration 022 revokes anon reads of answer-key style data. | Not a reviewed immutable engineering version with known issues. | Publish only after SCEN-03. |
| SCEN-10 | M | Extra scenarios are not the invited product. | Sandbox and micro-sims are not additional validated SWE tasks. | P1. |
| SIM-01 | I | `sim_sessions` binds candidate, organization, template. Submit is idempotent per session. | JSON attempt, not an engineering attempt. | Reuse this session row only after the scenario version is pinned. |
| SIM-02 | I | `/sim/[sessionId]` is the invited workbench. Code workspace is `/lab` and `/sandbox`. | Local editor is not the invited hub. | Brief, download, thread, deadline, and ZIP submit need one invited screen. |
| SIM-03 | I | Stakeholder replies are authored (`src/lib/simulations/stakeholder.ts`). | UI disclosure that teammates are simulated was not opened. | Label AI teammates on the invited thread. |
| SIM-04 | I | `selectAuthoredReply` matches `anyKeywords` with `includes()`. Once-only rules skip used ids. LLM redraft falls back to the authored reply and is not given answer keys (`src/lib/simulations/stakeholder.ts`). | Keyword match is the production teammate, not the lab persona runtime. | Ambiguous questions get the fallback sentence, not a consistent clarification policy. |
| SIM-05 | I | Curveball presents once after four minutes, or immediately if the client sends `checkpointSaved: true`. Acknowledgement is an event. | `src/app/api/sim/sessions/[id]/curveball/route.ts`. | Client can skip the wait. Timing must be server-side only. |
| SIM-06 | I | Sent messages dedupe on `clientMsgId`. Sandbox code drafts recover per `docs/engineering-execution-increment.md`. | Written fields on the invited sim are not all covered. | Draft recovery for the engineering handoff is missing. |
| SIM-07 | I | Deterministic reply map is the default; AI redraft is optional. | No pause/extend policy when the model is down. | Outage must not lower the candidate's result. |
| SIM-08 | I | Stored events are messages, submissions, and platform actions. | No local-editor telemetry in the invited API. | Do not describe sandbox editor events as invited-attempt evidence. |
| SIM-09 | I | Micro deliverable questions and oral defense tables (migration 021). | Not a "what changed / tests / risks / next steps" handoff on a repo. | Depends on the engineering scenario. |
| SIM-10 | M | No CLI or editor extension. | Not found. | P1. Not required for Milestone 1. |
| UP-01 | M | No ZIP packaging spec in the product. | Not found. | Write limits before accepting archives. |
| UP-02 | M | No upload route. JSON submit checks `getSessionForCandidate` before writing. | ID swap is rejected for JSON. There is no archive to swap. | Upload must be added on the server, bound to the session. |
| UP-03 | M | No upload progress or interrupted-upload state. | Not found. | Depends on UP-02. |
| UP-04 | M | No ZIP parse: format, sizes, entry count, path traversal, symlinks, nested archives. | Not found. | Required before any candidate archive is stored. |
| UP-05 | I | `sim_submissions` update/delete trigger raises `submission snapshots are immutable` (migration 019). | JSON snapshot only. No archive hash. | Immutable bytes come after UP-02. |
| UP-06 | I | Submit response includes `submissionId` and `alreadySubmitted`. | No content hash. | Receipt must name the archive hash once uploads exist. |
| UP-07 | I | `executeOnVercel` creates a snapshot VM with `networkPolicy: 'deny-all'`, empty env, and deletes it (`src/lib/code-execution/vercel.ts`). | That path is the sandbox demo, not an upload parser. | Archive inspection must not run on the app host. |
| UP-08 | M | No wrong-archive error. Runner statuses are separate (RUN-06). | Not found. | Depends on UP-04. |
| RUN-01 | I | Vercel adapter: snapshot, no app env, deny-all network, candidate user, stop/delete. Docker helper refuses `python:latest` and sets gVisor flags. | `test:execution` passed the Docker flag contract. Live Sandbox was not started this session. | Not wired to an invited submission. |
| RUN-02 | I | CPU, address-space, process, file-size, and output caps in `vercel.ts`. Docker test checks `--network=none` and memory/pids limits. | Contract test only. | No abandoned-job kill test against a real cohort. |
| RUN-03 | I | `FYDELL_EXECUTION_SNAPSHOT_ID` required. Image must be digest-pinned in the Docker helper. | `test:execution` rejects `python:latest`. | Snapshot id is an environment setting, not verified in Preview. |
| RUN-04 | I | `grade()` runs outside the container. Test asserts expected answers are not in the candidate payload and forged `{"passed":true}` is rejected. | `services/code-execution/runner.test.mjs`. | This harness is the demo task, not hidden tests for an invited repo. |
| RUN-05 | I | Same runner. Tampered pass JSON throws. | Test passed. | Re-run against a known-failing fixture on the invited path after it exists. |
| RUN-06 | I | Statuses: `completed`, `infrastructure_error`, `runtime_error`, `timeout`, `output_limit`. Infra statuses do not become failed-test evidence. | Four status tests passed. | No `setup_incompatibility` status. Results are not on the employer report. |
| RUN-07 | M | Execution is synchronous. `durable_jobs` (migration 014) is not the code-execution queue. | No idempotent run id for a restarted worker. | Queue, stale worker, and exhausted retry are missing. |
| RUN-08 | I | Output capped at 64KiB. `finally` stops and deletes the sandbox. | No cross-candidate file carryover test. | Persist the graded result before cleanup on the invited path. |
| RUN-09 | M | No parallel-cohort or resource-exhaustion run. | Not run. | Required before a paid cohort. |
| AI-01 | I | Micro-sim scoring is deterministic (`src/lib/simulations/v2`). Python tests are graded in the runner, not by an LLM. | Two stacks. An LLM report cannot currently mark those runner tests passed. | Keep that split when the engineering report is added. |
| AI-02 | I | Sim-engine analysis reads attempt artifacts (`src/lib/sim-engine/analysis/`). | No starter-vs-submission diff for a ZIP. | Blocked on the archive. |
| AI-03 | I | Competency bands include `insufficient` (migration 019). | Anchors are for existing sims, not the new backend task. | Write anchors with the scenario. |
| AI-04 | I | GitHub citations are validated. `sim_evidence_items` stores excerpts. | No gate that rejects a report with a bad line reference. | Add that gate before a model writes employer findings. |
| AI-05 | I | README instructions do not become GitHub findings (`test:github`). | Reviewer model tool list was not audited because that reviewer is not on the invited engineering path. | When added, it gets no billing, messaging, or permission tools. |
| AI-06 | I | `executionResultSchema.parse` on the execution client. | No general model-output schema that routes invalid reports to human review. | Required before AI findings are shown as complete. |
| AI-07 | M | No reproduction step for a defect claim. | Not found. | Missing. |
| AI-08 | I | Micro rubric scores clarification from authored message rules. | No personality or accent score found in that content. | Not a substitute for an engineering communication rubric. |
| AI-09 | I | Northline evaluator looks at whether the artifact changed after the curveball. | Lab engine, not the invited report. | Do not import lab conclusions into employer reports. |
| AI-10 | I | `sim_analysis_runs.engine_version`. Passport `analysis_version`. | No versioned reviewer-edit history. | Store overrides when a human changes a finding. |
| AI-11 | M | No pre-labeled 20-submission set. | Not found. | Required before trusting automatic judgments. Milestone 3, not 1. |
| AI-12 | B | `proof_claim_reviews` can store a review. Nothing stops an employer from seeing an unreviewed engineering report, because that report does not exist. | Founder-owned qualified reviewer (`docs/HANDOFF.md`). | Milestone 1 must use a human check before the employer sees qualitative findings. |
| AI-13 | B | Privacy page says identifiable work is not used to train a model. | No provider setting is checked in code. | Founder must confirm retention/training settings before sending candidate source to a model. |
| AI-14 | M | No measured reviewer-agreement loop. | Not found. | P1. |
| REP-01 | I | Micro-sim reports and proof decision briefs exist in schema. | Not a short engineering brief. Not shown to a hiring manager. | Depends on a human-checked engineering report. |
| REP-02 | M | No employer finding that opens the submitted file, diff, test, or message for a repo attempt. | Passport source URLs are a different product. | Build with the report. |
| REP-03 | I | Sandbox evidence view is documented to separate code results from synthetic metrics. | `docs/engineering-execution-increment.md`. Not reopened this session. | Invited report must not show one hireability number. |
| REP-04 | I | Session id is the report key. Analysis run can be `failed`. | Incomplete vs ready is not one employer-facing rule for engineering. | Version the report when a reviewer corrects it. |
| REP-05 | I | Decision `notes`. Passport review `private_note`. | No "flag this finding" action. | Notes exist; correction requests do not. |
| REP-06 | I | `getSessionForOrgMember` on the decision route. Passport share projection hides non-selected fields. | Not attacked with a second org. | Cross-tenant test is SEC-06. |
| REP-07 | I | `/p/[token]`, receipt share tables (migration 021), `/receipts/[publicId]`. | Not executed. Sensitivity labels on exports not found. | A link is enough at first; it must check auth. |
| REP-08 | M | Outcome tables exist. No product that records interviews without calling them validation. | Schema only. | P1. |
| DEMO-01 | I | `src/lib/marketing/demo-fixture.ts` and `/demo`. | Fixture read. Page not clicked through. | Browser pass of import, passport, task, thread, submission, report, decision. |
| DEMO-02 | I | Fixture includes cited lines, evidence bases, tests, and a thread. | Source only. | Click each evidence type. |
| DEMO-03 | I | `DEMO_LABEL = "Example data"`, name `Candidate 01`. | Constant read. Rendered label not screenshotted this session. | Confirm the visible label on `/demo`. |
| DEMO-04 | I | `/demo` renders marketing `EvidenceWorkspace`. The signed-in passport uses `PassportView` / `SharePanel`. | They are different components. | Demo and product do not share the passport or report UI. |
| DEMO-05 | I | Fixture is static TypeScript. `POST /api/sandbox/reset` exists. Health fails if `ALLOW_DEMO_DATA=true` in production. | No live demo session was started. | Prove demo actions do not email, charge, or write a real passport. |
| DEMO-06 | I | `planSignupHref` goes to signup with a plan query. It does not copy fixture rows. | Code read. Not clicked. | Signup after demo must not create passport evidence. |
| DEMO-07 | I | Sandbox workbench can show a task. Starter ZIP for visitors was not found. | Engineering doc: interactive execution is the sandbox, not the invited product. | Only advertise what the demo actually does. |
| DEMO-08 | I | Sandbox can call the execution adapter when the snapshot env is set. | Abuse and cost limits for a public sample run are not proven. | P1. Keep it off the public demo until RUN-09. |
| BILL-01 | I | Hosted Checkout for `starter` or `team` (`src/app/api/billing/checkout/route.ts`). Prices from server config. | Terms page says standard terms are not published. | Legal terms block a paid contract even though Checkout exists. |
| BILL-02 | I | Card entry is Stripe Checkout or the customer portal. No PAN field in app code. | Route read. | Keep customer ids server-side. Already true in the route. |
| BILL-03 | I | Webhook uses `stripe.webhooks.constructEvent` (`src/app/api/billing/webhook/route.ts`). Checkout success URL does not write `organization_billing`. | Signature path read. No signed fixture posted this session. | Replay a test-mode event against staging before calling fulfillment verified. |
| BILL-04 | I | Usage insert is unique on `session_id` and `meter_identifier`. Subscription sync overwrites by customer id. | No Stripe `event.id` ledger. | Out-of-order subscription events can last-write-wins. Usage itself is idempotent if the insert succeeds. |
| BILL-05 | I | Plan key is validated. Line items come from `checkoutLineItems`. Org id comes from membership. | Client cannot set the price. | Confirm the webhook maps the customer back to that org only. `syncSubscription` looks up `stripe_customer_id`. |
| BILL-06 | I | `billing_usage_reports` (migration 027). `BILLABLE_STATUSES` comment says invites are allowed when active. | `POST /api/sim/invitations` never reads billing. | Invite gate is missing. Platform failure after submit can still be reported. |
| BILL-07 | M | No success, failure, cancel, delay, replay, or refund test in the repo. | Not run. Stripe test mode is claimed in the handoff, not re-run here. | Run the lifecycle in test mode. Do not use live charges. |
| BILL-08 | I | `POST /api/billing/portal` for owner/admin. | Portal is Stripe's receipt surface. Not opened. | Buyer support path is the contact email, not an in-app billing case. |
| BILL-09 | I | Employer settings plan section and portal return URL. | Self-serve exists in code. Cancellation was not clicked. | P1 relative to manual invoicing, but the UI already offers plans. Do not advertise a control that 503s when Stripe env is missing. |
| SEC-01 | M | No data-flow map of auth, hosting, storage, email, model, and execution providers. | Privacy page is a summary, not a recipient list. | Write it before candidate source goes to a model or VM. |
| SEC-02 | B | `src/app/privacy/page.tsx` describes practice and says a full policy will replace it. | Honest, not counsel-reviewed. | Founder legal review. |
| SEC-03 | B | `src/app/terms/page.tsx` says standard terms are unpublished and a pilot agreement governs. | Deliberately not invented. | Founder legal review before self-serve paid use. |
| SEC-04 | I | No screen-recording or local-file collector found in the invited API. | GitHub intake is public source the user names. | Keep it that way. Do not add editor telemetry without a disclosure. |
| SEC-05 | I | `src/lib/supabase/project-guard.ts`. Billing and execution use server env. Webhook secret required. | Git history and frontend bundles were not scanned for secrets. | Secret scan before production. |
| SEC-06 | I | Org membership checks on invite, decision, and billing. RLS on member select. | `test:db-security` is static. No two-employer request was sent. | This is a Milestone 1 gate: org A must fail against org B on API and rows. |
| SEC-07 | I | GitHub parser rejects foreign hosts. React text for many pages. | Markdown rendering and CSRF were not reviewed end to end. | Review invite and report HTML before wider use. |
| SEC-08 | I | GitHub route: in-memory 12/min authenticated, 6/min anonymous, per server instance. | Invites, uploads, and sandbox runs have no shared quota in the files read. | Rate limits are not durable. Anonymous GitHub analysis is open. |
| SEC-09 | I | Privacy page: email `CONTACT_EMAIL` for access, correction, deletion. Manual. | No runbook tracing tables, Stripe, Resend, and Vercel. | Manual is allowed only if someone can actually fulfill it. |
| SEC-10 | I | `resolveShare` returns revoked and does not project the passport. | No in-flight job re-checks a disconnected GitHub account, because there is no user token. | When jobs exist, check permission before publishing. |
| SEC-11 | I | Handoff splits `fydell-dev` and `fydell`. Health route errors if demo data is allowed in production. | Preview env vars unverified. This session did not print or open `.env.local`. | Keep production migrations and live keys off agent sessions. |
| SEC-12 | M | No incident responder, rotation, or customer notice plan in `docs/`. | Not found. | Write the one-page plan before paid launch. |
| SEC-13 | M | No SSO/SCIM. | Not found. | P1 until a contract requires it. |
| OPS-01 | I | `GET /api/health` checks database, email backlog, pilot schema, heartbeats. | No pager or alert destination. | Alerts for stalled evaluation do not exist because that job does not exist. |
| OPS-02 | I | Contact email. Workspace failure reference `WS-CFG` / `WS-REF`. | No operator view keyed by engineering attempt id. | Support channel is an email, not a diagnosed attempt. |
| OPS-03 | I | `POST /api/admin/repair` can reconnect a user, and it can extend, revoke, or cancel rows in `candidate_invitations` and `pilot_simulation_sessions`. | Those are the older pilot tables, not `sim_invitations` / `sim_sessions`. No quarantine or usage credit. | Operator tools do not recover the live invited session. |
| OPS-04 | I | Health route. Sim-engine flag is separate from production sim routes. | Staging has migrations through 027; production does not (handoff). Rollback of an invited attempt is unproven. | Founder approval before any production migration. |
| OPS-05 | M | No p50/p95 or turnaround target document. | Not found. | Set a target only after one timed internal attempt. |
| OPS-06 | M | No measured model, compute, storage, email, or review minutes per attempt. | Not found. | Price in `pricing.ts` is not a cost proof. |
| OPS-07 | M | No rehearsed worker restart or delayed-webhook recovery. | JSON submit idempotency is not that rehearsal. | Milestone 1 deliverable requires this. |
| OPS-08 | M | Known open gaps: no engineering ZIP, no cross-tenant proof, invites without a plan check, email not configured. | This audit. | Launch stop conditions are still open. |

## End-to-end gates

These IDs are journeys, not feature rows. None were executed against staging.

| ID | Status | Why |
|---|---|---|
| E2E-01 | U | Passport save code exists. Fresh user import, sign-out, and sign-in were not run. |
| E2E-02 | U | Invites do not require GitHub. The journey was not run. |
| E2E-03 | M | Employer cannot create a role. |
| E2E-04 | M | No starter setup and no ZIP upload. |
| E2E-05 | M | No known-good engineering submission path. |
| E2E-06 | M | No partial engineering fixture. |
| E2E-07 | M | No alternative-solution fixture. |
| E2E-08 | M | No hostile ZIP or resource-exhaustion run. |
| E2E-09 | U | Isolation code exists. Two-org access attempt was not sent. |
| E2E-10 | U | JSON idempotency exists. Refresh, expired session, and worker restart were not run. |
| E2E-11 | U | GitHub rate-limit mapping exists. Provider outage was not induced. |
| E2E-12 | U | Decision insert does not send mail in source. The review journey was not run. |
| E2E-13 | U | Share revoke is implemented in `store.ts`. Revoke-then-retry was not run. |
| E2E-14 | U | Webhook verification exists. Stripe replay and refund were not run. |
| E2E-15 | M | No export fulfillment and no restore drill. |
| E2E-16 | U | Demo fixture is labeled in source. Anonymous demo then signup was not run. |

## Counts

Tracker rows: 161. Journeys: 16.

| Status | Tracker rows |
|---|---|
| V | 4 (GH-01, GH-04, GH-06, PASS-03) |
| I | 106 |
| M | 44 |
| B | 5 (AUTH-07, AI-12, AI-13, SEC-02, SEC-03) |
| U | 2 (UX-07, UX-08) |

V means a local test covered that row's extractor or suggestion behavior. It does not mean the paid workflow is live.

## Milestone 1 blockers, in dependency order

Milestone 1 is one employer-to-report loop: tenant boundary, role and invite, reviewed starter, local setup, team thread, one controlled issue update, ZIP receipt, isolated trusted tests, human-checked report, employer decision, plus refresh and outage recovery.

1. **SCEN-01.** There is no reviewed backend scenario. The invited product is a Data Analyst micro-sim. The Python runner is a sandbox demo. Role, starter, tests, and report have nothing real to pin until this exists.
2. **EMP-01.** An employer cannot create or publish a role. Catalog invites do pin `template_version_id`, and those version rows reject updates, but there is no new scenario to freeze.
3. **AUTH-04 and SEC-06.** Membership roles exist in the database, but reviewers are not a distinct capability and member removal does not exist. Service-role routes are the access boundary, and no cross-tenant request was tried. Do this before real candidate data.
4. **EMP-05, limited to an internal attempt.** Token, expiry, revoke, and a copyable link exist. Email is blocked on Resend (founder). Invites are not gated on a paid plan. An internal Milestone 1 attempt can use the link; do not treat that as paid delivery.
5. **SCEN-04, SCEN-05, SCEN-06.** No starter archive, no supported-machine notes, and preflight is a pilot checklist rather than a local public-test check.
6. **SIM-02, SIM-04, SIM-05.** The invited workbench is not the local engineering hub. Stakeholder replies are authored for the micro-sim. The curveball can be forced early with `checkpointSaved: true`.
7. **UP-01 through UP-07.** There is no ZIP upload, no archive validation, no private object storage, and no hash of original bytes. `sim_submissions` immutability covers JSON only.
8. **RUN-01, RUN-04, RUN-06, RUN-07.** The sandbox VM and the external grader are real, and the runner tests passed, but they grade one demo Python string. They are not a durable job on an invited archive, and setup failure is not a separate outcome.
9. **AI-12, REP-01, EMP-08.** Decision rows can be stored without emailing the candidate. There is no human-checked engineering report. A qualified reviewer is founder-owned. Do not automate qualitative grades to skip that person.
10. **OPS-07.** Milestone 1's deliverable includes refresh and outage recovery. Execution is synchronous, there is no evaluation queue, and no worker-restart rehearsal has been recorded.
