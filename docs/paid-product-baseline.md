# Paid-product upgrade: baseline

Recorded before any code in this pass changed, so that later claims of
improvement can be checked against something rather than asserted.

## Repository state

| Item | Value |
| --- | --- |
| Branch | `main`, level with `origin/main` |
| Baseline commit | `f5883df` Fix three dashboard defects found by rendering the signed-in app |
| Preceding commit | `085105c` Rebuild Fydell as a B2B hiring-evaluation product |
| Working tree at start | clean |
| Framework | Next.js 16.2.7 (App Router, Turbopack), React 19.2.4, Tailwind 4 |
| Data layer | Supabase (`@supabase/ssr` 0.12, `supabase-js` 2.108) |

### Environment variable names in use

Names only; no values are recorded here.

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (legacy
fallbacks), `BOOTSTRAP_ADMIN_EMAIL`, `ADMIN_EMAIL`, `EMAIL_FROM`,
`EMAIL_FROM_TRANSACTIONAL`, `ALLOW_DEV_SEED`, and the two added by this pass:
`NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_SECURITY_EMAIL`.

Config files present: `.env.example`, `.env.local`. There is no
`supabase/config.toml`, so the CLI is not initialised for a local stack.

## Verification commands, before changes

Run against the baseline commit.

| Command | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm run test:copy` | pass — "Active sources are clean: no retired terms, no em dashes" |
| `npm run test:unit` | pass — pilot validation, pilot lifecycle, safe-next |
| `npm run test:sims` | pass — scoring checks |
| `npm run test:v2` | pass |
| `npm run lint` | 71 problems, all pre-existing and catalogued in `docs/production-rescue-baseline.md` |

Scripts that exist but cannot run without a database: `test:rls-smoke`,
`test:pilot-golden-path`, `verify:migrations`, `verify:prod`, `seed:dev`,
`test:e2e`. See the environment constraint below.

## Measured geometry, before changes

Captured with `scripts/measure-baseline.ts` at 1363 x 936 against the local dev
server, matching the viewport the upgrade brief quoted.

| Route | Status | Page height | Viewports | Sections | Opening section | Console errors |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 200 | 4303 | 4.6 | 7 | 1064 | 0 |
| `/product` | 200 | 4809 | 5.1 | 10 | 474 | 0 |
| `/simulations` | 200 | 3398 | 3.6 | 6 | 604 | 0 |
| `/trust` | 200 | 3413 | 3.6 | 6 | 402 | 0 |
| `/signup` | 200 | 936 | 1.0 | 0 | — | 0 |
| `/login` | 200 | 936 | 1.0 | 0 | — | 0 |
| `/request-pilot` | 200 | 1003 | 1.1 | 1 | 696 | 0 |
| `/pricing` | 200 | 1451 | 1.6 | 2 | 474 | 0 |
| `/privacy` | 200 | 1439 | 1.5 | 2 | 327 | 0 |
| `/terms` | 200 | 936 | 1.0 | 2 | 327 | 0 |
| `/security` | 200 | 1439 | 1.5 | 2 | 327 | 0 |

H1 geometry:

| Route | H1 box | Text |
| --- | --- | --- |
| `/` | x122 y148 w651 | See the work before you make the hire. |
| `/product` | x122 y148 w624 | An evaluation you can audit, not a score you have to trust. |
| `/simulations` | x122 y168 w624 | Operations performance investigation |
| `/trust` | x122 y148 w624 | How the evidence is produced, and who can read it. |
| `/signup` | x482 y120 w400 | Create your Fydell account |
| `/login` | x482 y120 w400 | Sign in to Fydell |

No horizontal overflow on any route. No console errors on any route.

### The brief's audit reproduces locally

The upgrade brief quoted figures from the deployed site on 13 August 2026. Those
figures reproduce against this repository, so the audit can be trusted and its
coordinates are not stale:

| Measurement | Brief | Local | Agrees |
| --- | --- | --- | --- |
| `/` page height | ~4303 | 4303 | yes |
| `/` opening section | ~1064 | 1064 | yes |
| `/` H1 width | ~651 | 651 | yes |
| `/` sections | 7 | 7 | yes |
| `/product` height | ~4809 | 4809 | yes |
| `/product` sections | 10 | 10 | yes |
| `/simulations` height | ~3398 | 3398 | yes |
| `/trust` height | ~3413 | 3413 | yes |
| `/signup` form width | 400 at x482 | 400 at x482 | yes |

The only divergence is the H1 x-origin on `/` (brief x114, local x122); that is
scrollbar gutter, not a layout difference.

Confirmed defects to fix, in the brief's terms:

- The `/` opening section is 1064px and single-column, so the upper right of the
  first viewport carries nothing. The product scene starts below it.
- Seven sections on `/` and ten on `/product` share one canvas tone and one
  hairline-divider treatment, so the page reads as uniform.
- `/signup` and `/login` are a 400px form on a 1363px canvas: 71 percent of the
  width is empty.
- Two bitmaps and one SVG serve a 4303px page; there are too few differentiated
  product moments.

## Route inventory

108 routes. Public marketing, auth, employer app, candidate flow, admin ops, and
API.

**Public marketing:** `/`, `/product`, `/simulations`, `/simulations/start/[slug]`,
`/trust`, `/security`, `/pricing`, `/privacy`, `/terms`, `/request-pilot`

**Public redirect aliases (kept for inbound links):** `/roles`, `/roles/[key]`,
`/candidates`, `/employers`, `/dashboard`, `/app/simulations/new`

**Auth:** `/signup`, `/signup/role`, `/login`, `/forgot-password`,
`/reset-password`, `/auth/callback`, `/auth/confirmation-required`,
`/auth/link-invalid`, `/auth/update-password`, `/account/setup-required`,
`/onboarding/employer`

**Employer app:** `/app/employer`, `/app/employer/assessments`,
`/app/employer/assessments/report/[sessionId]`, `/app/employer/candidates`,
`/app/employer/cohort`, `/app/employer/compare`, `/app/employer/reports`,
`/app/employer/settings`

**Candidate:** `/invite/[token]`, `/sim/[sessionId]`, `/sim/[sessionId]/result`,
`/results/[token]`, `/record/[token]`, `/app/candidate`

**Pilot:** `/pilot`, `/pilot/feedback`, `/pilot/profile`, `/pilot/roles`,
`/pilot/thanks`

**Admin ops:** `/admin` plus 15 routes under `/admin/(ops)/*`

**API:** 45 routes under `/api/*`, of which `/api/sim/sessions/[id]/*` carries
the evaluation engine.

## Environment constraint affecting phases 4, 5 and 6

The brief requires a safe synthetic workspace for the employer audit and a full
company-to-candidate loop for the final gate. Neither is currently possible:

- **Docker is not installed**, so `supabase start` cannot bring up a local
  stack. The Supabase CLI itself is present (2.114.0).
- **There is no `supabase/config.toml`**, so the repository has never been
  initialised for local development.
- **The only configured Supabase project is the live one**, holding real users
  and organizations. Seeding fixtures into it is not acceptable, and the brief
  itself lists "production pages containing synthetic customer or candidate
  fixtures" as a commercial-readiness blocker.
- **The existing `seed:dev` script is not sufficient anyway.** It inserts one
  `pilot_requests` row and one `email_outbox` row against whatever Supabase is
  configured. It creates no organization, evaluation, candidate, session, report
  or receipt, so it cannot populate the screens the brief asks to be designed.

Consequence: employer and candidate screens can be designed and audited against
a local fixture layer that renders the real components, which is what the
previous pass did. A true end-to-end loop with persistence cannot be run until a
safe database exists. This is tracked as an open decision, not silently skipped,
and no readiness claim will be made for states that were never executed.

## Contract map

See `docs/paid-product-contract-map.md`.
