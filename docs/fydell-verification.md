# Fydell verification record

Branch: `feature/desktop-sim-client`. Updated: 2026-09-28.

This file tracks what is **verified** vs what needs **live** infrastructure, per the
master prompt's honesty rules. Nothing here is claimed verified unless a test,
build, or live run produced the evidence. See `CHECKLIST_PROGRESS_*.md` for the
per-requirement grind log.

## Verified in-process (no live credentials)

- `npx tsc --noEmit` — clean (2026-09-28).
- `npm run build` — green; NFT warning fix tracked below.
- Desktop: `npx tsc --noEmit` clean, `vite build` clean, pure tests 26/26.
- Sim engine: 460/460 grind checks in-process.
- Submit/finalize: 242 in-process checks (adversarial paths, state machine,
  retry storms, lost-response recovery).
- Invitation accept-by-ID: in-process route tests (token link survives inbox
  view; cross-user accept rejected; double-accept idempotent).
- `GET /api/desktop/version`: 9/9 in-process assertions (DESK-19 endpoint half).

## Live verification — blocked on credentials

**Exact credentials needed** (via a secure channel — never pasted into chat):

1. Supabase project URL (`NEXT_PUBLIC_SUPABASE_URL`)
2. Supabase anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
3. Supabase service-role key (`SUPABASE_SERVICE_ROLE_KEY`) — server-only

**Exact seeds needed** (staging project, before any E2E run):

1. All migrations in `supabase/migrations/` applied in order, ending at the
   current head (030/031/032/033 series + submit-transfer 030 — verify numbering
   with `supabase migration list`).
2. One employer organization + employer user (via the signup flow, not SQL).
3. One published simulation template with a current version
   (`scripts/seed-simulations.ts` emits the seed; publish via the employer UI).
4. One candidate user with a verified email.
5. One sent invitation from the employer org to the candidate email
   (via `POST /api/employer/invitations` or the employer UI, not SQL).

**Per-journey live gates** (checklist IDs → what the live run must show):

| Journey | Live gate |
|---|---|
| E2E-01 | Import public repo → finding → passport → sign out/in; persistence + privacy hold |
| E2E-02 | Invitee with no public repos completes a simulation; absence is not failure |
| E2E-03 | Employer creates role, previews scenario, sends invite — no founder DB edits |
| E2E-04 | Clean-OS install → clarify → issue update → upload → receipt; full attempt record |
| E2E-05/06/07 | Known-good / known-partial / alternative submissions → accurate grounded reports |
| E2E-08 | Hostile ZIP/repo/prompt-injection fixtures → rejected or isolated, no leakage |
| E2E-09 | Two employers × two candidates: cross-access denied at API, routes, storage, exports |
| E2E-10 | Refresh/expire/interrupt/restart/repeat-submit → recoverable, no lost submit, no dupes |
| E2E-11 | Provider outage (GitHub/LLM/email) → truthful state, bounded retries, no candidate penalty |
| E2E-12 | Reviewer follows findings to sources, notes, records decision; no stray email |
| E2E-13 | Share → revoke → remove project → retry access; retained records behave as disclosed |
| E2E-14 | Test payment success/fail/replay/refund → correct entitlement + ledger, no duplication |
| E2E-15 | Authenticated export/deletion request + staging restore drill → traceable fulfillment |
| E2E-16 | Anonymous demo → signup: no external sends, no paid compute, no fixture contamination |
| E2E-24 | Live partial → update → resume path against the database |
| DESK-21 | Real person outside development: install → submit → employer report |

**Also live-only:** Resend delivery, OAuth round trips, RLS journeys, billing
webhooks, signed installers, clean-machine installs, Tauri updater, real-device
performance, sandbox enforcement (RUN-01/02/09), migration apply on the live DB.

## NFT tracing warning — FIXED 2026-09-28

`npm run build` emitted Next.js NFT warnings ("Encountered unexpected file in
NFT list") because Turbopack statically analyzes `child_process.spawn` and,
when the executable isn't statically resolvable, falls back to whole-project
tracing (~9,170 files per route). Two instances fixed by detaching the call
via `spawn.bind(null)` (runtime-identical; `spawn` ignores `this`):
- `src/app/api/lab/sim-engine/evidence/route.ts` (9171 → 98 traced files)
- `src/lib/sim-engine/proof/python-client.ts` (9178 → 112 traced files;
  reached via `src/app/api/proof/runs/[runId]/*` routes)
`worker.py` is still traced naturally. `npm run build` exits 0 with **zero**
NFT warnings; `npx tsc --noEmit` clean.
