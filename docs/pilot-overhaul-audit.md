# Pilot Overhaul Audit

Date: 2026-07-11  
Scope: P0 employer → invite → Meridian → dashboard reconstruction

## 1. Current routes

| Area | Paths |
| --- | --- |
| Marketing | `/`, `/product`, `/how-it-works`, `/pricing`, `/company`, `/request-pilot`, … |
| Auth | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/update-password` |
| Employer | `/dashboard/*` (primary), `/platform/*` (legacy), `/onboarding` |
| Candidate | `/workroom/[token]`, `/c/[token]`, legacy `/apply/[token]/*` |
| Admin | `/admin`, `/admin/(ops)/*` |

## 2. Auth architecture (broken)

Three parallel stacks:

1. **Platform jose cookies** (`fydell_company`, `fydell_admin`) via `src/lib/auth.ts` + `platform-store` / Supabase Auth.
2. **MVP jose cookie** (`fydell_mvp`) via `src/lib/mvp/auth.ts` (API exists, no UI).
3. **Legacy employer passcode** (`fydell_employer`).

UI login uses only `/api/platform/*`. No Next middleware. `/dashboard` has no layout auth guard and falls back to demo data.

## 3. Supabase packages

- Present: `@supabase/supabase-js`
- Missing: `@supabase/ssr`
- Not present: `@supabase/auth-helpers-nextjs`

## 4. Clients

| File | Role |
| --- | --- |
| `src/lib/supabase.ts` | Admin service role + anon auth |
| `src/lib/supabase-browser.ts` | Browser password recovery |
| `src/lib/mvp/rpc.ts` | Anon + `FYDELL_MVP_DB_SECRET` RPCs |

## 5. Tables (migrations 001–009)

`profiles`, `workspaces`, `workspace_members`, `simulations`, `candidate_invites`, `simulation_attempts`, `simulation_events`, `candidate_reports`, `outcome_feedback`, `subscriptions`, Meridian extras, `pilot_requests`, `platform_user_roles`, `email_outbox`, `audit_logs`, `invitations`, `organization_members`, org alterations.

## 6. Fake / mock production sources (must die)

- `src/lib/dashboard-demo.ts` — Alex Chen, Acme, fake KPIs
- Dashboard pages silent fallback on API failure
- `DashboardShell` / settings hardcoded Acme
- `PlatformShell` Growth Partners
- `/dashboard/simulations` 100% static demo

## 7. Simulation sources

- **Target:** `WorkroomRunner` → `/api/mvp/attempts/*` → `mvp/db`
- Demo tokens `demo*` skip persistence
- Simulation ID mismatch: UI `sim-meridian-001` vs seed UUID

## 8. Employer dashboard sources

`GET /api/mvp/dashboard` when authenticated; else `dashboard-demo.ts`. Settings/simulations mostly placeholders.

## 9. Broken flows

Signup/login dual cookies; invite systems split (admin `/apply` vs dashboard `/workroom`); submit Meridian works only if storage + session aligned; dashboard shows invented candidates.

## 10. Retain vs replace

**Retain:** WorkroomRunner, Meridian content/engine, MVP db layer (rewire), marketing brand, AdminShell ops, FydellMark.

**Replace/retire for pilot:** demo fallbacks, Growth Partners/Acme hardcodes, platform duplicate as primary, legacy apply as invite path, jose company cookie as source of truth.

## Phase acceptance (gates)

Golden path Playwright `pilot-golden-path.spec.ts` must pass before claiming pilot-ready.
