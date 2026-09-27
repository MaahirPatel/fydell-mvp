# Handoff: current state for new agent sessions

Read this first, then `docs/release-audit.md` (Milestone 0 audit plus "Milestone 1 progress" at the end), `docs/release-checklist.md` (the paid-release tracker, 161 requirements), and `.cursor/rules/simulation-engine.mdc` (isolation rules that must be followed).

## Latest session (2026-09-27, Milestone 1)

The Milestone 1 engineering loop is built and was run live against staging. Production Supabase `fydell` (`qtrhwrcxthtqvkeerptp`) was not contacted.

The loop: an employer creates and publishes a role and invites a candidate by link. The candidate consents, runs `preflight.py` locally and enters its setup code, starts, and uses the team thread. The server releases one requirement update on its own clock. The candidate saves handoff drafts, uploads a ZIP and submits, getting a receipt with the archive hash. The durable queue runs the hidden tests. A qualified reviewer writes a cited report and releases it. The employer then reads the report and records a decision, which never messages the candidate.

- Migration `028_engineering_assessments.sql` is applied to fydell-dev. It covers 14 `eng_*` tables with forced RLS, append-only and transition triggers, the `eng_release_report` RPC and the private `eng-submissions` bucket. Staging history shows it as two entries (`028_engineering_assessments` and `028_engineering_assessments_hardening`, which pinned `search_path` and revoked anon execute). The repo file contains both, so production applies it once.
- Scenario: `scenarios/backend-webhook-retry/` (reviewed starter, hidden harness, fixtures). `node scripts/build-eng-scenario.mjs` regenerates `src/lib/eng/scenarios/backend-webhook-retry/*.generated.ts`. The starter sha256 is `5a64a07f0511f46a0565e95a6f586d885cb12bafbc55f69bab478d74e1b2f927`, and the ZIP timestamps are timezone-independent.
- Code: `src/lib/eng/**`, `src/components/eng/**`, `src/app/api/eng/**`.
- Pages:
  - `/app/employer/engineering`, including roles and attempts
  - `/app/employer/team`
  - `/assess/invite/[token]`
  - `/assess/[attemptId]`
  - `/admin/engineering`, the blind reviewer queue and editor
- Tests:
  - `npm run test:eng` runs 78 unit checks plus the scenario validator, and is now part of `test:unit`.
  - `npm run test:eng:staging` runs the live loop on fydell-dev: 17 checks covering tenant isolation, a dead-worker lease reclaim, the release gate and decisions. The script refuses any other project. It needs `FYDELL_EVAL_EXECUTOR=local-dev` to cover grading and reports.
  - Cleanup caveat: evidence rows are append-only, so the script's cleanup needs `FYDELL_DEV_DB_URL` pointing at fydell-dev. The current value does not name that ref, so this session cleaned up with the Supabase SQL tool using `session_replication_role = replica`.
- Evaluation executor: runs stay `blocked` with `executor_not_configured` until `FYDELL_EXECUTION_SNAPSHOT_ID` is set. They are never scored. `FYDELL_EVAL_EXECUTOR=local-dev` works only outside production.
- Evaluation work is triggered by `after()` on submit and requeue, by "Process queue now" in `/admin/engineering`, and by `GET/POST /api/eng/worker` (a bearer `CRON_SECRET` or a reviewer session). No Vercel cron was added, because Hobby-plan cron limits were unverified.

## Environments

- Staging database: Supabase `fydell-dev` (ref `btbmvrvynnrhapjdkunz`). Local `.env.local` points here. Migrations through 028 are applied.
- Production database: Supabase `fydell` (ref `qtrhwrcxthtqvkeerptp`). Do not use it for testing. Migrations 026, 027 and 028 are not applied there yet.
- Hosting: Vercel project `fydell-mvp`. Preview environment variables are unverified.
- Secrets live only in `.env.local` (git-ignored) and Vercel settings. Never print or commit them.

## Working

- Marketing site (light theme), `/developers`, `/employers`, `/pricing` with estimator, `/demo`. Design rules in `DESIGN.md`.
- GitHub extractor (`src/lib/passport/github/`, `POST /api/passport/github`): real API reads, commit-pinned, cited findings, role suggestions with gaps. Tests: `npm run test:github`.
- Engineering Passports, share links with revoke, employer passport review.
- Stripe billing in test mode: checkout, customer portal, signed webhook, metered usage per completed simulation (`src/lib/billing/`, `src/app/api/billing/`, migration 027).
- The Milestone 1 engineering loop described above, verified on staging through the service layer and anon-key RLS clients. It has not been run in a browser on a deployed build yet.

## Not working yet (largest gaps)

- Hosted isolated execution: the Vercel Sandbox executor has not been run live, because the snapshot ID is not set.
- There is no scheduler for `/api/eng/worker`. If `after()` is cut short, a run waits until someone triggers the worker.
- Email delivery: Resend is unconfigured, so invitations are shared by copyable link (`email_delivery = not_configured`).
- Invites are not gated on an active billing plan.
- Setup has been timed only on Windows with Python 3.12, not on clean macOS or Linux.
- Retention, deletion and export are manual.

## Founder-owned tasks (agents cannot do these)

1. Create the execution snapshot with `node scripts/create-execution-snapshot.mjs` (needs a Vercel login). Then set `FYDELL_EXECUTION_SNAPSHOT_ID` in Vercel preview and production.
2. Give a qualified reviewer a platform role (`reviewer`, `admin` or `super_admin`) and sign off the scenario review record.
3. Set `CRON_SECRET` in Vercel and choose a scheduler for `/api/eng/worker`: Vercel cron on a paid plan, or an external pinger.
4. Verify Resend DNS and set `RESEND_API_KEY` and `EMAIL_FROM` for real invitation emails.
5. Approve applying migrations 026–028 to production.
6. Time setup on clean macOS and Linux machines.
7. Legal review of the candidate terms shown before start.
8. Run the Milestone 1 deliverable on a deployed build: one real internal candidate attempt, reviewed by a second authorized account, including a refresh mid-attempt and a worker outage.

Also still open: Stripe live activation (account holder must be 18+), AI provider account and retention settings, Vercel plan.

## Working agreements

- One task per session. Commit when done.
- Additive migrations only, numbered from 029 now. Never touch production data as a test.
- No fabricated data, scores, or "all tests passed" claims. Label demo data.
