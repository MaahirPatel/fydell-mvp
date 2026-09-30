# Backend handoff (2026-09-29)

Branch `backend/master-prompt-2026-09-29`, based on `main` at `f6087ae`.
Read with `docs/backend-current-state.md` (audit) and
`docs/backend-verification.md` (what was actually run).

## What changed

| Area | Change |
| --- | --- |
| Scenario catalog | `src/lib/scenario-catalog/`: typed blueprints for all 14 role families, validation lifecycle, honesty checks |
| Role intake | `src/lib/employer/intake.ts`, `GET/POST /api/employer/role-intake`: screening (protected characteristics, culture fit and vague traits), recommendations with assessed/not-assessed capabilities, role requests |
| Event replay | `src/lib/simulations/event-replay.ts`, `GET /api/sim/sessions/[id]/events?after=`, `listEventsAfter` in `db.ts` |
| Database | `supabase/migrations/039_role_intake_and_scenario_reviews.sql`: `sim_scenario_reviews` (append-only), `sim_template_versions.validation_status` with transition trigger, `employer_role_intakes` (freeze, idempotency), `role_requests`; fixes 019's guard so draft versions can be deleted and published versions can move lifecycle status |
| Determinism | `.gitattributes` forces LF under `scenarios/**` |
| Tests | `test:catalog`, `test:event-replay` (both in `test:unit`); `scripts/test-migration-039.mjs` (PGlite) |
| Hygiene | 18 pre-existing lint errors in backend/test code fixed; scripts honour `FYDELL_LOCAL_PYTHON` |
| Docs | the eight `docs/backend-*`, `scenario-*`, `evaluation-validation`, `frontend-backend-contract` pages |

No UI, global style or landing-page file was changed.

## Role-by-role status

| Family | Blueprint | Runnable | Automated validation | Expert review | Published |
| --- | --- | --- | --- | --- | --- |
| Backend | yes | yes | passed 2026-09-29 (17/17) | pending (SCEN-09) | no |
| Full-stack, FDE, frontend, applied AI, data, ML, MLOps, SRE, mobile, QA, AppSec, embedded, game | yes | no | — | — | no |

Nothing is published. "All roles supported" would be false.

## Run commands

```bash
npm ci
npm run typecheck
npx eslint
npm run test:unit                       # includes catalog + replay tests
FYDELL_LOCAL_PYTHON=<python with pytest> npm run validate:scenario
npm install --no-save @electric-sql/pglite && node scripts/test-migration-039.mjs
npm run build
npm run dev                             # web + API on :3000
cd desktop && npm ci && npx tauri dev   # desktop (not run in this session)
```

On Windows, `python3` is usually the Store stub; set `FYDELL_LOCAL_PYTHON`
to a real interpreter.

## Configuration names (no values)

Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`. App URL: `NEXT_PUBLIC_APP_URL`,
`NEXT_PUBLIC_SITE_URL`. Desktop-path execution: `FYDELL_EXECUTION_PROVIDER`
(`vercel` | `worker`), `FYDELL_ENGINEERING_SNAPSHOT_ID`, `FYDELL_RUNNER_URL`,
`FYDELL_RUNNER_TOKEN`, `FYDELL_LOCAL_PYTHON` (dev only). Web-path
execution: `FYDELL_EXECUTION_SNAPSHOT_ID`. Desktop version gate:
`FYDELL_DESKTOP_MIN_VERSION`, `FYDELL_DESKTOP_LATEST_VERSION`,
`FYDELL_DESKTOP_DOWNLOAD_URL`. Email: `RESEND_API_KEY`, `EMAIL_FROM`,
`EMAIL_FROM_TRANSACTIONAL`, `EMAIL_REPLY_TO`. Billing: `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`. Teammate redraft:
`OPENAI_API_KEY` (optional; authored replies without it).

## Windows checks actually performed

- Web/API typecheck, lint, unit tests, scenario validation and a production
  build on Windows 11 (see verification).
- Found and fixed CRLF-dependent scenario bytes.
- **Not performed:** building or installing the Tauri desktop app, a clean
  machine install, deep links, keychain behaviour, sleep/resume.

## Release blockers and decisions

1. **decision:** keep or retire the parallel `eng_*` web loop.
2. **decision:** keep selling the backend scenario as `pilot_unreviewed`, or
   pause invites until SCEN-09 review.
3. **decision:** remove the automatic `recommendation` from employer reports.
4. Confirm Production execution variables for the desktop path.
5. Apply 039 to fydell-dev (authorized person), then production later.
6. Atomic deadline extension; explicit attempt states; message sequence.
7. Live rehearsal and clean-machine Windows install.

## Manual operations that remain

Recording scenario reviews (SQL, `docs/scenario-authoring.md`), releasing
held reports from `/admin/reviews`, triaging `role_requests`, retention and
deletion requests.
