# Handoff: current state for new agent sessions

Read this first, then `docs/release-audit.md` (Milestone 0 audit plus "Milestone 1 progress" at the end), `docs/release-checklist.md` (the paid-release tracker, 161 requirements), and `.cursor/rules/simulation-engine.mdc` (isolation rules that must be followed).

## Latest session (2026-09-27, evening: candidate workflow corrections)

The agreed workflow, which the code now follows: the browser holds the brief, setup, simulated team, requirement update, submission and handoff. The candidate works locally in their own editor (VS Code, Cursor, PyCharm) and uploads a project ZIP. There is no browser editor, desktop app, extension or GitHub step in Milestone 1. Fydell stores the ZIP with its hash, runs the hidden tests in the isolated Vercel Sandbox, and the employer's team writes a cited report, releases it and records Advance, Hold or Decline. Nothing is claimed about local activity Fydell cannot see.

What changed:
- Candidate pages rebuilt in `src/components/eng/`:
  - `AssessmentSetup.tsx`: consent, then setup, then start.
  - `AssessmentWorkspace.tsx`: a header with the countdown, and a left nav with Brief, Team, Updates and Submit, kept in the URL hash.
  - `AssessmentHub.tsx`: orchestration and the receipt stepper.
  - Shared pieces: `CandidateParts.tsx`, `CommandBlock.tsx`, `LocalTime.tsx`, `useDrafts.ts`.
  - Widths: 860px for the invitation and setup steps, 1160px while working.
- Setup copy says "Run the setup check locally, then paste its result here". The whole printed line or just the code both work (`verifySetupCode` extracts the code).
- Internal validation notes are out of candidate copy. Supported setups say what was confirmed (Windows 11 with Python 3.12) and what is not yet confirmed (macOS and Linux).
- The brief no longer reveals the Retry-After change; it says only that one update arrives partway through.
- Early submission: if the candidate submits before the update is due, the server posts the update once, refuses that submit with a 409 and an explanation, and records the release with `reason: "early_submission"`. The employer timeline shows it. See `releaseUpdateBeforeSubmission` in `src/lib/eng/attempts.ts`.
- Handoff: three questions (What changed? What did you test? What remains unresolved?) plus an optional AI statement.
- Labels: "Review required" and "Report ready" for the employer. The candidate home shows Invited, Accepted, Ready to start, In progress, Submitted, Expired and Withdrawn.
- Scenario v1 keeps its starter and harness hashes. Only the in-code copy changed, before any external candidate used it. The stored `content` snapshot in `eng_scenario_versions` still holds the older wording; runtime reads the code definition.

Verified:
- `tsc` and eslint are clean. `npm run test:eng` passes 90 of 90, plus scenario validation.
- `test:eng:staging` with `FYDELL_EVAL_EXECUTOR=local-dev` passes 17 of 17, including the early-update check. The reference solution passed 15 of 15.
- Browser pass on `next dev` against fydell-dev with a disposable candidate at each stage:
  - Invitation, accept, consent and setup (whole-line paste), start.
  - Brief, Team (message and reply), Updates (Mark as read clears "New"), Submit, receipt with hash, candidate home, employer attempt timeline.
  - Checked at 1440×900, 1280×800 and 390px mobile, with no horizontal overflow.
  - Staging rows were deleted afterwards. One uploaded test ZIP per fixture may remain in the private `eng-submissions` bucket on fydell-dev.

Not yet verified: the founder's live production attempt through to a released report and decision; a real invitation email sent through Resend; setup on clean macOS or Linux; a timing trial of the 50-minute estimate. EMP-02 (an example report shown to employers before inviting) is not built.

## Earlier session (2026-09-27, Milestone 1: the employer reviews)

Product decision from the founder: there is no separate Fydell reviewer. The paying employer's team reads the evidence, writes the cited report and releases it. The same person can invite, review and decide. Fydell staff can still write reports from `/admin/engineering` if a workspace asks for help, but nothing depends on it.

What changed:
- Permissions (`src/lib/eng/permissions.ts`): new `write_reports` and `retry_evaluation` for owner, admin, hiring_manager and reviewer. Viewers still cannot read evidence.
- New workspace routes:
  - `PUT/POST /api/eng/org/attempts/[attemptId]/report` saves a draft or releases. The release gate is unchanged: every finding must cite real file lines, tests, messages or handoff fields.
  - `POST /api/eng/org/attempts/[attemptId]/requeue` retries delayed tests, with a reason.
