# Production rescue baseline

Recorded before any rescue work began. This is the protected comparison point for the
B2B shell and UI rescue.

## Environment

| Item | Value |
| --- | --- |
| Baseline commit (HEAD) | `7290f5c` Spacious Fydell visual revision: homepage evidence chapters and Now-like simulations feed |
| Protected comparison commit | `d5fb213` |
| Branch | main working tree |
| Node | v24.14.1 |
| Next.js | 16.2.7 |
| React | 19.2.4 |
| Tailwind | v4 (CSS-first, no config file) |
| Package manager | npm |

Dirty worktree at start (left untouched, not committed or discarded):

- `tsconfig.tsbuildinfo` modified (build artifact)
- `lint-errors.txt` untracked

## Classification of `d5fb213..HEAD`

30 files changed, 1106 insertions, 1407 deletions.

| Category | Verdict |
| --- | --- |
| Backend or data-contract changes | None |
| Authentication changes | None |
| Migrations | None |
| API routes | None |
| Simulation or scoring logic | None |
| Public-site content changes | Yes: homepage, simulations feed, product page |
| Design-token and CSS changes | Yes: `src/app/globals.css` |
| Route or navigation changes | Yes: `SiteNav`, `SiteFooter` |
| Tests and operational docs | Yes: audit docs added |

Deleted in that range: `src/components/ui/GlassPanel.tsx`, `GlowButton.tsx`,
`GlowCard.tsx`, `LiveIndicator.tsx`, `SurfaceCard.tsx`.

**Conclusion: the visual regression is entirely presentational.** No revert of
`d5fb213..HEAD` is required or appropriate. The rescue is forward-only.

## Verification commands run at baseline

| Command | Result | Notes |
| --- | --- | --- |
| `npm run typecheck` | PASS | Clean |
| `npm run test:copy` | PASS | "Active sources are clean: no retired terms, no em dashes." |
| `npm run test:sims` | PASS | All 31 micro simulations, scoring determinism |
| `npm run test:v2` | PASS | v2 adapter and candidate-view redaction |
| `npm run test:october` | PASS | Northline content, scoring, defense, preflight, receipt fields, invitation gates |
| `npm run lint` | FAIL (pre-existing) | 73 problems: 38 errors, 35 warnings |
| `npm run build` | See below | |

### Pre-existing lint failures (not introduced by the rescue)

These predate this work and are recorded so that new failures can be distinguished.

- `src/lib/platform-store.ts` lines 94, 165, 199, 211: `react-hooks/rules-of-hooks`.
  A helper named `useAuthBackend` is called from non-component, non-hook functions.
- `src/components/sim/MicroRunner.tsx:155`: `react-hooks/set-state-in-effect`.
  `MicroRunner` is dead code, not wired to any route.
- `src/components/sim/WorkbenchRunner.tsx:369`: unused `resourceId`.
- `src/middleware.ts:1`: unused `NextResponse` import.
- `tests/e2e/pilot-golden-path.spec.ts:20`: unused `candidateEmail`.
- Remaining errors are `react-hooks/immutability` and
  `react-hooks/set-state-in-effect` across client components.

The rescue does not aim to clear this backlog. It aims to add nothing to it.

## Contracts that must not change

Confirmed present and treated as frozen for this pass.

### Authentication and identity

- Supabase SSR cookie session via `src/lib/supabase/middleware.ts` and `src/middleware.ts`.
  Middleware refreshes the session only; it performs no route gating.
- `resolvePostLoginDestination()` in `src/lib/auth/resolve-post-login.ts` is the single
  server-side authority for post-login routing (admin, employer, candidate, setup).
- `POST /api/auth/signup` and `POST /api/auth/role` create accounts and organizations.
- `completeEmployerOnboarding()` in `src/lib/pilot/lifecycle.ts` creates the
  `organizations` row and the `organization_members` owner row.
- `EMPLOYER_SELF_SIGNUP_MODE` defaults to `open` in `src/lib/org/reserved.ts`.

### Data model

Organizations and membership: `organizations`, `organization_members`, `invitations`,
`employer_onboarding`, `profiles`.

Applied-roles engine (used by the live candidate flow): `sim_templates`,
`sim_template_versions`, `sim_invitations`, `sim_sessions`, `sim_session_events`,
`sim_submissions`, `sim_analysis_runs`, `sim_evidence_items`, `sim_competency_results`,
`sim_employer_decisions`.

Pilot lifecycle: `pilot_cohorts`, `pilot_candidates`, `candidate_consents`,
`preflight_checks`, `evidence_reports_v2`.

Work Receipt: `work_receipts`, `receipt_permissions`.

Operator: `pilot_requests`, `platform_user_roles`, `email_outbox`, `audit_logs`.

RLS is enabled on the pilot and sim tables; writes go through the service role from
Next.js API routes.

### Simulation engine

- `MICRO_OPS_YIELD` in `src/lib/simulations/content/micro-ops-yield.ts` is the single
  source of Northline data. No separate CSV or JSON fixture exists.
- `microToV2()`, `toV2CandidateView()`, `scoreV2Attempt()`, `run.ts`,
  `buildDefenseQuestions()`, `receipt-share.ts` are all frozen.
- `WorkbenchRunner` is the live candidate runtime. It is restyled, not rebuilt.

## Route inventory

### Public

