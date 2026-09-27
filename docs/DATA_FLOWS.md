# Fydell data flows and recipients (SEC-01)

Last reviewed: 2026-09-27. Status: draft for launch — counsel review still required
for launch-market obligations (see `docs/PRIVACY_NOTICE.md`).

This document maps what personal and customer data goes to each provider, why,
the access scope, and the configured retention. It covers the web simulation
slice (candidate web app + employer review + billing). The desktop client has
its own flow documentation owned by the desktop chunk.

No invented certifications are claimed here. Where a control is planned but not
yet live, it is marked NEEDS-LIVE.

## Summary table

| Recipient (provider role) | What is sent | Why | Access scope | Retention |
|---|---|---|---|---|
| Supabase Auth (authentication) | Email, password hash (bcrypt, server-side), session tokens | Sign-in, session management | Fydell project only; service-role key is server-only | Sessions expire per auth config; accounts deleted on erasure request |
| Supabase Postgres (primary database) | Profiles, passport evidence, attempts, submissions, evaluation results, reviewer notes, billing/usage rows, audit events | Product data store | RLS enabled; anon key sees only granted rows; service-role key server-only | Per `docs/RETENTION_SCHEDULE.md` |
| Supabase Storage (object storage) | Source ZIPs, transcripts, reports, hidden tests/answer keys | Artifact storage for submissions and reports | Private buckets only; short-lived signed URLs gated by the access guard (`src/lib/security/access-guard.ts`) | Per retention schedule; deletion requests purge by user prefix |
| Hosting provider (web + API) | Request logs, TLS session metadata | Serve the app | Provider's standard operational access | Provider default log retention; app logs redact secrets (`src/lib/security/logger.ts`) |
| Resend (email) | Recipient address, message subject/body, delivery metadata | Transactional email: invites, submission receipts, support replies | API key server-only; no bulk marketing without explicit consent | Delivery logs per provider default; see vendor tracing in `src/lib/security/data-rights.ts` |
| Stripe (payments) | Payer email/name, organization id (metadata), subscription and invoice records | Hosted checkout, subscriptions, usage-based billing | Secret + webhook keys server-only; card data never touches Fydell (see `docs/BILLING_POLICY.md`) | Per Stripe's retention; erasure via Stripe privacy tooling on request |
| Model provider (evaluation) | Candidate submission content, scenario rubric/tests | Automated evaluation of simulations | API key server-only; submissions sent per attempt; no training opt-in claimed | Not stored by Fydell beyond the evaluation result row; provider-side retention per contract — NEEDS-LIVE: confirm zero-retention/data-processing terms before launch |
| Execution sandbox (simulation runs) | Candidate code snapshot | Run tests in isolation | Ephemeral; no persistence of candidate code beyond the run | Ephemeral by design; NEEDS-LIVE: verify provider-side wipe |

## What is NOT collected (SEC-04)

The web slice does not collect private screen recordings, browser history,
local files outside an explicit upload, or AI chat contents beyond the support/
simulation conversation the user sees. Codebase audit 2026-09-27: no usage of
`getDisplayMedia`/`getUserMedia` in `src/`. Any future collection needs a
necessary feature, explicit disclosure, and scoped permission first.

## Cross-border / subprocessor notes

- Subprocessors for launch: Supabase, hosting provider, Resend, Stripe, model
  provider, sandbox provider. Customer terms list them (`docs/CUSTOMER_TERMS.md`).
- NEEDS-LIVE: confirm each subprocessor's data-processing terms and region
  pinning before signing the first paid contract.

## Retention

See `docs/RETENTION_SCHEDULE.md`. Backups expire on schedule; deletion from
backups happens by expiry, never by surgical edit, and is disclosed in every
deletion fulfillment.
