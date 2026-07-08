# Fydell Backend MVP

Simulation-based hiring backend: **employer → workspace → invite → candidate
attempt → execution events + final work → evidence-backed report → hiring
decision → 30/90-day outcome feedback** (the execution-data moat).

This document covers Supabase setup, the migration + seed, environment
variables, Stripe, the demo flow, test steps, and known limitations.

> **Honesty note:** all scoring in this MVP is a **preliminary simulation
> signal** derived from transparent, inspectable rules — not a validated
> psychometric or ML model. Every report shows the evidence behind the signal,
> and the outcome-calibration view never claims a proven correlation.

---

## 1. Architecture

- **Next.js App Router + TypeScript**, server-only data access.
- **Supabase Postgres** with Row Level Security on every table.
- All app DB access runs server-side through the **service-role** client
  (`src/lib/supabase.ts` → `getSupabaseAdmin()`), which bypasses RLS. RLS is the
  safety net for any direct anon/auth access and to prevent cross-workspace
  leakage. Candidate (token) access is mediated entirely by server routes +
  token validation — there are intentionally no anon candidate policies.
- The service-role key and Stripe secrets are **server-only** and never reach
  the client.

### Key files (owned by this backend work)

| Area | File |
| --- | --- |
| Schema | `supabase/migrations/001_mvp_core.sql` |
| Seed | `supabase/seed.sql` |
| Row types | `src/lib/mvp/types.ts` |
| Deterministic scoring | `src/lib/mvp/scoring.ts` |
| Supabase clients | `src/lib/supabase.ts` |
| Employer auth + session | `src/lib/mvp/auth.ts` |
| Data-access layer | `src/lib/mvp/db.ts` |
| Manager route guard | `src/lib/mvp/guard.ts` |
| Stripe billing | `src/lib/mvp/stripe.ts` |
| API routes | `src/app/api/mvp/**` |
| Candidate run page | `src/app/c/[token]/**` |
| Manager report page | `src/app/platform/attempts/[id]/**` |

---

## 2. Database

### Tables (10)

`profiles`, `workspaces`, `workspace_members`, `simulations`,
`candidate_invites`, `simulation_attempts`, `simulation_events`,
`candidate_reports`, `outcome_feedback`, `subscriptions`.

All have UUID primary keys (`gen_random_uuid()` / `auth.users` for profiles),
`timestamptz` timestamps, foreign keys with explicit on-delete behaviour, and
the spec'd CHECK constraints, e.g.:

- `profiles.role in ('employer','candidate','admin')`
- `simulation_attempts.hiring_decision in ('not_decided','advance','hold','reject','offer','hired')` default `not_decided`
- `outcome_feedback.feedback_stage in ('30_day','60_day','90_day','6_month','12_month')`, rating fields (`work_quality`, `communication`, `judgment`, `independence`) constrained `between 1 and 5`
- `candidate_invites.status`, `simulation_attempts.status`, `simulations.status`, `candidate_reports.overall_signal` all constrained.

An `updated_at` trigger (`set_updated_at()`) maintains timestamps. Useful
indexes exist on every foreign key used for lookups (workspace_id, token,
attempt_id, etc.).

### RLS policies (MVP-safe)

RLS is enabled on all 10 tables. Two `SECURITY DEFINER` helpers,
`is_workspace_member(ws)` and `is_workspace_manager(ws)`, avoid recursive RLS
on `workspace_members`.

- **profiles** — read/insert/update only your own row.
- **workspaces** — members read; creator inserts; managers (owner/admin) update.
- **workspace_members** — see rows for your workspaces; managers add/remove.
- **simulations** — members read (plus global `workspace_id IS NULL`
  templates); managers manage their workspace's simulations.
- **candidate_invites** — members read; managers manage.
- **simulation_attempts** — members read; managers update.
- **simulation_events** — members read + insert within their workspace.
- **candidate_reports** — members read; managers write.
- **outcome_feedback** — workspace members read + submit.
- **subscriptions** — members read (billing is written server-side via service
  role).

**Documented limitation:** candidate token access has no anon RLS policy by
design — it is handled exclusively by server routes using the service role +
token validation. If you later expose any of these tables to the anon client,
add token-scoped policies first.

---

## 3. Supabase setup