`/`, `/product`, `/simulations`, `/simulations/start/[slug]`, `/roles`, `/roles/[key]`,
`/pricing`, `/trust`, `/privacy`, `/terms`, `/security`, `/request-pilot`, `/candidates`,
`/employers`, `/pilot`, `/pilot/profile`, `/pilot/roles`, `/pilot/feedback`,
`/pilot/thanks`.

### Auth

`/login`, `/signup`, `/signup/role`, `/forgot-password`, `/reset-password`,
`/auth/callback`, `/auth/update-password`, `/auth/confirmation-required`,
`/auth/link-invalid`, `/account/setup-required`, `/onboarding/employer`.

### Authenticated employer

`/app/employer`, `/app/employer/cohort`, `/app/employer/compare`,
`/app/employer/assessments`, `/app/employer/assessments/report/[sessionId]`,
`/app/employer/candidates`, `/app/employer/reports`, `/app/employer/settings`,
`/app/employer/simulations/new`.

### Candidate

`/app/candidate`, `/invite/[token]`, `/sim/[sessionId]`, `/sim/[sessionId]/result`,
`/results/[token]`, `/record/[token]`.

### Operator

`/admin` and `/admin/(ops)/*`.

## Known defects at baseline, with the files responsible

### Factual

1. `/terms` stated Fydell provides services "for finance hiring". False.
   Fixed in Phase 0 at `src/app/terms/page.tsx`.

### Visual system

2. Text hierarchy is encoded through alpha. 205 `text-white/N` utilities across 29 files.
   Worst offenders: `HeroSimPreview.tsx` (25), `HomeProductStory.tsx` (23),
   `PilotFeedbackExplorer.tsx` (23), `MicroResultView.tsx` (15).
   Root cause: `src/app/globals.css` defines `--text-secondary` and `--text-tertiary` as
   alpha values and never registers them as Tailwind utilities.
3. Roughly 115 legacy `:root` variables with duplicate and conflicting values
   (`--surface-2` is defined in both `@theme` and `:root` with different values).
4. Dead decorative CSS still shipped: `.glass-card`, `.platform-glow`, `.text-gradient`,
   `.text-gradient-sheen`, `.wordmark-sheen`, `.spotlight-card`, `.eyebrow::before`,
   `.hero-preview-frame` purple glow, `.premium-hero-panel` 3D transform.
5. Inline radial washes in `src/app/candidates/page.tsx`, `src/app/employers/page.tsx`,
   `src/app/signup/page.tsx`.
6. Inter is loaded via `next/font/google` in `src/app/layout.tsx` but never applied to
   `body`. It costs a request and renders nothing.
7. No shared UI layer. `src/components/ui/` holds one unused `AnimatedButton`.

### Authentication

8. `/signup` renders "Create your account" twice: `src/app/signup/page.tsx:35` (h1) and
   `src/components/auth/SignupForm.tsx:26` rendered at `:156` (h2). "Already have an
   account?" is duplicated at page `:46` and form `:294`.
9. Three divergent redirect validators: `isSafeAppNext` in `src/lib/marketing/ctas.ts:11`,
   `safeReturnPath` in `src/components/platform/AuthForm.tsx:16`, and the materially
   weaker `safeNext` in `src/app/auth/callback/route.ts:8` which accepts any path
   beginning with a single slash.
10. `next` is discarded by: `signup/page.tsx:17,47`, `signup/role/page.tsx:86`,
    `forgot-password/page.tsx:42,65`, `reset-password/page.tsx:98`,
    `auth/confirmation-required/page.tsx:17`, `auth/link-invalid/page.tsx:17`, and
    `app/employer/assessments/report/[sessionId]/page.tsx:15`.
11. `src/app/onboarding/employer/page.tsx` is a five-line redirect stub. There is no
    "create your workspace" screen despite self-serve signup being enabled.
12. `/login` exposes internal actor language: "One login for employers and platform
    operators."

### Public positioning

13. `/simulations` renders 31 simulations across six role filters from the static
    `ALL_SIMULATIONS` array, diluting the one production evaluation.
14. `/roles` markets six role families that do not exist as products.
15. Footer re-exposes Roles and Pricing.
16. `/pricing` is roughly 3830px tall and contradicts the single Data Analyst evaluation.
17. `/privacy` and `/security` are single placeholder paragraphs.
18. `/candidates` and `/employers` are orphaned; nothing links to them.

### Authenticated product

19. Primary navigation in `src/components/employer/EmployerShell.tsx:11-19` contains
    "Pilot cohort" and "Compare" as permanent destinations.
20. Stale and internal copy: "No fake analytics" at
    `src/app/app/employer/cohort/page.tsx:19`; "five-minute simulation" at
    `CandidatesTable.tsx:33` and `InviteCandidateModal.tsx:268`; Resend delivery
    plumbing at `CohortWorkspace.tsx:233`; hardcoded October at `CohortWorkspace.tsx:143`.
21. `GuidedSimulationBuilder.tsx` uses a light gradient theme inconsistent with the
    rest of the app.
22. Every operational object renders as a large white rounded rectangle, because no
    shared surface or table primitive exists.

## Authenticated routes not yet verified at runtime

The seven supplied production screenshots prove appearance only. The following remain
unverified until a safe development or preview Supabase environment is available:
refresh persistence, authorization boundaries, data loading, invitation delivery,
simulation completion, report generation, and Work Receipt sharing and revocation.

## Screenshots

`docs/screenshots/` was empty at baseline. Captures are added during the Phase 3 gate
and the Phase 6 audit, with email addresses and production identifiers redacted.
