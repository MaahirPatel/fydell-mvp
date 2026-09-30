# Backend implementation plan

Follows the master prompt's phases. Status as of 2026-09-29 on branch
`backend/master-prompt-2026-09-29`. Items marked **decision** need the
founders before code changes.

## Phase 1 — audit, contracts, catalog

| Item | Status |
| --- | --- |
| Inspect architecture and record facts | done: `docs/backend-current-state.md` |
| Shared contract for the frontend | done: `docs/frontend-backend-contract.md` |
| Typed catalog of all 14 families with truthful statuses | done: `src/lib/scenario-catalog/`, `docs/scenario-catalog.md` |
| Validation lifecycle in code and database | done: `lifecycle.ts`, migration 039 (not yet applied anywhere) |
| Employer role intake, screening, recommendations, role requests | done: `/api/employer/role-intake` |
| Event replay by server cursor | done: `GET /api/sim/sessions/[id]/events` |
| Deterministic scenario bytes across OSes | done: `.gitattributes` |

## Phase 2 — backend role end to end (next)

Exit: a controlled employer creates a role and invites; a Windows candidate
opens the assignment, edits, runs tests, messages, receives the update and
submits; the employer sees reviewed evidence.

1. **decision: one engineering system.** Retire `eng_*` + `/assess/*` or
   migrate it into `sim_*`. Until then both must be kept working and their
   environment variables set separately.
2. Apply migration 039 to fydell-dev, then write the backend version's
   automated-validation review record (`docs/scenario-authoring.md`).
3. Link intake → invitation: add `sim_invitations.intake_id`, set
   `employer_role_intakes.frozen_at` and `selected_template_version_id`
   on the first invitation, and have the invite UI start from an intake.
4. Atomic deadline extension RPC (replace read-modify-write in
   `extendSessionEndsAt`), with a concurrent-extension test.
5. Explicit attempt states: add `withdrawn`, `expired`, `submission_pending`
   to `sim_sessions.status` with a transition trigger; employer revoke and
   extend write events both views read.
6. Server sequence on `sim_messages` (identity column) and use it for order
   and for the replay's `message_*` follow-up fetch.
7. Desktop: call the replay endpoint on wake/reconnect (minimal wiring in
   `desktop/src-tauri/src/platform.rs`; UI owned by the frontend).
8. Confirm Production has `FYDELL_EXECUTION_PROVIDER` and
   `FYDELL_ENGINEERING_SNAPSHOT_ID`; otherwise desktop runs are
   `not_configured`.
9. Live rehearsal on fydell-dev with test accounts
   (`docs/ENGINEERING_ASSESSMENT_RUNBOOK.md`), including network loss during
   submit and a concurrent second desktop session.

## Phase 3 — more validated role packages

Order from the catalog priority: full-stack and FDE, then frontend and
applied AI, then the rest. Each needs its own starter, protected tests,
fixture matrix and validator pass (`docs/scenario-authoring.md`). Runner
work that unblocks several families at once:

- Node 22 alongside Python in the runner image (full-stack, frontend);
- allowlisted loopback fixture endpoints (FDE, QA);
- C/C++ toolchains (embedded, game);
- device/emulator execution (mobile) and GPU (none planned) stay blocked.

## Phase 4 — evidence quality and portability

1. Finding table on `sim_*` with the schema in
   `docs/evaluation-validation.md`; overrides append with reasons.
2. Citation resolver and contradiction checks against runs and messages.
3. **decision:** remove `recommendation` from the employer report API and UI.
4. Calibration set (about 20 cases, dev and held-out splits) before any
   model-assisted review.
5. Passport: application-time evidence snapshots, and a two-employer scoped
   sharing test (employer A cannot see employer B's application or notes).

## Phase 5 — reliability and release evidence

Failure injection (worker restart, provider timeout, resource exhaustion),
a clean-machine Windows install, backup restore, data lifecycle requests,
and a release report listing supported roles, manual operations and
unverified claims.

## Not doing without authorization

Applying migrations to production, deploying, sending real email, charging
cards, publishing a scenario, or using customer data in tests.