- The employer attempt page (`/app/employer/engineering/attempts/[attemptId]`) shows the evidence and the report editor once the tests finish. It also shows a "Tests delayed" panel with a retry button, and a "Correct this report" section after release. Shared UI is in `src/components/eng/ReviewWorkspace.tsx`, and `ReportEditor` and `ReviewerEvidence` take an `apiBase`.
- No cron is needed anymore. `scheduleIfRunnable` (`src/lib/eng/route-helpers.ts`) restarts pending, retry-due or lease-expired runs with `after()` whenever the candidate's attempt poll or the employer's attempt page loads a submitted attempt. `/api/eng/worker` still exists for manual or external triggering.
- Copy: the candidate page, employer pages, the scenario's known issues and the state labels no longer promise a Fydell reviewer. `review_required` now reads "Ready for your review".
- Staging's stored `eng_scenario_versions` row keeps the old known-issues sentence in its `content` snapshot. Candidates see the text from code, and the hashes are unchanged.

Verified this session:
- `tsc`, eslint and `next build` pass. `npm run test:eng` passes.
- `npm run test:eng:staging` passes 17/17. The hidden tests ran in the Vercel Sandbox snapshot (15/15 on the reference solution), and the report was written and released by the employer's own owner account. The script also checks that viewers cannot write reports. Staging was cleaned by SQL afterwards (0 leftover orgs, users, attempts, reports or storage objects).

Later the same day:
- A Preview was deployed at `https://fydell-j532mhlk6-maahirpatels-projects.vercel.app`, using fydell-dev. The fydell-dev Auth redirect URLs now allow `https://*-fydell-mvp.vercel.app/**` and `http://localhost:3000/**`. `https://fydell-*-maahirpatels-projects.vercel.app/**` still needs to be added, and matters only for password-reset links.
- Fixed a crash on every `/app/employer/**` page: `EmployerShell` had no icons for three nav items. `WorkspaceNavLabel` now makes a missing icon a type error.
- Sign-up (`/api/auth/signup`) now creates accounts already confirmed through the admin API, so no confirmation email is sent. The old `signUp()` call hit Supabase's built-in email rate limit.
- The founder then approved going live on fydell.com. Production Supabase `fydell` (`qtrhwrcxthtqvkeerptp`) was behind at 024, so 025 (`proof_graph`), 026, 027 and 028 were applied through the Supabase MCP, all additive. Afterwards, the 14 `eng_*` tables had forced RLS, the proof, passport and billing tables had RLS, the `eng-submissions` bucket was private, and the security advisor showed no findings on the new objects. `FYDELL_EXECUTION_SNAPSHOT_ID` was added to Vercel Production. `vercel deploy --prod` is aliased to `https://www.fydell.com`, and the apex redirects there. Production has `RESEND_API_KEY`, so invitations there send real email.
- Also fixed: post-login routing no longer depends on `NEXT_PUBLIC_FDE_MARKETPLACE`, which was unset on Vercel and sent candidates to "Setup required". The setup page uses `AuthShell`. The candidate home lists engineering tasks, and the employer home's first action opens Engineering tasks.
- Founder still to do: add `https://www.fydell.com/**` and `https://fydell.com/**` to the production Supabase Auth redirect URLs. Only password-reset links need them.

## Milestone 1 loop

An employer creates and publishes a role and invites a candidate by link. The candidate consents, runs `preflight.py` locally, enters its setup code, starts, and uses the team thread. The server releases one requirement update on its own clock. The candidate saves handoff drafts, uploads a ZIP and submits, and gets a receipt with the archive hash. The durable queue runs the hidden tests. The employer's team reviews the evidence, releases a cited report and records a decision, which never messages the candidate.

- Migration `028_engineering_assessments.sql` is applied to fydell-dev. It covers 14 `eng_*` tables with forced RLS, append-only and transition triggers, the `eng_release_report` RPC and the private `eng-submissions` bucket. Staging history shows it as two entries (`028_engineering_assessments` and `028_engineering_assessments_hardening`). The repo file contains both, so production applies it once.
- Scenario: `scenarios/backend-webhook-retry/`. `node scripts/build-eng-scenario.mjs` regenerates `src/lib/eng/scenarios/backend-webhook-retry/*.generated.ts`. The starter sha256 is `5a64a07f0511f46a0565e95a6f586d885cb12bafbc55f69bab478d74e1b2f927`.
- Code: `src/lib/eng/**`, `src/components/eng/**`, `src/app/api/eng/**`.
- Pages:
  - `/app/employer/engineering`, including roles, attempts and review
  - `/app/employer/team`
  - `/assess/invite/[token]`
  - `/assess/[attemptId]`
  - `/admin/engineering`, the optional staff queue
