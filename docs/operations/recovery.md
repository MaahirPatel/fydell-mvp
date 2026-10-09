# Recovery

What happens when work is interrupted, how it is picked up again, and what we
can honestly promise. Each scenario names the mechanism and the test that
exercises it. "Live" tests run against fydell-dev (`btbmvrvynnrhapjdkunz`)
through a local server; "unit" tests run in-process with fakes.

## Recovery objectives

| Failure | Recovery point (data lost) | Recovery time | Basis |
| --- | --- | --- | --- |
| A request dies mid-operation (deploy, timeout, crash) | Nothing once the database write has committed | Next retry or page load | Idempotent writes and follow-through on repeat (below) |
| A background worker is killed | Nothing; the stage in progress is redone | When the lease expires plus the next worker run | Leases with bounded attempts |
| Email provider or webhook outage | Nothing; rows wait in the outbox or Stripe redelivers | Next outbox run after the provider recovers | Outbox retries with backoff, Stripe redelivery |
| Whole database lost or corrupted | **Depends on the Supabase plan. See below.** | Hours, manual | Supabase backups |
| Submission archives in Storage lost | Not covered by database backups | Not recoverable from our side | Supabase Storage durability only |

### Backups depend on the plan

The project runs on the Supabase **Free** plan. Point-in-time recovery is a
paid add-on and is not enabled. Free projects do not get daily backups that
can be restored from the dashboard. Until the plan changes, a full database
loss can be recovered only up to the last manual `pg_dump`; anything after it
is gone. Storage objects (submission archives, imports) are never part of a
database backup.

Before production traffic depends on this:

1. Move to a plan with daily backups (Pro keeps 7 days) and decide whether PITR is worth paying for.
2. Until then, take a `pg_dump` of the production database before every migration and on a fixed schedule, and store it outside Supabase.
3. Practise a restore into a scratch project once. A backup nobody has restored is not proven.

### Scheduled workers

`vercel.json` runs three crons once a day (sandbox cleanup, billing usage,
passport imports). The evaluation worker (`/api/eng/worker`) and the email
outbox (`/api/cron/process-email-outbox`) run every minute from Supabase
`pg_cron` once the one-time setup in `admin-guide.md` ("Scheduled workers") is
done. Both accept `GET` and `POST` with `Authorization: Bearer $CRON_SECRET`.

Until that setup is done, or if the jobs stop:

- Evaluation starts in the same request that accepted the submission, and every retry or page load re-queues it. A run whose worker dies is picked up only when someone loads the attempt, a reviewer opens it, or an operator requeues it from `/admin/operations`.
- Queued emails wait until someone calls the outbox route. Invitation emails are sent directly when created and do not depend on it.
- A failed import retries at the next daily run.

`pg_net` gives up waiting after 60 seconds. A worker run that takes longer
keeps going on Vercel only until the function's own time limit, and its leases
are picked up again on a later run.

## Scenarios

### Refresh during an import

Imports are durable jobs (`durable_jobs`, `job_type = passport_import`) with a
lease, `max_attempts = 4` and a `dead_letter` state. A refresh reattaches to the
running job rather than starting another; a duplicate request for the same
source is deduplicated. A job whose worker died is reclaimed after its lease
expires and counts the attempt.

- Tested by `scripts/test-ops-stuck-work.ts` (live, 17 checks): failed, worker-lost and overdue import jobs are listed; retry requeues once; cancel closes lost jobs; finished jobs are refused.

### Connection lost during submission, or the acknowledgment is lost

A submission is one row per attempt (unique `attempt_id`). Whatever must follow
it (closing the attempt, logging `submission_accepted`, queueing evaluation) is
in `completeSubmission`. Each step is idempotent: a status guard, a fixed client
event id, and a unique run key. It runs on the first submit, on every retry, on
the insert race, and when the attempt is loaded. A request that died after
recording the submission is completed by the next retry or reload. The
candidate sees the receipt instead of an attempt that looks open.

