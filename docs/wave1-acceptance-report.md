# Wave 1 acceptance report — wave1-rc1

**Branch:** `wave1-rc1`  
**Release candidate:** `wave1-rc2`, the database security fix. `75c177b` is the historical rc1; first freeze was `ec9e6b6`. See `docs/wave1-rc.md`.  
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
| `organizations` RLS: anon, candidate, outsider and removed member cannot read or write | Pass (live matrix on fydell-dev, `023`) |
| `scenario_events_candidate` respects base-table RLS and is not a write path | Pass (live matrix on fydell-dev, `023`/`024`) |
| Authored content, answer keys, scoring fixtures and evaluator-only fields unreachable below `service_role` | Pass (live matrix on fydell-dev) |
| Migration source cannot regress either finding | Pass (`npm run test:db-security`, 17 checks) |
| Server refuses a key/URL project mismatch, a public service key, or production without opt-in | Pass (`npm run test:project-guard`, 11 checks) |

## What is not proven

| Gate | Result | Severity |
|---|---|---|
| Fresh non-production DB with production-equivalent sim schema | **Applied on fydell-dev**, security verified; config not proven | P0 remaining: staging config / live app |
| Fresh golden path (signup → revoke) | **Not executed** | P0 |
| Recovery golden path | **Not executed** | P0 |
| Live adversarial matrix | **Not executed** | P0 |
| Formal visual sign-off | **Public pages captured, not signed** | P1 |
| Hiring-manager paid-pilot test | **Not run** | P1 |

## Staging

Two Supabase projects exist in the Fydell org:

- `fydell` (`qtrhwrcxthtqvkeerptp`) — production. Untouched. Do not reset. Do not seed.
- `fydell-dev` (`btbmvrvynnrhapjdkunz`) — **migrations 001–022 applied**. DA-01 fixture published (`ops-yield-investigation` / `northline-ops-yield@3.0.0`). Record: `docs/wave1-staging-apply-record.md`.

Schema-equivalent is not configuration-equivalent. Auth redirects, Resend, storage, jobs, and analysis env still need a staging-only check. `.env.local` is production and must not be loaded for writes.

API smoke and both golden paths are still blocked: there is no fydell-dev service-role key in `.env.staging.local`, and the Supabase CLI is not logged in. Create owner / member / candidate / outsider accounts through the product after that key exists. Do not copy the production service-role key. The service-role key is for narrowly scoped server operations only; it bypasses RLS, so it must never back a smoke test, a golden path or an RLS acceptance check.

Both P0 database findings are **closed and verified** by migrations `023` and `024`, applied to `fydell-dev` only. `public.organizations` now has RLS enabled and forced with member-read-only access and no client write policy; `public.scenario_events_candidate` is `security_invoker = true`, revoked from `anon` and read-only for `authenticated`. Verification, including the full anonymous / owner / member / candidate / outsider / removed-member read and write matrix, is in `docs/wave1-db-security-verification.md`. Supabase security advisors now report no ERROR-level finding.

Email: leave Resend unset for the empty-workspace / not-configured case. Use a sandbox key only when testing `sent`.

## Golden paths

Required twice, no SQL edits, no status patches:

1. Fresh: signup → workspace → invite → email/link → consent → DA-01 → autosave → curveball → revise → submit → analysis → report → receipt → revoke
2. Recovery: refresh, brief offline, resume, retry failed save, double-click Submit, reopen report

Harness: `WAVE1_LIVE=1 GOLDEN_PATH_BASE_URL=http://localhost:3000 npm run test:wave1-acceptance`

Evidence file: `docs/wave1-acceptance-evidence.json` (written when the harness runs).

The sim schema is on fydell-dev. The live harness still fails closed until the app runs on `.env.staging.local` with a fydell-dev service-role key.

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

1. Live API smoke cannot start: staging auth, redirect URLs, storage and the analysis provider are not configured, and the fydell-dev service-role key is not available to the app (CLI not logged in; MCP does not expose it). Schema is applied and its security is verified; configuration is not.
2. Both recorded golden paths are unexecuted.
3. Live adversarial suite is unexecuted.

The two database P0s previously listed here are closed. See `docs/wave1-db-security-verification.md`.

**P1**

1. Visual approval unsigned (authenticated surfaces not captured).
2. Hiring-manager paid-pilot test not run.
3. Product hero had a second button; changed to a quiet text link on this branch. Re-capture after staging is live.
4. Real invitation delivery is unproven. Resend unset honestly yields `not_configured`, which is the empty state, not evidence that email works. A staging email-provider path must be tested end to end before the GlobalFoundries pilot; copied invitation links are acceptable only for the first golden path.
5. `FYDELL_ALLOW_PRODUCTION_DB=true` must be set in the production environment before the next production release. rc2 puts the production project on an explicit denylist and the server otherwise refuses to build its Supabase clients. Deliberate and fail-closed, but it will break a deploy that forgets it.

**P2**

1. Workbench restyle is token-mapped, not a full control-system rewrite.
2. Marketing `/product` scenes still need a dedicated visual pass against the live workbench.
3. Default privileges in `public` grant `ALL` on every new table to `anon` and `authenticated`, so RLS is the only thing denying writes on most `sim_*` tables. Verified holding, but a migration that creates a table and forgets RLS would be exposed on landing. Tighten the defaults before the pilot.

## Ship / no-ship

**NO-SHIP.** Contracts and unit gates are green. The one vertical slice is not yet undeniable in a production-equivalent environment. Do not start Wave 2 or the other 17 simulations until both golden paths pass twice, the adversarial suite passes, visual approval is signed, hiring-manager sessions are recorded, and no P0/P1 remains.
