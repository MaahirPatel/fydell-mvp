# Operations and support runbook

How a Fydell operator finds stuck work, retries or cancels it, supports a
pilot, and answers a candidate who disputes a report. Everything here
describes what the code does today; where a step is manual, it says so.

Related: `docs/INCIDENT_RESPONSE.md` (security incidents),
`docs/admin-access.md` (signing in), `docs/migration-runbook.md`.

## Who can do what

Platform roles live in `platform_user_roles` (active rows only) and are
checked on every admin page and API route.

| Role | Stuck work page | Retry / cancel | Engineering review queue | Pilot requests |
| --- | --- | --- | --- | --- |
| `super_admin`, `admin` | yes | yes | yes | yes |
| `operator` | yes | yes | no | yes |
| `support` | yes (read only) | no | no | yes |
| `reviewer` | no | no | yes | no |

The action roles are re-checked inside `performOpsAction`
(`src/lib/ops/ops-actions.ts`), not only at the route, so a caller that skips
the route gate still cannot act.

## The Stuck work page

`/admin/operations` (also linked from the "Stuck work" card on
`/admin/overview`). Built by `loadOpsSnapshot` in `src/lib/ops/stuck-work.ts`;
the same snapshot is available as JSON from `GET /api/admin/ops/stuck`.

The page shows ids, states, counts and timestamps only. It never loads
candidate source, archive contents, hidden test results, handoff text,
candidate response text, report drafts, reviewer notes, storage paths or
import payloads. Each section loads independently: if one query fails, that
section shows the error and the rest still render. A section with 200 rows
shows "200+"; work the oldest rows first.

Default thresholds (`DEFAULT_OPS_THRESHOLDS`):

| Section | Listed when |
| --- | --- |
| Evaluation runs | status `queued`, `retryable_failure` or `blocked`; or `running` with an expired lease; or `running` longer than 60 minutes after submission |
| Submitted without an evaluation run | a submission from the last 30 days, older than 10 minutes, with no run at all |
| Uploads stuck validating | upload in `validating` for more than 15 minutes |
| Passport imports | queued or retry-scheduled more than 10 minutes past due ("Overdue"); running with no heartbeat for 90 seconds ("Worker lost"); failed in the last 14 days ("Failed") |
| Reports waiting on a reviewer | draft untouched for 48 hours; or a finished evaluation (`human_review`) with no draft 48 hours later |
| Open candidate responses | an `open` response older than 5 days |
| Recent operator actions | the last 25 rows of `ops_actions` |

Attempt ids link to `/admin/engineering/{attemptId}` (reviewer roles only).

## Retry and cancel: the exact procedure

1. Open `/admin/operations` and find the row. Only actions the row's current
   state accepts are shown.
2. Click the action. Write a reason (5 to 500 characters) that a colleague
   could act on later, for example "Executor snapshot restored after outage,
   retrying" or "Duplicate test attempt from pilot setup, never evaluate".
   Do not paste candidate code, test names or personal data into the reason;
   it is stored permanently.
3. Confirm. The dialog shows the outcome:
   - **applied**: the change was made.
   - **noop**: nothing needed doing, or another operator got there first.
     Reload and look again.
   - **rejected**: the state does not allow it (the message says why).
   - **error**: failed on our side, with a reference `OPS-…` that matches the
     server log line.
4. Reload. The row should leave the list or show its new state, and the
   action appears under "Recent operator actions".

Safety properties you can rely on:

- **Idempotent.** The dialog mints one idempotency key when it opens and
  reuses it for every submit. A double click or a network retry returns the
  recorded outcome instead of acting twice. Reusing a key for a different
  action or target is refused.
- **Race-safe.** Every state change is a compare-and-set on the state the
  action was checked against. If two operators act at once, one applies and
  the other records `noop`.
- **Live workers are protected.** A run held by an unexpired worker lease
  cannot be retried or cancelled. An upload validating for less than 15
  minutes cannot be reset.
- **Audited.** Before acting, a row is written to `ops_actions` with who
  (email and roles), what (action, target type, target id), why (reason),
  when (`created_at`) and the state before. When the action finishes, the
  outcome, state after, detail and `completed_at` are filled in once. The
  table is append-only by trigger: rows cannot be deleted and a finished row
  cannot be changed. Every action is also mirrored to `audit_logs` as
  `ops.<action>`. Engineering actions add an event to the attempt timeline
  (`eng_attempt_events`).

Over the API (same rules as the page; needs an admin session cookie and a
same-origin request):

```
POST /api/admin/ops/actions
{ "action": "eng_run.requeue", "targetId": "<uuid>", "reason": "...", "idempotencyKey": "<8-120 chars of A-Z a-z 0-9 : _ ->" }
```

