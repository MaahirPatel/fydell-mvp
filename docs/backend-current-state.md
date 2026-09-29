# Backend current state (audit, 2026-09-29)

Audit of `main` at `f6087ae` against the backend and simulation master prompt
(2026-09-29). Branch for this work: `backend/master-prompt-2026-09-29`.
Observed facts are marked **observed**; anything not run here is marked
**not verified**.

## Stack actually present

| Layer | What exists | Status |
| --- | --- | --- |
| Web + API | Next.js 16 (App Router), TypeScript, route handlers under `src/app/api/**` | observed; `tsc` clean |
| Database | Supabase Postgres, 38 numbered migrations (39 with this branch), RLS helpers `is_organization_member` / `has_organization_role` | observed in source; no live DB in this session |
| Execution | `src/lib/engineering/` providers: Vercel Sandbox snapshot, a gVisor worker (`services/engineering-runner`), and a local dev-only provider | observed; local provider run on Windows |
| Desktop | Tauri 2 + React + Monaco (`desktop/`), Rust modules for auth, sync, execution, submission, recovery | source read; native build not run |
| Python/FastAPI | **Not present.** The intended FastAPI service was never built; Python exists only inside scenarios and the runner bootstrap | observed |

## The main structural finding: six overlapping assessment systems

The schema has ~160 tables. At least six generations of "assessment" coexist:

| Generation | Tables | Used by today |
| --- | --- | --- |
| Pilot | `pilot_*` | legacy pilot flows |
| FDE marketplace | `fde_*` | legacy |
| Simulation v0 | `simulations`, `simulation_*` | legacy |
| Proof graph | `proof_*`, `sim-engine` browser sandbox | `/app/employer/proof`, applied-AI prototype |
| Milestone 1 web loop | `eng_*` (14 tables, forced RLS) | `/assess/*`, `/app/employer/engineering`, ZIP upload, `backend-webhook-retry` scenario |
| Desktop simulation | `sim_*` | **the desktop app** (`/api/sim/*`), employer invites via `EMPLOYER_INVITABLE_SLUGS`, `webhook-retry-incident` scenario |

Two of these assess the **same backend webhook incident** in parallel:
`eng_*` + `scenarios/backend-webhook-retry` (web, ZIP upload) and `sim_*` +
`scenarios/webhook-retry-incident` (desktop, remote runs). They have separate
invitations, reports, review queues and environment variables
(`FYDELL_EXECUTION_SNAPSHOT_ID` for `eng_*`, `FYDELL_ENGINEERING_SNAPSHOT_ID`
+ `FYDELL_EXECUTION_PROVIDER` for `sim_*`).

**Decision taken for this work:** the prompt's primary route is the Windows
desktop, and the desktop only speaks `/api/sim/*`. All new backend work
attaches to `sim_*`. No new parallel subsystem was created. Consolidating
`eng_*` into `sim_*` (or retiring it) needs a product decision; see the plan.

## Connected workflow today (desktop path)

| Step | Implementation | Evidence |
| --- | --- | --- |
| Employer picks a scenario | `getEmployerCatalog` lists published `sim_templates` in `EMPLOYER_INVITABLE_SLUGS` | source |
| Invite | `sim_invitations` pinned to `template_version_id` (freezes content) | source |
| Desktop sign-in | system browser → one-time code → `/api/auth/desktop/exchange`; tokens in OS keychain (`keyring`) | source; `test:desktop-auth` passes |
| Deep links | `tauri-plugin-deep-link` + single-instance (0.1.4) | source only |
| Consent, preflight, start | `/api/sim/sessions/[id]/{consent,preflight,start}` | source |
| Starter delivery | `buildScenarioPackage` allowlist (hidden tests never packaged) | observed in validator |
| Edit + sync | Rust `sync.rs`: durable journal, `saved_local → syncing → synced / sync_failed / conflict`, CAS on `sim_session_state.revision` | source |
| Practice runs | `POST /runs` bound to `candidate_snapshot_hash`; stale-result label in desktop | observed via validator + `test:engineering` |
| Team messages | `sim_messages`, idempotent on `client_msg_id`; authored replies with optional AI redraft; outage policy extends time | source; `test:sim-chat*` pass |
| Requirement update | `maybePresentCurveball`: server milestone, fair response window, idempotent; also posted into the Team thread | source |
| Submit | immutable `sim_submissions`, receipt recovery via `/finalize` | source |
| Evaluation | protected hidden tests on the accepted snapshot; canary tamper detection; infra errors never scored | observed (validator, 17/17) |
| Human QA hold | `sim_report_reviews` + `/admin/reviews` (AI-12) | source; `test:engineering` passes |

