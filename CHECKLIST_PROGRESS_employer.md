# Checklist progress — chunk-employer (EMP / REP / BUY + E2E-03, E2E-12)

Branch: feature/desktop-sim-client. Date: 2026-09-27.
Authoritative checklist: ~/workspace/fydell/RELEASE_CHECKLIST.md.

Rule libs live in `src/lib/invitations/`, `src/lib/employer/`, `src/lib/reports/`
(pure functions + injectable stores; no server-only imports). Thin API routes
in `src/app/api/employer/` enforce the same rules. All state rules are
covered by in-process tests with fakes:
`scripts/test-employer-grind-{invitations,decisions,reports,roles,e2e,buyer-promise}.ts`.

Where a route needs Supabase persistence it is marked NEEDS-LIVE in the
route file; the rules themselves are DONE-TESTED.

| ID | STATUS | one-line note |
|---|---|---|
| EMP-01 | DONE-TESTED | `defineRole` captures family/stack/responsibilities/criteria with bounded fields; `POST /api/employer/roles` validates (DB table still NEEDS-LIVE) |
| EMP-02 | DONE-TESTED | `assembleAssessmentPreview` builds instructions/tools/effort/rubric/scope/example-report from pinned scenario content; tested |
| EMP-03 | DONE-TESTED | Invites pin scenario+rubric version ids; attempt content always resolves the pinned version; missing pinned version fails closed (no silent upgrade); tested |
| EMP-04 | DONE-TESTED | `classifyCustomization` allows contextual edits, blocks substantive edits from release until tests/rubric revalidated; tested |
| EMP-05 | DONE-TESTED | Email validated/normalized; duplicates return the existing invite (no second charge); creation never sends — deliberate `send` only; delivery status tracked; token hashed; tested |
| EMP-06 | DONE-TESTED | 11 states with defined meanings; `transitionInvitation` enforced server-side; illegal jumps and terminal-state transitions rejected; tested |
| EMP-07 | DONE-TESTED | Resend reuses the same invitation row (sendCount+1, attempt untouched); revoke/extend audit-logged with actor+time; tested |
| EMP-08 | DONE-TESTED | Advance/Hold/Decline recorded with actor/time, append-only history with supersede; decision path has no mailer — cannot notify candidates (tested with spy); `POST /api/employer/sessions/[id]/decision` persists to sim_employer_decisions |
| REP-01 | DONE-TESTED | `assembleDecisionBrief` builds strengths/gaps/limitations/follow-ups from real artifacts only; tested |
| REP-02 | DONE-TESTED | `findingLink`/`resolveAnchor` give every finding a stable deep link to its source; anchors resolve losslessly; tested (UI rendering is design-chunk work) |
| REP-03 | DONE-TESTED | Four separated categories (coding/interpretation/communication/infrastructure), conservative per-category bands; `assertNoGlobalScore` guard rejects any hireability aggregate; tested |
| REP-04 | DONE-TESTED | Identifier-checked publish; corrections create immutable versioned updates; identity changes rejected; tested |
| REP-05 | DONE-TESTED | Private notes persist and are stripped from candidate-safe views; finding flags with correction requests; decision history durable; tested |
| REP-06 | DONE-TESTED | `canViewReport` allows owner/admin/reviewer of the same org; denies billing-only, other-org, unauthenticated, and the candidate; export inherits; tested |
| REP-07 | DONE-TESTED | Scoped `report_view` share tokens (hashed, expiring, revocable); grant carries no broader capability; tested |
| REP-08 | DEFERRED-P1 | Downstream outcome tracking needs real customers + retention controls; no demand yet |
| BUY-01 | DONE-TESTED | Supported role (Backend Engineer, webhook incident), replaced hiring step, reviewer defined in docs/BUYER_PROMISE.md; doc-check test |
| BUY-02 | DONE-TESTED | Service promise documented (candidate time, turnaround, volume, support, limits, deliverables); doc-check test |
| BUY-03 | DONE-TESTED | Billable event = package of completed evaluations; failed infra runs never silently consume credits; doc-check test |
| BUY-04 | MANUAL-OK | Hiring-manager sample-report review protocol documented; needs a real human review |
| BUY-05 | MANUAL-OK | Work-saved measurement protocol documented (manual review labor logged separately); needs a real pilot |
| BUY-06 | DONE-TESTED | "What is NOT promised" section (no job-performance prediction, no guaranteed hires, no cheat-proofing, no universal coverage, no hireability/cultural-fit scores); forbidden-claim scan test |
| BUY-07 | MANUAL-OK | Repeat-demand CRM log schema documented; needs real buyers |
| E2E-03 | DONE-TESTED | Fresh employer: define role → preview → create (no send) → deliberate send → right recipient/scenario+rubric versions; in-process journey test |
| E2E-12 | DONE-TESTED | Reviewer follows finding to source, adds private note, records decision; accurate report, durable decision, zero candidate messages; in-process journey test |

## Test totals (all passing, 2026-09-27)

- test-employer-grind-invitations.ts: 64
- test-employer-grind-decisions.ts: 35
- test-employer-grind-reports.ts: 35
- test-employer-grind-roles.ts: 20
- test-employer-grind-e2e.ts: 19
- test-employer-grind-buyer-promise.ts: 23
- Total: 196 checks, 0 failures.

## tsc --noEmit

Pass for all chunk files. (Repo-wide run surfaces only pre-existing stray
`narrow*.tmp.ts` probe files from parallel work, unrelated to this chunk.)

## Notes for parent

- Did NOT touch: pages/design, `src/lib/orgs/invitations.ts` (accounts
  chunk), submission email outbox (commit 6188301), package.json.
- Did NOT commit.
- `src/app/api/employer/_lib/employer-stores.ts` marks Supabase store
  persistence NEEDS-LIVE; invitation/decision/report rules are lib-enforced
  and tested.
- No stats, testimonials, hiring predictions, or cultural-fit scores were
  introduced anywhere. The buyer promise doc explicitly disclaims them.