1. Create a Supabase project. Copy the URL, anon key, and service-role key.
2. Run the migration, then the seed (SQL editor or CLI):

   **SQL editor:** paste `supabase/migrations/001_mvp_core.sql`, run; then paste
   `supabase/seed.sql`, run.

   **CLI:**
   ```bash
   supabase db push            # or: psql "$DATABASE_URL" -f supabase/migrations/001_mvp_core.sql
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```
3. The seed inserts one global template simulation: **Project Meridian —
   Acquisition Analysis** (`id 00000000-0000-4000-a000-000000000001`,
   `workspace_id = null`, `status = active`). It is idempotent (re-running
   updates the same row).

---

## 4. Environment variables

See `.env.example`. Copy to `.env.local`.

| Var | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Anon key (login password verification) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Service-role key (server-only) |
| `NEXTAUTH_SECRET` | yes | Signs the httpOnly employer session cookie |
| `NEXT_PUBLIC_APP_URL` | recommended | Base URL for invite + Stripe redirect links |
| `STRIPE_SECRET_KEY` | optional | Stripe secret (server-only) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | optional | Stripe publishable key (client) |
| `STRIPE_WEBHOOK_SECRET` | optional | Verifies Stripe webhooks |
| `STRIPE_TEAM_PRICE_ID` | optional | Price ID for the Team plan |
| `STRIPE_PILOT_PRICE_ID` | optional | Price ID for the Pilot plan |

Legacy fallbacks `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` are also accepted by
`src/lib/supabase.ts`.

---

## 5. API surface (`/api/mvp/*`)

| Function (spec) | Route | Auth |
| --- | --- | --- |
| employer signup | `POST /api/mvp/auth/signup` | public |
| employer login | `POST /api/mvp/auth/login` | public |
| logout | `POST /api/mvp/auth/logout` | session |
| getCurrentWorkspace / getWorkspaceSimulations | `GET /api/mvp/simulations` | manager |
| getDashboardData | `GET /api/mvp/dashboard` | manager |
| createCandidateInvite | `POST /api/mvp/invites` | manager |
| validateCandidateInvite | `GET /api/mvp/invites/[token]` | public (token) |
| startSimulationAttempt | `POST /api/mvp/attempts/start` | public (token) |
| recordSimulationEvent | `POST /api/mvp/attempts/[id]/event` | candidate |
| updateCandidateNotes | `POST /api/mvp/attempts/[id]/notes` | candidate |
| submitFinalRecommendation (+score+report) | `POST /api/mvp/attempts/[id]/submit` | candidate |
| generateAttemptScore / generateCandidateReport | `POST /api/mvp/attempts/[id]/score` | manager |
| getAttemptReport | `GET /api/mvp/attempts/[id]/report` | manager |
| updateHiringDecision | `POST /api/mvp/attempts/[id]/decision` | manager |
| createOutcomeFeedback | `POST /api/mvp/outcome-feedback` | manager |
| createStripeCheckoutSession | `POST /api/mvp/stripe/checkout` | manager |
| handleStripeWebhook | `POST /api/mvp/stripe/webhook` | Stripe |

`createWorkspaceIfMissing` runs implicitly: the manager route guard
(`requireManager`) ensures a workspace + owner membership exist for every
logged-in employer.

### Auth flow

- **Signup** creates the Supabase `auth.users` record (service role
  `admin.createUser`), a 1:1 `profiles` row (`role = employer`), a default
  workspace named after the company, and an `owner` `workspace_members` row.
  Then it mints a signed httpOnly session cookie (`fydell_mvp`, jose/HS256).
- **Login** verifies the password via the anon client
  (`signInWithPassword`), loads the profile (self-heals a missing profile), and
  mints the session.
- **Protected pages** (`/platform/attempts/[id]`) redirect logged-out users to
  `/login`. Manager API routes return `401` without a session.
- **Candidate flow** needs **no account** — it is entirely token-scoped.

### Invite + attempt + event tracking

- A manager creates an invite (token + optional expiry). The candidate link is
  `${NEXT_PUBLIC_APP_URL}/c/<token>`.
- Validating a token marks it `opened`; starting marks it `started` and creates
  the single `simulation_attempts` row (`in_progress`).
