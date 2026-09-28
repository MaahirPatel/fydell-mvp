# Engineering assessment runbook (Backend Engineer, webhook retry incident)

How to enable, verify and operate the first paid assessment. Everything
below marked **live** has not been run yet: it needs a staging deployment,
a database and an isolated runner.

## What it is

| Piece | Where |
| --- | --- |
| Scenario repository, provided tests, docs, worker log | `scenarios/webhook-retry-incident/` (candidate package, allowlisted in `.fydell/scenario.json`) |
| Hidden tests, harness canary, solution variants | `scenarios/webhook-retry-incident/.hidden/` (server only, never packaged) |
| Evaluation descriptor, rubric, canonical facts | `.fydell/evaluation.json`, `.fydell/rubric.json`, `canonical.json` (server only) |
| Catalog content (teammate, update, handoff questions) | `src/lib/simulations/content/engineering-webhook-retry.ts` |
| Runner library (assembly, bootstrap, providers, grading) | `src/lib/engineering/` |
| Candidate runs | `POST/GET /api/sim/sessions/[id]/runs` |
| Evaluation after submit | `POST /api/sim/sessions/[id]/analyze` → `evaluateSubmittedSession` |
| Employer report section | `engineering` block of `GET /api/sim/sessions/[id]/report`, rendered by `EngineeringResults` |
| Run records | `sim_test_runs` (migration `034_engineering_test_runs.sql`) |
| Isolated runner service | `services/engineering-runner/` |
| Desktop client | `desktop/` (`execution.rs` remote runs) |

## Enable in an environment

1. Apply migrations through `035_engineering_report_reviews.sql` to staging first
   (`031_submit_transfer_state`, `032_billing_ledger` and
   `033_passport_sharing_corrections` are also new on this branch).
2. Publish the catalog entry: `npx tsx scripts/seed-simulations.ts` (creates
   the `webhook-retry-incident` template and an immutable version).
3. Choose one isolated runner and configure it:
   - **Vercel Sandbox:** `npm run engineering:snapshot` with Vercel OIDC
     credentials loaded, then set `FYDELL_EXECUTION_PROVIDER=vercel` and
     `FYDELL_ENGINEERING_SNAPSHOT_ID`.
   - **Worker:** deploy `services/engineering-runner` on a dedicated Linux
     host with gVisor (see its README), then set
     `FYDELL_EXECUTION_PROVIDER=worker`, `FYDELL_RUNNER_URL`,
     `FYDELL_RUNNER_TOKEN`.
   - Without either, runs and evaluations are recorded as `not_configured`,
     reports say the code was not evaluated, and usage is not billed.
4. Desktop version gate (optional): `FYDELL_DESKTOP_MIN_VERSION`,
   `FYDELL_DESKTOP_LATEST_VERSION`, `FYDELL_DESKTOP_DOWNLOAD_URL` (HTTPS).
5. Confirm the deployment bundles `scenarios/` (`outputFileTracingIncludes`
   in `next.config.ts`): `GET /api/sim/sessions/{id}` must return a
   `filePackage` with `execution: "remote"`.

## Validate before any paid use

Author machine (Python 3.11+ with pytest; this executes the variants
locally, so never use it with candidate files):

```
FYDELL_LOCAL_PYTHON=python3 npm run validate:scenario
npm run test:engineering
```

Expected: every variant matches its row in `evaluation.json`, and the
tamper, conftest, weakened-test and infinite-loop fixtures pass.

**Live**, in staging, with the chosen runner:

1. Isolation checks in `services/engineering-runner/README.md` (network
   denied, resource exhaustion, output flood, cleanup, concurrency, restart).
   For Vercel Sandbox, run the same hostile fixtures through
   `POST /runs` and record the outcomes.
2. Rehearsal (E2E-04/05/06/07/18/20/24), with a test employer and a test
   candidate on a clean machine:
   - Employer invites the candidate to `webhook-retry-incident`; the email
     names Backend Engineer, 60 minutes and the desktop app.
   - Candidate installs the desktop app, signs in, opens the invitation;
     provisioning passes without Python installed.
   - Run tests on the untouched code: exactly the two incident tests fail.
   - Apply `.hidden/solutions/reference/`, save, run: all provided tests
     pass; edit a file and see "Results from an earlier version".
   - Wait for the Retry-After update at about 25 minutes (delivered in the
     team thread); acknowledge it.
   - Submit. Kill the network during submit once and confirm the receipt
     recovers (DESK-16).
   - The employer sees "Report in review". A platform reviewer opens
     `/admin/reviews`, checks the evaluation, code changes and handoff, and
     releases it.
   - Employer report: Code evaluation shows all three groups passing,
     canary "failed as expected", snapshot hash matches the submission.
   - Repeat with `partial_no_update` and with a candidate who submits before
     the update: requirement_update shows failing and "Not observed"
     respectively.
3. Human review of the scenario, rubric and hidden tests by a qualified
   engineer outside the author (SCEN-09); record the reviewer and date in
   `.fydell/rubric.json` → `humanReview`.

## Operate

- **Every report needs a human release** (AI-12). Platform users with the
  `reviewer`, `admin` or `super_admin` role work the queue at
  `/admin/reviews` (oldest first). Releasing a report whose code was not
  evaluated cleanly requires a note explaining what the employer can rely
  on. "Reopen for correction" withdraws a released report; every decision
  is kept in the review history. Track time from submission to release
  against the turnaround promised to the buyer.

- **A run is stuck "running":** after the suite timeout plus 3 minutes it is
  treated as abandoned on the next request and a new run proceeds. Nothing
  to clean up by hand.
- **Evaluation failed (runner outage):** the report shows "The test runner
  failed; this is not a result about the candidate". Retry by calling
  `POST /api/sim/sessions/{id}/analyze` (idempotent); usage stays held until
  an evaluation completes.
- **Indeterminate evaluation** (canary passed or expected tests missing):
  never scored. A qualified reviewer inspects the submission and output;
  treat a passing canary as a possible tampering attempt.
- **Changing the scenario:** bump `version` in `.fydell/scenario.json`,
  `evaluation.json` (`scenarioVersion`, `suiteVersion`) and the content's
  `engineering.scenarioVersion`, rerun validation, reseed. Existing attempts
  keep their pinned template version; run records keep their suite version.

## Known limits

- Candidate code shares the pytest process with the trusted tests inside the
  sandbox. The canary and expected-test checks catch reporting tampering,
  but a result can be spoiled (indeterminate) by a determined candidate.
- The handoff questions are scored by keyword concepts (existing micro
  scoring). Treat that section as interpretation; correctness comes from the
  test groups.
- Only Linux desktop installers have been built. Windows compiles and passes
  unit tests; no Windows installer has been built or signed.
