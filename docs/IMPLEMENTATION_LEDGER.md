# Fydell Implementation Ledger

**Per master prompt §32.** Repository-native record of requirement → status → evidence.

**Status key:** `implemented` (code exists) · `verified` (observed working) ·
`in-progress` · `blocked` (external dependency) · `deferred` (intentionally later)

**Last updated:** 2026-10-05 (continued session)

**Verification status:** TypeScript passes clean (0 errors) as of 2026-10-05 15:20 EDT after installing the two declared-but-missing dependencies (@vercel/sandbox, fflate). `npm run build` succeeds. 103 deterministic tests passing across 11 suites (added CSRF guard: 10/10). No database, route, browser, or visual tests run — those remain blocked on Supabase keys and environment.

---

## Phase 0: Foundation (Master Prompt §§1-8)

| Requirement | Status | Code/Schema | Evidence | Blocker |
|---|---|---|---|---|
| §2 Frontend preserved | implemented | — | No visual redesign in this work; new components use existing patterns | — |
| §3 Core loop (9 stages) | implemented | 142 tables, 125 routes | Schema audit 2026-10-04 | Live verification blocked |
| §4 Conflict resolution | implemented | docs/master-prompt-phase0-audit.md | Documented | — |
| §6 Architecture (4 domains) | implemented | Existing schema | Schema map | — |
| §7 Independent engineer entry | implemented | /passport/new + ManualProjectForm | Code 2026-10-04 | DB test blocked |
| §7 Invited candidate entry | implemented | eng_invitations → eng_attempts | Route inspection | — |
| §7 Employer entry | implemented | /api/employer/* | Route inspection | — |
| §8 No-GitHub path | implemented | 040 migration, ManualProjectForm | 17 tests passing | DB test blocked |

## Phase 1: Assessment Transaction (Master Prompt §§14, 17, 18)

| Requirement | Status | Code/Schema | Evidence | Blocker |
|---|---|---|---|---|
| §14 Desktop lifecycle | implemented | Tauri app (existing) | Prior reports | Build test blocked (no GTK) |
| §17 Coworker coordinator | verified | src/lib/simulations/conversation/ | 56 tests passing | Live model blocked |
| §17 Assistance policy | verified | assistance.ts, assistance-guard.ts | 13 tests passing | — |
| §17 Grounding safeguards | verified | grounding.ts | 6 tests passing | Lexical, not semantic |
| §17 Partial failure recovery | implemented | state-builder.ts | 3 mocked tests | Real DB blocked |
| §18 Immutable submission | implemented | eng_submissions, submitAttempt() | Code inspection | Live test blocked |
| §18 Idempotent submit | implemented | alreadySubmitted check | Code inspection | — |

## Phase 2: Developer Value (Master Prompt §§9, 10)

| Requirement | Status | Code/Schema | Evidence | Blocker |
|---|---|---|---|---|
| §9 GitHub import (scoped) | implemented | /api/passport/github | Code inspection | — |
| §9 Fork/attribution labels | implemented | is_fork, contribution_statement | Schema | — |
| §10 Corrections (history preserved) | implemented | /api/passport/corrections | Code inspection | — |
| §10 Export (versioned) | implemented | /api/passport/export | Code inspection | — |
| §10 Manual projects (self-reported) | implemented | 040, ManualProjectForm | 17 tests | DB test blocked |

## Phase 3: Employer Flows (Master Prompt §§12, 13, 20, 21)

| Requirement | Status | Code/Schema | Evidence | Blocker |
|---|---|---|---|---|
| §12 Role intake (criteria screen) | implemented | /api/employer/role-intake | Code inspection | — |
| §12 Rubric freeze | implemented | Scenario version pinning | Code inspection | — |
| §13 Invitation lifecycle | implemented | eng_invitations | Code inspection | — |
| §20 Requirement-evidence mapping | implemented | mappings API, 5 statuses | Code inspection | — |
| §20 Report structure | implemented | eng_reports | Code inspection | Usefulness feedback new |
| §21 Follow-up thread | implemented | review_questions, ask/answer | Code inspection | — |
| §21 Targeted verification | implemented | 042, VerificationRequestPanel | Code complete | DB test blocked |
| §21 Human decision | implemented | eng_decisions (Advance/Hold/Decline) | Code inspection | — |
| §21 Report usefulness | implemented | 043, report-feedback.ts | Code complete | DB test blocked |

## Phase 4: Cross-Employer Reuse (Master Prompt §§11, 22)

| Requirement | Status | Code/Schema | Evidence | Blocker |
|---|---|---|---|---|
| §11 Scoped sharing | implemented | passport_shares, sim_receipt_shares | Code inspection | — |
| §11 Revocation | implemented | revoked_at, revoked_grants | Code inspection | — |
| §22 Receipt acceptance | implemented | 041, acceptReceiptShare() | Code complete | DB test blocked |
| §11/§29 Avoided work tracking | implemented | 044, avoided-work.ts | Code complete | DB test blocked |

## Phase 5: Commercial (Master Prompt §24)

| Requirement | Status | Code/Schema | Evidence | Blocker |
|---|---|---|---|---|
| Stripe checkout/portal/webhooks | implemented | /api/billing/* | Prior reports | Test mode only |
| Entitlements/usage ledger | implemented | subscriptions, billing_ledger_entries | Schema | — |

## New in This Build Session

| Item | Files |
|---|---|
| Configurable model provider (Ollama) | src/lib/ai/provider.ts + 6 migrated call sites |
| Manual projects (no-GitHub) | 040, 045, store.ts, view.ts, 2 API routes, ManualProjectForm.tsx, PassportView section |
| Receipt acceptance | 041, receipt-share.ts, 2 API routes, ReceiptAcceptance.tsx |
| Targeted verification | 042, review.ts, 4 API routes, VerificationRequestPanel.tsx, VerificationInbox.tsx |
| Report feedback | 043, report-feedback.ts, 1 API route |
| Avoided work | 044, avoided-work.ts (wired into 2 flows) |
| Artifact envelopes (§18) | 046, envelope.ts (wired into submission flow) |

## Blocked Items (Need Owner Action)

| Blocker | Minimum Action |
|---|---|
| Supabase access | Apply migrations 040-044; provide test DB credentials |
| Live model testing | Maahir running Ollama locally (done); test conversation via npm run dev |
| Desktop build | GTK libs on build machine or use CI |
| Visual verification | Browser access to local dev server |

## Deferred (Intentional)

| Item | Reason |
|---|---|
| Unified application entity | Refactor risk without live DB; chain works via invitation_id |
| Interview question change tracking | Needs product design input |
| Full ATS integration | §23 says minimal handoff first; not built |
| ML engineering track | §16 conditional; not enabled |
| Broad rate limiting (SEC-08) | Utility exists (`src/lib/security/rate-limit.ts`); applied to 3 critical routes. Broad rollout needs middleware approach, not piecemeal. |

## Release Checklist Audit: DATA + SEC (2026-10-05)

Audited via subagent against `~/workspace/user/files/Fydell-Paid-Release-Checklist.md`.

| ID | Status | Notes |
|---|---|---|
| DATA-01 | implemented | 142 tables, 44 migrations |
| DATA-02 | implemented | RLS + visibility boundaries |
| DATA-03 | implemented | 339 FKs, 101 unique, 269 checks |
| DATA-04 | implemented | SHA pinning, version columns |
| DATA-05 | implemented | 34 files with RLS, 143 policies |
| DATA-06 | implemented | Private buckets, signed URLs |
| DATA-07 | partial | Destructive statements in 2 migrations; no staging test evidence |
| DATA-08 | **missing** | No backup/restore drill |
| DATA-09 | implemented | Retention schedule, data-rights state machine |
| DATA-10 | partial | Indexes exist; no latency monitoring |
| SEC-01 | implemented | DATA_FLOWS.md |
| SEC-02 | partial | Docs exist; counsel review required |
| SEC-03 | partial | No DPA/subprocessor list |
| SEC-04 | partial | No minimization policy doc |
| SEC-05 | implemented | No hardcoded secrets; secure cookies |
| SEC-06 | partial | 62/133 routes use helpers; no abuse test evidence |
| SEC-07 | partial | **No CSRF code found** |
| SEC-08 | partial | Rate limit on 5 routes; missing on AI/upload/invite |
| SEC-09 | implemented | Data subject requests |
| SEC-10 | implemented | Revocation enforced |
| SEC-11 | partial | Cannot verify from code |
| SEC-12 | partial | INCIDENT_RESPONSE.md exists; no drill records |

**Biggest gaps:** DATA-08 (backup/restore), SEC-07 (CSRF), SEC-08 (rate limit coverage).

## Release Checklist Audit: UX + AUTH (2026-10-05)

Audited via subagent. Static analysis only; behavioral verification needs live env.

| ID | Status | Notes |
|---|---|---|
| UX-01 | implemented | Distinct signup paths, role routing |
| UX-02 | implemented | Work-oriented dashboards, no financial graphs |
| UX-03 | partial | Primary actions exist; full coverage needs render inspection |
| UX-04 | partial | Sampled controls wired; full surface needs rendering |
| UX-05 | implemented | Queue states, idempotent submission |
| UX-06 | partial | Error components exist; input preservation not verified |
| UX-07 | partial | ARIA labels, focus styles; no full a11y audit |
| UX-08 | partial | Desktop targets declared; no browser/mobile verification |
| UX-09 | implemented | Idempotency keys, double-click safe |
| UX-10 | partial | Search param exists; pagination not verified |
| AUTH-01 | implemented | Signup/signout/reset flows |
| AUTH-02 | implemented | HMAC OAuth state; live round-trip needs testing |
| AUTH-03 | implemented | Server-generated org IDs |
| AUTH-04 | implemented | 5-role permission matrix |
| AUTH-05 | implemented | SHA-256 tokens, 14-day TTL, email-bound |
| AUTH-06 | partial | Soft removal; session revocation not verified |
| AUTH-07 | partial | MFA opt-in via env, not default |
| AUTH-08 | **missing** | No customer-facing MFA |

**Counts:** 11 implemented, 8 partial, 1 missing.
**Note:** PARTIAL mostly reflects static-analysis limits, not confirmed gaps.

## Session Fixes (2026-10-05, continued)

| Fix | Files | Status |
|---|---|---|
| SEC-07 CSRF protection | src/lib/security/csrf.ts (new), applied to 6 POST routes | implemented, 10/10 tests passing |
| Report-feedback org binding | src/lib/eng/report-feedback.ts | implemented — now rejects cross-org report IDs |
| Verification role ownership | src/lib/employer/review.ts (requestVerification) | implemented — role must belong to org |
| Verification mapping binding | src/lib/employer/review.ts | implemented — mapping must match org/role/share |
| Avoided-work idempotency | src/lib/pilot/avoided-work.ts, migration 044 | implemented — unique key, upsert, no-ops on repeat |
| mapping_accepted wiring | src/lib/employer/review.ts (upsertMapping) | implemented — records on transition to accepted |
| Manual project versioning | src/lib/passport/store.ts, migration 045 (bump_manual_project_version RPC) | implemented — corrections bump version, refresh checked_at |
| VerificationInbox mounted | src/app/app/candidate/page.tsx | implemented |
| ReceiptAcceptance mounted | src/app/app/employer/evidence/page.tsx | implemented |
| Submission envelope org context | src/lib/eng/submissions.ts | implemented — envelope now carries org for RLS visibility |

**Still blocked:** Database tests (need Supabase keys), route integration tests, browser/visual tests, migration application (034, 040-046).

| SEC-08 rate limit expansion | src/app/api/sim/sessions/[id]/messages/route.ts, uploads, admin/invite | implemented — AI chat 30/hr, uploads 20/hr, invites 10/hr |

| §21 employer follow-up thread | src/lib/employer/review.ts (askQuestion, answerQuestion), questions API route | implemented — ask/answer/list for candidate; timestamps/authorship preserved |
| §24 webhook deduplication | src/lib/billing/webhook.ts | implemented — event log dedupes before handling |
| §18 submission idempotency | src/lib/eng/submissions.ts | implemented — existing check + 23505 race handler |
| §28 operations queue | src/app/admin/(ops)/repair | implemented — retry actions for failed email, stuck reports |

| §23 Apply with Fydell | — | **missing** — no employer job page → Fydell handoff flow exists. Needs minimal documented handoff behind config. |

| §13 invitation lifecycle | src/lib/eng/invitations.ts | implemented — draft/issued/accepted/expired/revoked/declined, resend guards |

| §30 required journeys (18) | various | not run — blocked (no live Supabase, no desktop build, no browser access to dev) |

## 2026-10-05 master prompt session summary

Sections addressed:
- §5 baseline verified before editing (git status/diff/log checked)
- §7 auth: CSRF guard added to sim chat (SEC-07 partial)
- §8-11 engineer value: manual projects, GitHub ingestion, passport claims, sharing — implemented, migrations 040/045/046 unapplied
- §12 org setup: role/rubric creation implemented
- §13 invitations: lifecycle implemented
- §14-17 desktop/sim: invitation lifecycle, simulation pedagogy preserved
- §18 submissions: artifact envelopes, idempotency
- §19-21 analysis: report feedback, employer follow-up implemented (binding fix needed)
- §22 receipts: receipt acceptance UI mounted
- §23 Apply with Fydell: missing (noted)
- §24 billing: idempotency implemented
- §28 privacy/security: rate limits expanded (SEC-08 partial), CSRF guard (SEC-07 partial)
- §30 testing: 103 deterministic tests pass; 18 required journeys not run (blocked: no live Supabase, no desktop build, no browser to dev)

Known defects requiring fix before release:
1. Migration 045 RPC allows any authenticated user to bump any project's version (no ownership check) — FIXED 2026-10-05: RPC now verifies auth.uid() owns the project via passport before incrementing
2. Report feedback not bound to route attemptId (cross-attempt mismatch possible) — FIXED 2026-10-05: submitReportFeedback now accepts attemptId and rejects mismatched reports; route passes attempt.id
3. Avoided-work idempotency may not work with Supabase partial unique index
4. Rate limits are in-memory (per-instance, not distributed)
5. CSRF guard allows missing Origin; not applied to all mutation routes
6. Migrations 034, 040-046 unapplied/unverified
7. TypeScript: 7 known errors (stale .next, missing @vercel/sandbox, missing fflate) — FIXED 2026-10-05: npx tsc --noEmit passes clean after installing declared dependencies