- Every meaningful action emits a `simulation_events` row:
  `simulation_started`, `resource_opened`, `note_updated`,
  `recommendation_submitted`, `simulation_completed`, etc. — the granular
  execution trail.
- Submit stamps `submitted_at`/`completed_at`, marks the invite `completed`, and
  triggers scoring + report generation.

### Report generation (evidence-first)

`scoreAttempt()` checks 8 transparent signals in the candidate's own
submission — clear recommendation, valuation, revenue/EBITDA/margins, risks,
strategic fit, assumptions, tradeoffs, substantive conclusion — producing
`overall_score` 0–100 and a 7-dimension `score_json` (analytical_accuracy,
business_judgment, prioritization, communication_clarity, risk_detection,
ambiguity_handling, recommendation_quality). `report_json` carries
`{summary, strengths[], risks[], evidence[], interview_questions[],
overall_signal}` and is persisted to `candidate_reports`. **Every report lists
the evidence behind each signal**, not just a number.

### Outcome moat (Signal Calibration)

`getDashboardData()` computes calibration from `hired_at`:

- 0 hires → *"Not enough outcome data yet…"*
- hires with a 30-day / 90-day check-in due and no matching `outcome_feedback`
  row → *"N check-ins due."*
- otherwise → *"Outcome tracking is up to date."*

It includes an explicit disclaimer and **no fabricated correlations**.

### Stripe

- `createStripeCheckoutSession({ plan: 'team' | 'pilot' })` creates a
  subscription Checkout Session when the secret + relevant price ID exist.
- Missing config throws `BillingNotConfiguredError`; the route returns `503`
  with `"Billing not configured in this environment."` — graceful fallback.
- The webhook verifies the signature and upserts the `subscriptions` row on
  `checkout.session.completed` and `customer.subscription.*`.
- `getBillingStatus()` defaults to a **"Pilot plan"** label when unconfigured.

---

## 6. Demo flow

1. Configure `.env.local`, run the migration + seed.
2. `npm run dev`.
3. Sign up an employer: `POST /api/mvp/auth/signup` (or wire the existing
   signup form to it). This creates the workspace + owner membership.
4. Create an invite against the seeded simulation:
   ```bash
   curl -X POST http://localhost:3000/api/mvp/invites \
     -H 'content-type: application/json' --cookie 'fydell_mvp=...' \
     -d '{"simulationId":"00000000-0000-4000-a000-000000000001","candidateName":"Alex Candidate"}'
   ```
   The response includes `url` → `/c/<token>`.
5. Open `/c/<token>` (no login): read the data room, take notes, submit a
   recommendation. The attempt is scored and a report generated automatically.
6. As the employer, open `/platform/attempts/<attemptId>` to see the
   evidence-backed report and set a hiring decision. Mark **Hired** to start the
   outcome clock.
7. Submit outcome feedback at the 30/90-day stage via
   `POST /api/mvp/outcome-feedback`; watch Signal Calibration update on
   `GET /api/mvp/dashboard`.

---

## 7. Test steps

- `npm run build` (or `npx tsc --noEmit`) — typecheck + build.
- Unconfigured env: `/c/<token>` and `/platform/attempts/<id>` render safe
  messages instead of crashing; Stripe routes return graceful fallbacks.
- Scoring is deterministic: the same submission always yields the same score —
  good for snapshot testing `scoreAttempt()` directly.

---

## 8. Known limitations / future work

- **Scoring is rule-based**, English-keyword oriented, and tuned to the Project
  Meridian rubric. It is a preliminary signal, not a validated predictor. Future:
  per-simulation rubric-driven scoring, multi-language, optional LLM assist.
- **Candidate event/notes/submit routes are token-attempt scoped but not
  individually re-authenticated** per request (MVP trade-off). Future: sign a
  short-lived candidate attempt token and verify it on each candidate write.
- **No anon candidate RLS policies** — candidate access is server-mediated only.
- **Calibration** is intentionally descriptive (counts + due check-ins). It does
  not compute correlations until there is enough outcome data and a defensible
  methodology.
- **Email** sending for invites is not wired here (the link is returned by the
  API); reuse `src/lib/email.ts` to send it.
- The pre-existing platform pages still use the legacy `platform-store` model;
  the MVP pages (`/c/[token]`, `/platform/attempts/[id]`) are the data-wired
  surfaces for this backend.
