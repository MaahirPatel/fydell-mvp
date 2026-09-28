# Fydell privacy notice (SEC-02) — DRAFT

> **Status: draft. Not legal advice. Must be reviewed by qualified counsel for
> the launch market before publication. No certifications are claimed.**

Last drafted: 2026-09-27.

## Who we are and how to contact us

Fydell ([contact route to be confirmed before launch — NEEDS-LIVE]).

## What we collect

- **Account data:** email address and authentication credentials (passwords are
  stored as hashes, never plaintext).
- **Candidate evidence you choose to share:** repository findings you select,
  passport content, simulation submissions (code, transcripts), and messages
  you send in the product.
- **Employer workspace data:** roles, invites, assignments, reviewer notes and
  hiring decisions made by your team.
- **Billing data:** payer name/email, organization, subscription and invoice
  records. Card details go directly to our payment provider (Stripe) and are
  never stored by Fydell — see `docs/BILLING_POLICY.md`.
- **Operational data:** structured logs with correlation IDs for reliability.
  Secrets and credentials are redacted before logging.

We do **not** collect screen recordings, browser history, local files beyond
what you explicitly upload, or private AI chats.

## How we use it and AI use disclosure

- To provide the hiring-simulation service: run simulations, evaluate
  submissions, and produce evidence reports.
- **AI use:** candidate submissions may be evaluated with the help of automated
  models ("evaluators"), alongside deterministic tests and human review.
  Evaluation outputs are versioned (scenario, rubric, test, evaluator/model
  and prompt versions are recorded with each result). We do not claim human
  review of every output; employer reviewers see which parts are automated.
- To operate billing, prevent abuse (rate limits, access controls), and
  provide support.

## Sharing

We share data only with the subprocessors needed to run the service (auth,
hosting, storage, email, payments, model/execution providers — listed in
`docs/DATA_FLOWS.md` and `docs/CUSTOMER_TERMS.md`), and with the employer
organizations you explicitly share candidate data with. We do not sell personal
data.

## Retention and deletion

Retention periods are in `docs/RETENTION_SCHEDULE.md`. You may request export,
correction, or deletion of your data at any time (see "Your rights" below).
Deletion is fulfilled against live systems promptly; encrypted backups expire
on schedule and are never used to restore deleted subject data.

## Your rights (candidates and users)

You may request: a copy of your data (export), correction of inaccurate data,
or deletion of your data. Authenticated requests are handled through the
process in `src/lib/security/data-rights.ts`; every request is tracked
(received → identity verified → traced → fulfilled) with a fulfillment
checklist covering the database, object storage, job queues/indexes, vendors,
and backups.

## Demo data

The public demo uses fictional fixtures only (Candidate01-style identities).
Demo interactions are not saved to real accounts and never trigger real email,
paid evaluation, or charges.

## Changes to this notice

Material changes will be communicated before they take effect — NEEDS-LIVE:
confirm the notification mechanism before launch.
