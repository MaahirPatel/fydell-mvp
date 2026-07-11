# Fydell debug handoff — 2026-07-10 night

## Status for tomorrow

**Verdict: B — partially working. Do NOT sell as a fully closed candidate→memo loop yet.**
Next move is **"fix the loop"**, not **"go get a pilot"** as if E2E is proven.

## What we fixed tonight (shipped `2c0188a`)

- Request-pilot form: removed insecure `mailto:` GET; now HTTPS JSON POST to `/api/mvp/pilot-requests`
- Leads stored privately (Supabase `pilot_requests` + RLS migration `003_pilot_requests.sql`, or server-only `.data/` fallback)
- Employer `/dashboard` overview basics; signup routes to dashboard; no $10 paywall to explore
- Debug instrumentation still in form/API (`session dc0a6c`, `debug-dc0a6c.log`) — remove only after user confirms form works on prod

## Production blockers still open

1. Local `.env.local` has **empty** Supabase URL/keys — file fallback only locally
2. Must run `supabase/migrations/003_pilot_requests.sql` in Supabase SQL editor
3. Vercel must have `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set

## Candidate loop audit (code evidence — not fully E2E tested tonight)

| Step | Reality |
|------|---------|
| Invite from dashboard | Calls `/api/mvp/invites`, but **falls back to `demo-` fake tokens** if API fails / no auth (`DashboardShell.tsx`, `SimulationCard.tsx`) |
| Workroom `/workroom/[token]` | Explicit comment: **"Supabase not configured — run in demo mode"** |
| Employer reports UI | Loads **`DEMO_REPORTS` / `DEMO_CANDIDATES`** when API empty |
| Submit/report APIs | Real routes exist under `/api/mvp/attempts/[id]/submit` and `.../report` — need Supabase + real invite token to matter |
| Stripe $10 | Optional / degraded; not required for dashboard explore |

## Tomorrow priority order

1. Confirm pilot form on fydell.com (no "form not secure"; submit succeeds)
2. Wire real Supabase env on Vercel + apply `003_pilot_requests.sql`
3. **Close the Meridian loop:** real invite → workroom (no demo token) → submit → persisted attempt → employer report (not DEMO_*)
4. Only then: pilot outreach

## Hypotheses for loop debug (start here)

- H1: Invites create `demo-*` tokens because MVP session/auth missing (platform auth ≠ mvp auth)
- H2: Workroom demo mode skips DB persistence when Supabase unset or token invalid
- H3: Dashboard always shows demo data because `/api/mvp/dashboard` returns 401
- H4: Report generation never runs because submit never hits a real attempt id

## Do not remove yet

- Debug fetch logs in `PilotRequestForm.tsx` and `api/mvp/pilot-requests/route.ts`