- Tests:
  - `npm run test:eng` runs the unit checks plus the scenario validator. It is part of `test:unit`.
  - `npm run test:eng:staging` runs the live loop on fydell-dev (17 checks) and refuses any other project. Set `FYDELL_EVAL_EXECUTOR=local-dev` or `ENG_STAGING_HOSTED=1` to cover grading and reports.
  - Cleanup: evidence rows are append-only, and `FYDELL_DEV_DB_URL` does not name the fydell-dev ref. Clean up with the Supabase SQL tool under `session_replication_role = replica`; the script prints the org ids.
- Evaluation executor: without `FYDELL_EXECUTION_SNAPSHOT_ID`, runs stay `blocked` with `executor_not_configured` and are never scored. `FYDELL_EVAL_EXECUTOR=local-dev` works only outside production.

## Environments

- Staging database: Supabase `fydell-dev` (ref `btbmvrvynnrhapjdkunz`). Local `.env.local` points here. Migrations through 029 are applied. There are no platform roles, and none are needed.
- Production database: Supabase `fydell` (ref `qtrhwrcxthtqvkeerptp`). Do not use it for automated tests. Migrations through 029 are applied (2026-09-27), with 025–029 applied under their file names. Production's `profiles` predates 001 and differs from the repo schema. 029 adds the missing `company_name` column. Check column drift before writing new profile fields. The next migration is 030.
- Hosting: Vercel project `fydell-mvp`. The Preview variables point at fydell-dev (verified): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (Sensitive). `NEXT_PUBLIC_APP_URL` was removed from Preview, so links use `VERCEL_URL`. `FYDELL_EXECUTION_SNAPSHOT_ID` is set in Preview and Development. Production variables were not touched.
- Secrets live only in `.env.local` (git-ignored) and Vercel settings. Never print or commit them.

## Working

- Marketing site (light theme), `/developers`, `/employers`, `/pricing` with estimator, `/demo`. Design rules in `DESIGN.md`.
- GitHub extractor (`src/lib/passport/github/`, `POST /api/passport/github`), with tests in `npm run test:github`.
- Engineering Passports, share links with revoke, employer passport review.
- Stripe billing in test mode: checkout, portal, signed webhook, metered usage (`src/lib/billing/`, `src/app/api/billing/`, migration 027).
- The Milestone 1 engineering loop, verified on staging through the service layer and anon-key RLS clients, and the candidate screens checked in a browser against staging. A live production attempt by the founder is in progress; Milestone 1 is not complete until it reaches a released report and a recorded decision.

## Not working yet (largest gaps)

- No hosted execution has yet been triggered from a deployed function on a real attempt.
- Email delivery: production has the verified `fydell.com` domain and `EMAIL_FROM_TRANSACTIONAL`, but a successful real send has not been confirmed yet. Staging has no Resend key, so invitations there are shared by copyable link (`email_delivery = not_configured`).
- No example report for employers before they invite (EMP-02).
- Invites are not gated on an active billing plan.
- Setup has been timed only on Windows with Python 3.12, not on clean macOS or Linux.
- Retention, deletion and export are manual.

## Founder-owned tasks (agents cannot do these)

1. Done: the execution snapshot is set in Vercel Preview and Development. Add it to Production only when migration 028 goes to production.
2. Removed: a Fydell reviewer is no longer needed, because the employer reviews.
3. Supabase Auth, fydell-dev: allow the Preview domains in the redirect URLs (for example `https://*-fydell-mvp.vercel.app/**`) so that sign-in works on a Preview deploy.
4. Verify Resend DNS and set `RESEND_API_KEY` and `EMAIL_FROM` for real invitation emails.
5. Approve applying migrations 026–028 to production.
6. Time setup on clean macOS and Linux machines.
7. Legal review of the candidate terms shown before start.
8. Run the Milestone 1 deliverable on a deployed Preview with two accounts. An employer account invites, reviews, releases and decides. A candidate account takes the task, refreshing mid-attempt. For the outage, click "Retry" in the "Tests delayed" panel after a delayed run.

Also still open: Stripe live activation (account holder must be 18+), AI provider account and retention settings, Vercel plan.

## Working agreements

- One task per session. Commit when done.
- Additive migrations only, numbered from 029 now. Never touch production data as a test.
- No fabricated data, scores, or "all tests passed" claims. Label demo data.
