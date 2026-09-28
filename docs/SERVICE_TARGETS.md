# Fydell service targets (OPS-05) — DRAFT

Last drafted: 2026-09-27. Measurement against live traffic is NEEDS-LIVE;
targets below are commitments for the first paid contract, not measured
results. No unsupported uptime promises are made.

## Targets for the first contract

| Journey step | Target |
|---|---|
| Employer setup → first invite sent | < 15 minutes of operator-free self-serve |
| Invite accepted → simulation ready | p95 < 5 minutes (scenario provisioning) |
| Submission → report ready | p50 < 30 minutes, p95 < 4 hours (includes human review queue) |
| Support response (billing / access issues) | first response < 1 business day |
| Recovery from worker restart | no lost accepted submissions; jobs resume or re-queue within 5 minutes |
| Webhook fulfillment (billing) | applied < 60 seconds after receipt; duplicates reconciled |

## Concurrency

- First contract: up to 25 concurrent candidate attempts per organization;
  sandbox runs throttled per route (`sandbox_run` policy in
  `src/lib/security/throttles.ts`).
- Per-attempt cost caps bound model calls, compute, storage, and email
  (`src/lib/ops/cost-caps.ts`).

## What we do NOT promise

- No "five nines" or any specific uptime percentage until measured.
- No guaranteed evaluation turnaround during provider outages; jobs are held
  truthfully (kill switch in `src/lib/ops/feature-flags.ts`) rather than
  failed.

## Measurement plan — NEEDS-LIVE

p50/p95 measured from structured logs (correlation IDs) once live traffic
exists; dashboard and alerting thresholds set after 30 days of data.
