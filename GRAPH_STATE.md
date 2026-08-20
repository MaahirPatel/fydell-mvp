# GRAPH_STATE

Statuses: `NOT_STARTED` | `IN_PROGRESS` | `BLOCKED` | `TESTING` | `COMPLETE` | `FAILED_GATE`

This file tracks the isolated Solutions Engineer walking skeleton only.
`proof_*` is deployed to the `fydell-dev` project; no production simulation,
report, or `sim_session_events` write path is used.

| Node | Status | Notes |
|---|---|---|
| G0 Product contract | COMPLETE | Find → Prove → Match. SE wedge. No ATS. No Fydell Score. |
| G1 Architecture | TESTING | Isolated Next.js lab path invokes a narrow Python worker. No production simulation/report paths changed. |
| G2 Data | TESTING | All 24 `proof_*` tables are deployed on `fydell-dev`. A service-role golden-path adapter maps runs, events, artifact revisions, both claims and provenance, defense, the current idempotent job, and the brief. **Implemented, not live-proven:** `FYDELL_DEV_SERVICE_ROLE_KEY` and `FYDELL_DEV_DB_URL` in `.env.local` are still placeholders, and the persistence script never loads `.env.local`. The round-trip gate skipped. |
| G3 Security | TESTING | A rollback-only live test covers cross-org isolation, candidate denial for unpublished claims, employer access after publication, all INSERT/UPDATE/DELETE attempts on events/jobs/claims, and anon denial. **The gate skipped** (`FYDELL_DEV_DB_URL` not a real connection string). Those runtime properties are not proven in this pass. Python still has no database authority. Migration-source contracts for org RLS still pass. |
| G4 Role calibration | NOT_STARTED | Sprint 1 intentionally uses one hardcoded SE role. |
| G5 Simulation runtime | TESTING | Minimal deterministic walking-skeleton state machine only. Fixture/runtime tests passed. |
| G6 Agents | NOT_STARTED | Deferred to Sprint 2. |
| G7 Changed facts | TESTING | `AUTH_001` releases deterministically after the preliminary recommendation. Later facts remain specification-only. Proven against the in-memory skeleton and Python worker, not against a live ledger. |
| G8 Event ledger | TESTING | The live gate checks that a supplied sequence is overwritten and uses five concurrent connections against one run to require `[1,2,3,4,5,6]`. **Skipped** without a real `FYDELL_DEV_DB_URL`. Sequence assignment, concurrency, sustained load, and crash recovery are unproven by the rerunnable gate. |
| G9 Workspace + artifacts | TESTING | Before-fact and after-fact revisions have a durable `proof_artifact_versions` adapter. Browser localStorage remains the UI's development persistence until the adapter is wired into a server boundary. Adapter write-back to `fydell-dev` is unproven. |
| G10 Oral defense | TESTING | Pass A emits defense questions, the candidate answers them as recorded candidate events, and the run cannot reach review without a complete defense. Proven against the Python worker + in-memory run, not a live `proof_*` row. |
| G11 Evidence engine | TESTING | Two passes run against the real Python worker. Pass A returns a provisional claim plus defense questions; Pass B re-reads the run with the defense and can move direction and confidence. A hollow defense fails to reach the Pass A claim. No numeric score. |
| G12 Human review | TESTING | Publication is gated on an explicit reviewer approval and note. Only a Pass B claim is reviewable. Skeleton-tested, not live-DB-tested. |
| G13 Decision brief | TESTING | One minimal brief is generated from the approved claim in the skeleton. |
| G14 Shortlist | NOT_STARTED | Outside Sprint 1. |
| G15 Candidate record | NOT_STARTED | Data/UI deferred. |
| G16 Outcomes | NOT_STARTED | Validation dataset deferred. |
| G17 Analytics | NOT_STARTED | Production observability waits on durable jobs. |
| G18 Testing | TESTING | Walking-skeleton contract test covers both passes and the pass-crossing guardrail. A–D evaluator fixtures exist in `proof/fixtures.ts` and are asserted by `npm run test:proof` (contracts only in this pass). Auth public-surface probe: `npx tsx scripts/test-auth-flows.ts`. |
| G19 Pilot gate | BLOCKED | Schema exists on `fydell-dev`. Credentialed sequence/RLS/persistence gates did not run. Real employer signup cannot complete until a real `SUPABASE_SERVICE_ROLE_KEY` / `FYDELL_DEV_SERVICE_ROLE_KEY` is present. Queue recovery and sustained-load testing remain required. |

## Auth (this pass)

Do not read this as “sign-in works in production.” What was actually observed:

