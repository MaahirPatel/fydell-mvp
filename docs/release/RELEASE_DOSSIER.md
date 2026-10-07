# Fydell release dossier

Status as of 2026-10-07. This is the short version for whoever ships, supports
or reviews the release. It is not a claim that Fydell is production ready:
payments, hosted test execution, private-repository import and signed desktop
builds are still unverified (see "Known limits").

## What a person can do today

### Engineers

| Path | Route | Notes |
| --- | --- | --- |
| Sign up and start | `/signup` → `/onboarding/engineer` | Two-column signup; the name entered becomes the display name. Onboarding offers GitHub, ZIP upload or "describe a project", and short-circuits to a pending invitation. |
| Import public GitHub work | `/app/candidate/work-record` | Preview, selection, durable import, analysis and Builder Report. |
| Import a ZIP | same | Preview with exclusions and archive safety checks, then the same analysis pipeline. |
| Builder Profile | `/app/candidate/profile` | Edit name, headline, photo, links, "How I build", project presentations with images. Share link, revoke, export, recipient preview. |
| Apply to a role | `/roles/[slug]` | Pick evidence, receipt, withdraw and re-apply. |
| Answer follow-up questions | `/app/candidate/applications` | Reviewer questions and candidate answers are threaded and attributed. |
| Engineering task (web) | `/assess/...` | Consent, starter download, setup code, team chat, drafts, upload, submit, released report. |
| Engineering task (desktop) | Fydell desktop 0.1.6 | Same server routes as the web task, bearer-token auth. |
| Simulation | `/sim/[sessionId]` | Live coworker chat through Groq when `MODEL_PROVIDER=groq`. |

### Hiring teams

| Path | Route | Notes |
| --- | --- | --- |
| Sign up and set up | `/signup?as=employer` → `/onboarding/employer` | Workspace, first role, first invite. |
| Roles and applicants | `/app/employer/...` | Publish/pause/close roles, applicant workspace, requirement-to-evidence review, follow-up requests, decisions. |
| Engineering tasks | `/app/employer/...` | Create role, invite, review submission, notes, flags, release report, decision. |

### Operators

| Path | Route | Notes |
| --- | --- | --- |
| Stuck work | `/admin/operations` | Lists stuck evaluation runs, uploads, imports, waiting reports and old candidate responses; audited retry/cancel. Procedure: `docs/operations/runbook.md`. |

### Public site

`/`, `/products` and six product pages, `/developers`, `/employers`,
`/pricing` (Free; Pro shown as a labelled preview with a waitlist; Hiring
pilot; Contact), `/download` (only real builds are offered), `/changelog`.

## Migration procedure

Migrations live in `supabase/migrations/` and are additive only; 001–025 are
immutable. Procedure: `docs/migration-runbook.md`.

1. Apply to fydell-dev (`btbmvrvynnrhapjdkunz`) and run the live suites below.
2. Apply to production in file order through the Supabase MCP or SQL editor,
   with explicit authorization. Never reset or rewrite data.
3. Verify the new tables, columns and policies exist, then run
   `get_advisors` for security warnings.

Applied to production on 2026-10-07 with the owner's authorization:
`034_requirement_evidence_review` (missing from production before), then
047 through 059 in dev order. All succeeded. The next new migration is `060`.

Known schema difference: a few legacy dev-only tables (`candidate_reports`,
`outcome_feedback`, older `simulation_*` columns) exist only in dev. No
current code reads them.

## Environment

Server-only values stay on the server. None of them are sent to the browser,
analytics or the desktop bundle.

| Required for | Variables |
| --- | --- |
| Core | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` |
| Coworker chat and generation | `MODEL_PROVIDER=groq`, `GROQ_API_KEY`, optional `GROQ_MODEL`. `OPENAI_*` and `OLLAMA_*` are alternatives. |
| Email | `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `EMAIL_FROM`, `EMAIL_FROM_TRANSACTIONAL`, `EMAIL_REPLY_TO`. Without them invitations show "email not configured" and nothing is sent. |
| Bot protection | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` |
| Scheduled work | `CRON_SECRET` |
| Admin | `ADMIN_ACCOUNTS` or `BOOTSTRAP_ADMIN_EMAIL`, `ADMIN_MFA_REQUIRED`, `ADMIN_NOTIFICATION_EMAIL` |
| Hosted test execution | `FYDELL_EXECUTION_PROVIDER`, `FYDELL_EXECUTION_SNAPSHOT_ID`, `FYDELL_EXECUTION_URL`, `FYDELL_EXECUTION_TOKEN`. Unset means reports say hidden tests did not run. |
| Evidence engine | `EVIDENCE_ENGINE_URL`, `EVIDENCE_ENGINE_SECRET` |
| GitHub (higher rate limit) | `GITHUB_TOKEN` |
| Payments (deferred) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` |
| Local tests only | `FYDELL_DEV_SUPABASE_URL`, `FYDELL_DEV_SERVICE_ROLE_KEY`, `FYDELL_DEV_DB_URL` (needed for full cleanup of append-only rows) |

