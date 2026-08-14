# Wave 1 acceptance report — wave1-rc1

**Branch:** `wave1-rc1`  
**Freeze commit:** `ec9e6b6`  
**Date:** 14 August 2026  
**Recommendation: NO-SHIP**

Feature work is frozen. Only acceptance failures may change this branch. The other 17 simulations, billing, generator, and outcomes were not added.

## What is proven

| Gate | Result |
|---|---|
| Contract freeze (routes, permissions, invitation truth, DA-01 pin) | Pass (`npm run test:wave1`) |
| Typecheck | Pass |
| Unit / state / disclosure suite | Pass |
| DA-01 cannot use keyword fallback | Pass (code + contract test) |
| Invitation expired / revoked / reused gates | Pass (pure function) |
| Copyable link ≠ delivered | Pass (contract) |
| Candidate cannot invite | Pass (permission matrix) |
| GSAP removed | Pass |
| Public CTA is Request a pilot | Pass |
| Employer catalog is DA-01 only | Pass (code) |

## What is not proven

| Gate | Result | Severity |
|---|---|---|
| Fresh non-production DB with production-equivalent sim schema | **Blocked** | P0 |
| Fresh golden path (signup → revoke) | **Not executed** | P0 |
| Recovery golden path | **Not executed** | P0 |
| Live adversarial matrix | **Not executed** | P0 |
| Formal visual sign-off | **Public pages captured, not signed** | P1 |
| Hiring-manager paid-pilot test | **Not run** | P1 |

## Staging

Two Supabase projects exist in the Fydell org:

- `fydell` — production. Untouched. Do not reset. Do not seed.
- `fydell-dev` — empty of user rows, healthy, **missing migrations 015–022**. There is no `sim_templates` / `sim_sessions` / `sim_invitations` table. DA-01 cannot run there yet.

Local Docker is not installed, so a local Supabase stack cannot be started on this machine.

Applying 015–022 to `fydell-dev` is the correct provision step. It was not applied automatically: that is a live-schema write and needs an explicit go-ahead. Dry-run:

```
npx tsx scripts/provision-wave1-staging.ts
```

After confirmation, on **fydell-dev only**:

```
WAVE1_APPLY_MIGRATIONS=1 npx tsx scripts/provision-wave1-staging.ts
npx tsx scripts/seed-da01.ts
```

Then create owner / member / candidate / outsider / removed-member accounts through the product, not SQL.

Also outstanding on `fydell-dev`: `public.organizations` has RLS disabled. Do not enable it without policies. Service-role writes would keep working; client reads would break.

Email: leave Resend unset for the empty-workspace / not-configured case. Use a sandbox key only when testing `sent`.

## Golden paths

Required twice, no SQL edits, no status patches:

1. Fresh: signup → workspace → invite → email/link → consent → DA-01 → autosave → curveball → revise → submit → analysis → report → receipt → revoke
2. Recovery: refresh, brief offline, resume, retry failed save, double-click Submit, reopen report

Harness: `WAVE1_LIVE=1 GOLDEN_PATH_BASE_URL=http://localhost:3000 npm run test:wave1-acceptance`

Evidence file: `docs/wave1-acceptance-evidence.json` (written when the harness runs).

Until staging has the sim schema, the live harness correctly fails closed.

## Adversarial matrix

Offline / contract coverage:

- Expired, revoked, reused invitation gates
- Not-configured delivery is not “delivered”
- DA-01 analysis failure cannot become keyword scoring
- Candidate cannot invite; viewer cannot invite

Still requiring a live staging app:

- Failed invitation write
- Resend
- Refresh / offline / conflicting revision
- Duplicate submit (wired in the harness, not executed)
- Analysis failure persistence (`report_status=failed`)
- Report processing / missing evidence
- Revoked receipt URL 404
- Removed member loses access immediately
- Cross-organization report 403
- Empty workspace without Resend

## Visual approval

Public routes were captured at 1440 / 1280 / 1024 / 390 with reduced motion. 40 files, 0 failures, 0 console errors. Output: `docs/wave1-visual/`.

Inspected first viewports:

- Home 1440: text-above / full-width product, one primary CTA, five-item app chrome. Acceptable composition. Not signed — marketing scenes still need a side-by-side against the live workbench.
- Login 1440: form-only, recovery link, no value panel. Acceptable.
- Signup 1440: value panel + consent. Acceptable.
- Home 390: stacks; no dual marketing button cluster in the hero. Mobile product frames still need a human overflow check.

Not captured (blocked on staging): employer Home empty/populated, invite modal, workbench, report processing/failure, revoked receipt, menus, 200% zoom, keyboard-only pass, authenticated loading/error states.

“It changed” is not approval. Visual sign-off remains **unsigned**.

## Hiring managers

Protocol: `docs/wave1-hiring-manager-protocol.md`. Not executed. Wave 1 does not close without 3–5 unprompted sessions.

## Open issues

**P0**

1. `fydell-dev` lacks the simulation schema. The DA-01 loop cannot run.
2. Both recorded golden paths are unexecuted.
3. Live adversarial suite is unexecuted.

**P1**

1. Visual approval unsigned (authenticated surfaces not captured).
2. Hiring-manager paid-pilot test not run.
3. `organizations` RLS disabled on staging (do not enable without policies).
4. Product hero had a second button; changed to a quiet text link on this branch. Re-capture after staging is live.

**P2**

1. Workbench restyle is token-mapped, not a full control-system rewrite.
2. Marketing `/product` scenes still need a dedicated visual pass against the live workbench.

## Ship / no-ship

**NO-SHIP.** Contracts and unit gates are green. The one vertical slice is not yet undeniable in a production-equivalent environment. Do not start Wave 2 or the other 17 simulations until both golden paths pass twice, the adversarial suite passes, visual approval is signed, hiring-manager sessions are recorded, and no P0/P1 remains.