| Flow | Verdict | How determined |
|---|---|---|
| Public `/signup`, `/login`, `/forgot-password`, `/auth/link-invalid`, `/auth/confirmation-required` | Works (pages load) | Playwright against `http://127.0.0.1:3000` |
| Employer signup creating an Auth user + org | Broken until credentials | `/api/auth/signup` returns 503 because the service-role value is a placeholder, not a JWT/`sb_secret_` key. This is fail-closed on purpose so a placeholder cannot create orphan Auth users. |
| `/onboarding/employer` creating a workspace | Could not verify happy path | Anonymous visitors are now redirected to login (layout). Creating an org still needs a signed-in user **and** a real service-role key. |
| `/login` + `next=` | Partial | Form loads; `next=/app/employer/candidates` stays in the URL; external `next=` is dropped. Unknown password returns 401 against live fydell-dev Auth (anon key is real). A successful password login was **not** observed — no test account. |
| Session persistence / server-component session | Could not verify | Requires a successful sign-in. |
| Sign out | Partial | `GET /api/platform/logout` redirects to same-origin `/login`. Browser Sign out after a real session was not exercised. |
| Forgot-password email actually arriving | Could not verify | API returns the generic success payload. Sending a recovery email needs service role + Resend; those were not live-proven. |
| Invite accept signed-out / signed-in | Partial | Invalid token renders the dead-link page. A real token accept was not run (no service role to mint or look up invitations). |
| Route protection `/app/employer` | Could not verify on :3000 | `npm run dev:preview` sets `FYDELL_UI_PREVIEW=1`, which serves synthetic employer data to anyone. Next 16 refused a second dev server on another port (lock on PID of :3000). Layout **does** redirect when preview is off; that was not observed in a live non-preview process this pass. |
| Route protection `/admin` | Works (anonymous) | Playwright: anonymous `/admin` redirected to login. |
| Org A cannot read org B | Could not verify | Live RLS gate skipped. Source contracts for org RLS still pass. |

## Two implementations exist

This is the main open architectural question, not a detail:

- `golden-path/` is the tested walking skeleton. It proves the two-pass loop with
  a real Python worker and now has a service-role `proof_*` persistence adapter.
  The browser UI still uses development localStorage.
- `proof/` is a database-backed graph: `supabase/migrations/025_proof_graph.sql`
  plus API routes, a workbench, and A–D fixtures. Its schema already has a
  server-assigned event sequence, an idempotent job outbox, and RLS.

`025_proof_graph.sql` was applied to `fydell-dev` as
`025_proof_graph_schema` and `025_proof_graph_rls`. All 24 tables have RLS and
one policy; anon has no SELECT grant. The tested workflow and database now both
use `direction` (`STRENGTH` / `CONCERN` / `INSUFFICIENT_EVIDENCE`) independently
from `confidence` (`HIGH` / `MODERATE` / `LOW`).

## Gates

- `npm run test:sim-engine` — drives invite → work → changed fact → revision →
  Pass A → defense → Pass B → review → brief against the real Python worker.
  Persistence is included and skips without `FYDELL_DEV_*` process env.
- `npm run test:proof` — proof-graph contracts, A–D evaluator fixtures, live DB
  sequence/RLS tests only when `FYDELL_DEV_DB_URL` is configured **in the process
  environment** (the script does not load `.env.local`), and the service-role
  persistence round trip only when both `FYDELL_DEV_SUPABASE_URL` and
  `FYDELL_DEV_SERVICE_ROLE_KEY` are in the process environment.
  Set `REQUIRE_PROOF_DATABASE_TESTS=true` in CI to turn missing credentials into
  a failure instead of an explicit skip.
- `npx tsx scripts/test-auth-flows.ts` — public auth surfaces, `next=` hygiene,
  anonymous `/admin`, invalid invite, callback-without-code, login 401, signup
  refuse-without-service-role, generic forgot-password, logout redirect.

## Production safety

The app `.env.local` **now points at fydell-dev**
(`btbmvrvynnrhapjdkunz`), not production (`qtrhwrcxthtqvkeerptp`). The public
anon key is present and is a JWT. `SUPABASE_SERVICE_ROLE_KEY`,
`FYDELL_DEV_SERVICE_ROLE_KEY`, and `FYDELL_DEV_DB_URL` are still placeholders
(not a service-role JWT / `sb_secret_…`, and not a Postgres URL).
`FYDELL_DEV_SUPABASE_URL` is present and names fydell-dev, but live proof
scripts **do not load `.env.local`** — they only read process env.

Live proof tests never accept the app's normal `DATABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY` as a substitute, because those names can still be
pointed at production in other checkouts. They skip by default.

The only accepted live-test credentials (process env, real values, not
placeholders) are:

- `FYDELL_DEV_DB_URL` for sequence and RLS tests.
- `FYDELL_DEV_SUPABASE_URL` and `FYDELL_DEV_SERVICE_ROLE_KEY` for persistence.

Every target must be visibly bound to the dev project
`btbmvrvynnrhapjdkunz`; a non-dev target aborts before any client or connection
is created. Secret values must never be logged.
