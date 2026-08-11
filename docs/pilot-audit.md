# October 2026 pilot audit

Date: 2026-08-11  
Branch/commit: `main` @ `e0bb5ec`  
Working tree: local tooling noise only (`next-env.d.ts`, `tsconfig.tsbuildinfo`); no unrelated product WIP preserved beyond that.

## Repository baseline

| Item | Value |
|---|---|
| Package manager | npm |
| Framework | Next.js 16.2.7 (App Router), React 19 |
| Runtime | Node 24.x local; Vercel production target |
| Styling | Tailwind CSS 4, Geist |
| Auth/DB | Supabase Auth + Postgres + RLS |
| Tests | `tsx` scripts, Playwright |
| Deploy | Vercel (inferred from `VERCEL_*` env usage) |

### Commands

| Action | Command |
|---|---|
| Install | `npm install` |
| Dev | `npm run dev` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Unit (pilot) | `npm run test:unit` |
| Micro scoring | `npm run test:sims` |
| V2 scoring | `npm run test:v2` |
| Copy scan | `npm run test:copy` |
| Release gate | `npm run test:release` |
| RLS structural | `npm run test:rls-smoke` |
| E2E | `npm run test:e2e` |
| Production build | `npm run build` |

### Baseline results (2026-08-11)

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run test:v2` | PASS |
| `npm run test:copy` | PASS |
| `npm run lint` | FAIL (42 pre-existing errors; not pilot-blocking) |
| `npm run build` | PASS |
| Live RLS two-tenant | UNVERIFIED (structural smoke PASS; live needs `RLS_LIVE_*`) |
| Full invite→receipt E2E | UNVERIFIED (public Playwright smoke; auth path gated) |
| Migration 021 / october_pilot_cohort | PASS (applied to remote project) |
| Seed `ops-yield-investigation` | PASS (published v1 on remote) |

### Environment variables (names only)

| Name | Scope | Required for pilot |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | server | yes |
| `NEXT_PUBLIC_APP_URL` | both | yes |
| `NEXTAUTH_SECRET` | server | yes (admin/platform) |
| `RESEND_API_KEY` | server | optional (link fallback if absent) |
| `RESEND_WEBHOOK_SECRET` | server | optional |
| `EMAIL_FROM_TRANSACTIONAL` | server | optional |
| `EMAIL_REPLY_TO` | server | optional |
| `CRON_SECRET` | server | yes if outbox cron used |
| `EMPLOYER_SELF_SIGNUP_MODE` | server | yes (`open` for pilot) |
| `ALLOW_DEMO_DATA` | server | must be `false` in prod |
| `OPENAI_API_KEY` | server | optional (human-review fallback if absent) |
| `NEXT_PUBLIC_FDE_MARKETPLACE` | client | set `0` for October public honesty |
| `NEXT_PUBLIC_RELAY_SPIKE` | client | set `0` for October |
| `NEXT_PUBLIC_LEGACY_MERIDIAN` | client | keep `0` |
| `ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_EMAIL` | server | ops |
| `TURNSTILE_*` | both | optional |

Never print values in docs or logs.

## Route inventory (pilot-critical)

| Route | User | Auth | Status | Decision |
|---|---|---|---|---|
| `/` | public | none | working marketing | repair copy for October message |
| `/login`, `/signup` | public | none | working | keep |
| `/onboarding/employer` | employer | auth | working | keep |
| `/app/employer` | employer | org member | working metrics | repair: cohort-first queue |
| `/app/employer/assessments` | employer | org | working | keep + cohort filter |
| `/app/employer/assessments/report/[sessionId]` | employer | org | working report | repair: clickable citations, human-review, defense |
| `/app/employer/candidates` | employer | org | working | keep |
| `/invite/[token]` | candidate | token | info landing | repair: consent + preflight + states |
| `/sim/[sessionId]` | candidate | session owner | WorkbenchRunner | repair: consent gate, offline, second-tab |
| `/sim/[sessionId]/result` | candidate | session | working | keep + receipt CTA |
| `/record/[token]` | share viewer | share token | claim/share | repair: field scope, expiry, revoke |
| `/results/[token]` | share | token | legacy result | keep if still linked |
| `/admin/*` | platform | admin | ops | keep minimal; no service-role UI |
| `/app/fde`, Relay/Meridian | legacy | varies | legacy | remove from active nav; do not delete history |
| `/simulations`, `/roles` | public | none | multi-role catalog | de-emphasize for pilot; no fake marketplace |

## Data / Supabase audit

### Reusable tables (019+)

- `organizations`, `organization_members`
- `sim_templates`, `sim_template_versions` (immutable when published)
- `sim_invitations` (token_hash only)
- `sim_sessions`, `sim_session_state`, `sim_session_events`
- `sim_messages`, `sim_ai_interactions`, `sim_submissions`
- `sim_analysis_runs`, `sim_competency_results`, `sim_evidence_items`
- `sim_credentials`, `sim_employer_decisions`

### Missing for October prompt

- `pilot_cohorts` bound to one template version
- Versioned `candidate_consents` + `preflight_checks` on applied path
- Event `schema_version`
- Oral-defense question sets + facilitator notes
- Receipt share: allowed fields, expires_at, revoked_at, access log
- Report supersession / retry status on applied path
- Decision influence field (`changed` / `confirmed` / `no_effect`)

### Security notes

- Writes are service-role via app server (good pattern).
- RLS SELECT scoped by org membership / candidate ownership.
- Live cross-org denial not proven by automated two-tenant test.
- Raw tokens must never be logged (verify invite/share routes).

## Product gaps (priority)

1. Consent + preflight before timer
2. Single DA cohort + Operations performance investigation evaluation
3. Oral defense + human-review-required honesty
4. Clickable citations + same-cohort compare
5. Receipt share field scope / expiry / revoke
6. Offline queue + second-tab rule
7. E2E + RLS proof + runbook

## Keep / repair / remove-from-nav

| Surface | Decision |
|---|---|
| WorkbenchRunner + v2 scoring | keep / extend |
| Missing Delays content | keep in repo; not the October cohort pin |
| Multi-role public catalog | keep routes; honest October homepage CTA |
| FDE marketplace flags | remove from active October product copy |
| Fake analytics / marketplace claims | remove |

## Owner input still needed

- Final legal consent copy approval
- Resend production domain verification
- Staging credentials for live RLS rehearsal
- Explicit permission before any GlobalFoundries name/logo (default: never public)