Desktop release secrets (`TAURI_SIGNING_PRIVATE_KEY` and its password) belong
in GitHub Actions secrets only. See `docs/desktop-release.md`.

## Tested platforms and checks

Labels follow §25: unit, live database (fydell-dev), local server over HTTP,
browser, native.

| Area | Kind | Command or method | Result |
| --- | --- | --- | --- |
| Types and lint | static | `npx tsc --noEmit`, `npx eslint` | Clean |
| Production build | build | `npx next build` | Passes |
| Engineering task rules | unit | `npm run test:eng-units` | 112 pass |
| Engineering task end to end | live database | `scripts/test-eng-staging.ts` | Pass (service layer, RLS, storage) |
| Desktop engineering client | local server + live database | `npm run test:desktop-http` | 11/11: bearer auth, isolation, starter hash, setup code, chat, draft conflict, signed upload PUT, finalize hash, update-then-submit, idempotent receipt, report hidden |
| Role applications | live database | `scripts/test-role-applications.ts` | Pass: publish, apply with evidence, receipt, employer review, requirement versioning, withdraw revokes sharing, re-apply, pause/close, cross-org and signed-out RLS |
| Sharing and revocation | unit | `scripts/test-passport-grind-sharing.ts` | 41 pass |
| Review access | static policy checks | `scripts/test-review-access-control.ts` | Pass |
| Profile presentations | unit + live | `npm run test:presentations` | Pass |
| Operator view | live database + HTTP | `npm run test:ops`; unauthenticated 307/401, foreign-origin 403 | Pass |
| Auth pages layout | browser | 1440 px and 390 px screenshots, overflow check | No overflow |
| Pro waitlist email | unit | template check | Waitlist wording, no charge implied |
| Desktop installers | native build | `tauri build` on Windows 11 x64 | MSI and NSIS built, unsigned. Release signing step needs the GitHub secret. |

Not run: macOS and Linux desktop builds (CI only), clean-machine installer
test, hosted sandbox execution, Stripe lifecycle, private-repository import.

## Example fixture

- Engineering scenario: `scenarios/backend-webhook-retry/` (starter, hidden
  tests, reference fix used by the tests above).
- Ops fixture in dev only, labelled "Ops test fixture (dev only)".

## Known limits

- **Payments:** not live. Pricing shows Pro as a preview with a waitlist; no
  card is taken. Engineering task usage is not metered yet.
- **Hosted test execution:** without the execution variables, hidden tests do
  not run and the report says so.
- **Private repositories:** need GitHub App credentials; public repositories
  and ZIP uploads work.
- **Desktop:** Windows 0.1.6 installers are unsigned; SmartScreen will warn.
  The v0.1.6 tag is not pushed.
- **Scenario review:** the backend scenario has not been reviewed by an
  outside senior engineer.
- **Local test cleanup:** `FYDELL_DEV_DB_URL` in `.env.local` is a placeholder,
  so live suites leave append-only rows until cleaned through the SQL editor.

## Pilot runbook

- Day-to-day operation, stuck work, retries, disputes, severity:
  `docs/operations/runbook.md`.
- Engineering task rehearsal: `docs/ENGINEERING_ASSESSMENT_RUNBOOK.md`.
- Pilot production setup: `docs/pilot-production-setup.md`.

## Deployment state

- This batch is committed locally on `main` on top of `f8ece7d` and is not
  pushed. `origin/main` at `f8ece7d` holds the previous batch. Production was rolled back
  in Vercel to `078bcdd` at the owner's request, which pauses auto-deploys
  until it is promoted again.
- Production database already has migrations through 059, which are additive
  and safe for the rolled-back code.
- The next push or promotion needs the owner's go-ahead.

## Waiting on the owner

- Confirm `MODEL_PROVIDER=groq` is set in Vercel Production.
- Tauri signing secrets in GitHub, then approval to push the v0.1.6 tag.
- GitHub App credentials for private repositories.
- Stripe keys, when payments start.
- An outside review of the engineering scenario.
- Review the incident response times in the runbook.