Status codes: 200 applied or noop, 409 rejected, 400 bad input, 401 no
session, 403 wrong role or cross-origin, 500 error.

The reviewer retry on `/admin/engineering/{attemptId}` and the employer's
"retry tests" both use `requeueRun` and record only a timeline event with
the reason. Prefer the Stuck work page so the action is in `ops_actions`.

## Triage by stuck state

### Evaluation run `blocked`

The run used its retry budget or hit a non-retryable error. Read the error
code in the row:

| Error code | Meaning | What to do |
| --- | --- | --- |
| `executor_not_configured` | No isolated evaluation environment (`FYDELL_EXECUTION_SNAPSHOT_ID` unset) | Fix the environment first, then **Retry**. Retrying before that blocks again. |
| `executor_refused` | `FYDELL_EVAL_EXECUTOR=local-dev` in production | Remove the setting, then **Retry**. |
| `harness_version_mismatch` | The deployed evaluator does not match the attempt's pinned scenario version | Do not retry until the deploy matches; escalate to engineering. |
| `archive_missing`, other archive errors | The stored submission could not be read back and verified | Check storage. Do not ask the candidate to resubmit; submissions are final. Escalate. |
| `retries_exhausted` or an infrastructure code | Executor outages used up the budget | Confirm the executor is healthy, then **Retry**. |

**Retry** puts the run back in the queue with a fresh budget (tries so far
plus 3, capped at 10 total). At 10 tries Retry is no longer offered; find the
cause instead. Recorded test results are never changed by a retry.

### Evaluation run `retryable_failure`

The worker will retry it on its own at `next retry`. Retry now only if the
cause is fixed and you do not want to wait.

### Evaluation run `running` with "lease expired"

The worker died mid-run. The next worker that looks for work reclaims it
automatically. If nothing has picked it up (evaluation work is triggered by
app requests, there is no evaluation cron), **Retry** to hand it to a worker
now.

### Evaluation run `queued` for a long time

No worker has picked it up. Evaluation work runs after requests that schedule
it (submissions, retries). Any operator Retry or Queue evaluation also
schedules a worker pass. If many are queued, check the executor
configuration and server logs before acting row by row.

### Submitted without an evaluation run

The submission was saved but inserting the run failed. **Queue evaluation**
creates the run with the attempt's pinned scenario version. If the
submission's only run was cancelled, this is refused: cancelled runs are
final and their run key is not reused.

### Cancel an evaluation run

Use **Cancel** only for withdrawn, duplicate or test attempts. It is final:
the app will not evaluate that submission again, and Queue evaluation will
refuse it afterwards. Finished runs (`human_review`, `ready`) cannot be
cancelled; their results stay on record.

### Upload stuck validating

The archive check started and never finished. **Reset** marks the upload
`failed` with code `validation_interrupted`; the stored file is kept, and the
candidate's next submit re-runs the check. Tell the candidate to submit
again. Accepted and rejected uploads are final and cannot be reset.

### Passport import "Overdue" or "Worker lost"

**Retry** hands the job to a worker now (the daily `/api/cron/passport-imports`
backstop at 04:30 UTC would otherwise pick it up). **Cancel** stops it before
it saves; an import already saving completes. A cancelled import can be
started again by its owner from their work record.

### Passport import "Failed"

- If the row offers **Retry**, the failure was on the platform side
  (`rate_limited`, `github_unavailable`, `save_failed`, `worker_interrupted`,
  or attempts exhausted on one of those). Retry gives it a fresh attempt
  budget.
- If it offers nothing, the failure is about the repository (for example
  `private_repository`). Retrying would fail the same way. The owner has to
  fix access or choose another repository.

### Reports waiting on a reviewer

No operator action. A draft untouched for 48 hours or a finished evaluation
with no draft means the review queue is behind. Tell a reviewer; they work
the queue at `/admin/engineering`. Track submission-to-release time against
what the customer was promised.

### Open candidate responses older than 5 days

See "Answering a candidate dispute" below.

## Pilot support procedure

Pilots are run by hand; there is no self-serve pilot billing.

1. **Intake.** Public requests land in `pilot_requests` with a `FYD-…`
   reference and appear at `/admin/pilot-requests`. Open the request, set its
   status as you contact and qualify the company, and add internal notes
   (stored in `pilot_request_notes`, never shown to the customer). Every
   change is written to `pilot_request_events` and `audit_logs`.
2. **Approve.** "Approve" creates the organization, marks the request
   `workspace_created`, invites the contact as owner and sends the queued
   emails. Check the result under Organizations and the Email center.