Unsaved text survives a session expiry or a dropped connection. Each draft is
kept in the browser under the attempt and draft key, saved again when the tab
regains focus, and removed only after the server confirms. If the server copy
changed in the meantime, the candidate is shown a conflict instead of having
either version overwritten.

- `scripts/test-recovery.ts` (live, 16 checks):
  - The submission row is recorded with no follow-through.
  - Reloading the attempt shows the receipt, closes the attempt, queues one evaluation and logs one acceptance.
  - A retry and two concurrent retries return the same receipt, create no second submission and queue no second evaluation.

### Duplicate message delivery

- **Stripe webhooks.** Every event is logged with its result. A redelivery of an `applied`, `ignored` or `duplicate` event returns `duplicate` without touching state or overwriting the stored result. A `failed` event is processed again on redelivery, so a transient failure is not swallowed. Tested by `scripts/test-platform-grind-billing.ts` (unit).
- **Candidate and chat events** carry client event ids and are deduplicated by a unique index.
- **Admin actions** (`/admin/operations`, commercial corrections) take an idempotency key. A replay returns the recorded outcome. Tested by `scripts/test-admin-portal.ts` (live).
- **Emails** are sent with the provider idempotency key `outbox-<row id>`, so a reclaimed row cannot send twice.

### Worker termination and expired leases

- **Evaluation runs** hold a lease. An expired lease is reclaimed and counts an attempt. At the limit the run is blocked for review instead of retrying forever. Operators can requeue or cancel from `/admin/operations`.
- **Authoring jobs** (draft generation and test runs):
  - Each graceful exit clears the lease owner. The 230 s time budget is shorter than the 240 s lease.
  - A job still `running` under an expired lease therefore means its worker was killed. That counts as an attempt.
  - At `max_attempts` the job fails as `worker_lost`, and the interrupted stage is marked failed.
  - The claim is a compare-and-set on the previous owner, so two workers cannot both resume it.
- **Email outbox:**
  - A row left in `processing` for more than 10 minutes is reclaimed.
  - A row that already used its fifth attempt is marked failed, with a note to check the provider log before resending.
- `scripts/test-recovery.ts` (live):
  - A job on its last life fails as `worker_lost` when two workers race to claim it.
  - A job with lives left is reclaimed and the lost run counted.
  - A job under a live lease is left alone.
  - A stale outbox row is reclaimed, and an exhausted one fails visibly.

### Failed report publication

Releasing a report version is a single database transaction, and report
versions are immutable: a fix publishes a new version and keeps the old one.
If publication fails, nothing is visible and the employer can publish again.
The `report_released` event is written in the same transaction
(`eng_release_report_with_event`, migration 091), keyed by the report id, so a
release never exists without its event and a retry cannot record it twice.

### Interrupted export

Exports (report downloads, passport presentation images) are generated
synchronously per request and hold no server-side state. An interrupted
download is fixed by downloading again. There is no self-service export of all
account data yet; data requests go through `/admin/data-requests`.

### Concurrent edits

These writes are compare-and-set on a revision or `updated_at`, and the loser gets 409 with the current state:

- assessment drafts
- work-sample drafts and contributions
- scenario drafts
- incident reviews
- employer role edits (when the client sends `expectedUpdatedAt`)

Known gaps:

- `expectedUpdatedAt` is optional on `PATCH /api/employer/roles/[id]`, so an older client can overwrite.
- The "How I build" profile section has no revision check.

## Known gaps

- The authored-assessment submit path does not yet re-run its follow-through on retry the way built-in assessments do, and can leave an upload with no submission. A retry still returns the stored submission.
- `evaluation-run.ts` writes the evaluation draft after flipping the run to human review. A crash between the two leaves a run waiting for review with no draft. An operator can requeue it.
- The every-minute worker schedule needs the one-time Vault setup in production (see above).
- Database backups depend on the plan (see above).