## Gaps against the prompt (what needs to improve)

Ordered by release impact. "Done here" means fixed on this branch.

### Release-blocking

1. **Scenario bytes depended on the checkout OS.** With `core.autocrlf=true`,
   Windows checked scenario files out with CRLF, so the package, its hash and
   test behaviour differed from Linux/Vercel. The validator's infinite-loop
   check silently tested nothing on Windows. **Done here:** `.gitattributes`
   forces LF for `scenarios/**`; validator now 17/17 on Windows.
2. **No scenario validation lifecycle.** `sim_templates.status` is only
   `draft | published | archived`; there was no record of automated checks,
   expert review, reviewer, date or evidence, and nothing stopped automated
   checks from counting as approval. **Done here:** migration 039 +
   `src/lib/scenario-catalog/lifecycle.ts`.
3. **The webhook scenario is invitable before expert review (SCEN-09).**
   It is now labelled `pilot_unreviewed` with a disclosure in the catalog and
   intake responses. Whether to keep selling it before review is a product
   decision; it is not hidden.
4. **Automatic recommendation in employer reports.** `sim_analysis_runs.recommendation`
   (`advance | review | further_evidence_required`) is returned by
   `GET /api/sim/sessions/[id]/report`. The prompt forbids automatic
   hire/reject outcomes. Not changed here because the employer UI reads it;
   needs a coordinated change with the frontend owner.
5. **Snapshot variable mismatch between the two runners** (see above).
   **Not verified** whether Production has `FYDELL_ENGINEERING_SNAPSHOT_ID`
   and `FYDELL_EXECUTION_PROVIDER`; if not, desktop runs are `not_configured`.

### Important

6. **No employer role intake.** `POST /api/employer/roles` validated a role
   but did not persist it (`persisted: false`). **Done here:**
   `/api/employer/role-intake` with screening, recommendations and
   `role_requests` for unsupported roles.
7. **No event replay cursor.** Clients polled whole message lists; there was
   no way to fetch missed events after reconnect. **Done here:**
   `GET /api/sim/sessions/[id]/events?after=<seq>`.
8. **Only one role family exists.** No blueprints for the other 13 families.
   **Done here:** typed blueprints for all 14 (`docs/scenario-catalog.md`).
9. **Deadline extension is read-modify-write.** `extendSessionEndsAt` reads
   `ends_at` then writes it; two concurrent extensions (connectivity credit
   and fair window) can lose one. Needs an atomic `update … set ends_at =
   ends_at + interval` RPC.
10. **Attempt states are coarse.** `sim_sessions.status` has no `withdrawn`,
    `expired`, `provisioning` or `submission_pending`; withdrawal and expiry
    are implied by timestamps. The prompt's attempt machine is not enforced.
11. **Finding schema is score-shaped.** `sim_competency_results` stores bands
    and numeric scores; there is no `demonstrated / partial / not_demonstrated
    / insufficient_evidence` outcome with `evidence_refs`, observed/inferred
    and reviewer status per finding. The `eng_*` path has cited findings
    (`src/lib/eng/citations.ts`); the `sim_*` path does not.
12. **Messages are ordered by `created_at`,** not a server sequence; two
    inserts in the same millisecond can reorder.
13. **Lint is not clean on `main`:** 40 errors before this branch. **Done
    here:** the 18 in backend/test code. 22 remain, all in desktop and
    marketing UI components owned by the frontend contributor (listed in
    `docs/backend-verification.md`).

### Environment (this Windows workstation)

- Node.js and Python were not installed; `node_modules` was absent. Every
  earlier "tests pass" claim came from other machines. Installed Node 24.19
  and Python 3.12.10 (user scope) to verify.
- `python3` is the Microsoft Store stub on Windows. Scripts that hard-coded
  `python3` now honour `FYDELL_LOCAL_PYTHON`.

## What was not inspected in depth

Stripe billing internals, the GitHub passport extractor, the proof graph and
the marketing site were read only far enough to confirm they exist. The Rust
desktop code was read, not compiled.