3. **During the pilot.** Watch `/admin/operations` daily. Every stuck item
   in a pilot organization is a customer-visible delay.
4. **Feedback.** Pilot feedback forms are collected at
   `/admin/pilot-feedback`.
5. **Manual records.** Anything agreed outside the product (scope, dates,
   candidate volume, exceptions) goes in a note on the pilot request so the
   next operator can see it. Do not record it by editing database rows.

## Answering a candidate dispute

A candidate who has a released report can add context or flag something as
inaccurate on a finding, a criterion or the report as a whole. These are
stored in `eng_report_responses` (append-only for the candidate) and shown
to the hiring team with the report.

1. **Who answers.** The hiring team resolves the response from the employer
   report, as an organization member allowed to write reports
   (`POST /api/eng/org/attempts/{attemptId}/responses` with the response id
   and a written resolution). Resolving records the text, the resolver's
   email and the time, and shows the reply to the candidate. A response can
   be resolved once.
2. **Fydell's part.** When a response is open for more than 5 days it appears
   on the Stuck work page with its kind (`context` or `inaccurate`), target
   and report version, but not its text. Contact the hiring team for that
   organization and ask them to answer it. Fydell operators do not resolve
   responses on the employer's behalf.
3. **If the report is wrong.** Resolving a response never changes the
   report. Released report versions are immutable by database trigger. A
   reviewer corrects it by saving a new draft (linked to the released
   version it supersedes) with a change reason, and releasing it; the
   release is refused without a change reason. On release the earlier
   version is marked superseded, the candidate sees the corrected version
   with earlier versions listed, and the attempt timeline records
   `report_correction_released`.
4. **If the evaluation itself is in doubt** (for example the candidate says
   the tests ran against the wrong file), check the run and submission
   hashes on `/admin/engineering/{attemptId}`. Do not share hidden test
   names, inputs or expected outputs with the candidate or the employer in
   the answer.

## Incident severity

Use these levels for operational problems. Security incidents (data
exposure, credential compromise) follow `docs/INCIDENT_RESPONSE.md` and its
SEV-1 to SEV-3 levels instead.

| Level | Examples | Response |
| --- | --- | --- |
| **P1** | No evaluations completing for anyone; submissions or uploads failing for all candidates; a report or candidate data shown to the wrong organization | Start now, all hands. A cross-organization leak is also a security SEV-1. Tell affected customers within the day. |
| **P2** | Evaluations blocked for one environment or scenario version; imports failing platform-wide; a pilot customer's attempt stuck past the promised turnaround | Same business day. Fix the cause, then retry affected rows from the Stuck work page. |
| **P3** | Single stuck run, upload or import; review queue behind; one old open response | Within one business day through the normal triage above. |

For every P1 or P2, record the timeline and the `ops_actions` ids you used
in the incident notes.

## What not to do

- **Never reset, truncate or restore over the production database.**
  Migrations are additive only; never drop, rename or rewrite tables.
- **Never edit a released report.** Publish a correction as a new version
  with a change reason.
- **Never edit or delete audit rows** (`ops_actions`, `audit_logs`,
  `eng_attempt_events`, `security_audit_events`, `operator_actions`), even to
  tidy up after a mistake. Record a new action with a reason instead.
- **Never expose hidden tests.** Do not copy hidden test names, inputs,
  expected outputs or harness source into reasons, notes, emails, tickets or
  answers to candidates and employers.
- **Never paste candidate source, handoff text or response text** into
  reasons, notes or chat. Refer to items by id.
- **Never change rows by hand in the SQL editor** to unstick work when an
  action exists for it; hand edits bypass the audit trail and the state
  checks. If no action covers the case, escalate to engineering.
- **Never ask a candidate to resubmit to fix a platform problem** once their
  submission is accepted; submissions are final.
- **Never cancel a run to make a row disappear.** Cancelled runs are final
  and that submission cannot be evaluated by the app again.

## Testing the operator view

`scripts/test-ops-stuck-work.ts` runs pure checks, then live checks against
the development Supabase project only (it refuses any other URL). Run:

```
npx tsx --conditions react-server --env-file=.env.local scripts/test-ops-stuck-work.ts
```

Because uploads, submissions and attempt events cannot be deleted, it reuses
one labelled development fixture: organization "Ops test fixture (dev
only)", user `ops-fixture@example.com`, a draft role, one invitation, one
submitted attempt, two uploads and one submission. Everything else it
creates (runs, reports, responses, import jobs, a disposable user) is deleted
at the end. Its `ops_actions` and `audit_logs` rows stay because they are
append-only. With the dev server running it also checks that the action and
snapshot routes refuse unauthenticated and cross-origin requests.
