# Pilot implementation log

Update entries in place. No secrets or real candidate data.

## 2026-08-11 — Phase 0 baseline

- Audit written in `docs/pilot-audit.md`.
- Baseline: `typecheck` PASS, `test:v2` PASS, `test:copy` PASS.
- Locked defaults: October cohort pins fictional **Operations performance investigation**; Missing Delays remains in catalog; no GF public branding; oral defense uses facilitator notes when recording is unavailable; email falls back to copyable link.

## 2026-08-11 — Phases 1–6 implemented in-repo

- Additive migration `021_october_pilot_cohort.sql`: cohorts, consents, preflight, event schema_version, oral defense, receipt shares, decision influence, report status helpers.
- Flagship content: `ops-yield-investigation` (Northline Components, synthetic manufacturing data).
- Employer: `/app/employer/cohort`, `/app/employer/compare`, review actions with evidence influence + facilitator defense notes.
- Candidate: consent + real preflight before Start; offline retry queue; second-tab lock; curveball present/ack.
- Receipt: field-scoped expiring revocable shares via `sim_receipt_shares`.
- Public: October message + Request a pilot / Sign in CTAs.
- Tests: `npm run test:october`, RLS structural includes 021 tables, Playwright public smoke, live RLS script skip-safe.

## 2026-08-13 — Premium visual system + originality lock

- Design evidence: `docs/ui-reference-audit.md`, `docs/design-system.md`, `docs/ui-slop-audit.md` (Four Horsemen + derivative-design audit).
- Tokens: `--fydell-brand-*`, evidence/action/risk, flat `--surface-canvas` (no body dual glow).
- Homepage rebuilt as Fydell evidence loop with Northline ops-yield investigation canvas (not Linear clone, not multi-role marketplace).
- Removed unused glow/Live/logo-cloud landmines; SiteNav rectangular CTA; employer shell graphite chrome.
- Screenshots: `docs/screenshots/visual-pass/home-1440x900.png`, `home-1280x800.png` - originality gate PASS.
- `npm run test:copy` PASS; `tsc --noEmit` PASS.

## 2026-08-11 — Same-day environment closeout

- Applied migration `october_pilot_cohort` to Supabase project `qtrhwrcxthtqvkeerptp`; verified `pilot_cohorts`, consents, defense, receipt share tables + session report/review columns.
- Published `ops-yield-investigation` template v1 into `sim_templates` / `sim_template_versions`.
- `npm run build` PASS; `npm run test:release` PASS; `npm run test:copy` PASS.
- Fixed invitations copy em dash; WorkbenchRunner offline retry uses `persistRef` (no temporal-dead-zone); CohortWorkspace load deferred via `queueMicrotask`.
- Local `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` is empty - seed scripts cannot run locally until filled; remote seed done via SQL.
- Live RLS two-tenant and logged-in day-of smoke remain UNVERIFIED (credentials / manual).

## External boundaries

| Boundary | Behavior when missing |
|---|---|
| Resend | Invitation status `Link created - not emailed`; copyable `/invite/{token}` |
| OpenAI | Report enters `human_review_required`; structured reviewer form |
| Recording/transcription | Facilitator structured notes only; never fake a recording |

## Verification evidence

| Item | Evidence |
|---|---|
| Deterministic v2 scoring | `npm run test:v2` |
| Copy honesty | `npm run test:copy` |
| Cohort/consent/receipt unit coverage | `npm run test:october` |
| RLS cross-org | `npm run test:rls-smoke` + live script when credentials available |
| Production build | `npm run build` |
| Migration + flagship seed | Supabase `october_pilot_cohort` + published slug `ops-yield-investigation` |
| Full E2E | Playwright public path; auth-gated path needs session |
