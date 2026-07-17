# FDE rebuild checkpoints (revised vertical-slice order)

## M0 — Baseline + flags
- Doc: `docs/fde-rebuild-m0-audit.md`
- Flags: `NEXT_PUBLIC_FDE_MARKETPLACE`, `NEXT_PUBLIC_RELAY_SPIKE`, `RELAY_EXECUTION`
- **Gate:** flags documented; unfinished nav stays hidden

## M1 — Relay technical spike
- Scenario: `scenarios/project-relay/` (Python triage workflow — **not** a fake FastAPI server)
- Providers: `src/lib/relay/execution-provider.ts`, `node-test-provider.ts`, `pyodide-provider.ts`
- Test: `npm run test:relay-spike` → must print `RELAY_SPIKE_OK`
- **Gate:** edit, persist/restore, allowlisted tests+evals, preview, curveball file, immutable snapshot, recover after terminate

## M2 — Minimal schema + three-path auth
- Migrations: `011_fde_core_loop.sql`, `012_fde_account_type_check_fix.sql` (applied remotely)
- Signup path picker + `api/fde/signup`
- Post-login routes to `/app/employer` or `/app/fde` when marketplace flag on
- **Gate:** employer/FDE/partner account types; tenant RLS helpers; no fake people

## M3 — Employer invites one FDE
- Mission draft → submit for review → ops activate (`/ops/missions`)
- Invite → `/s/[token]` accept → relay session `accepted`
- **Gate:** one real employer can invite one real FDE without manual SQL

## M4 — Complete Relay experience
- Consent → preflight → workspace (Pyodide) → submit
- Server timer, heartbeat, autosave, curveball, idempotent submit
- **Gate:** session completes without manual DB intervention

## M5 — Evidence + permissioned receipt
- Findings generated from events; Work Receipt issue/share/revoke
- `/r/[shareToken]` only with active permission
- **Gate:** employer sees evidence only when authorized

## M6 — Decision + minimal graph
- Employer decision on evidence page
- FDE graph lists real receipt/decision nodes only
- **Gate:** real records create real edges; empty state if none

## M7 — Public FDE rewrite + pricing
- Nav/hero/pricing $2,500 / $300 / $0 failures
- Stub `/simulation`, `/network`, `/work-receipts`, `/trust`
- **Gate:** no primary-path $10 or FP&A hiring claims

## Deferred (M8 — after pilot feedback)
- Full network browse, partner OS, outcomes checkpoints, billing checkout, appeals, generative variant factory UI

## Known limitations
1. Pyodide executes a **Python service workflow** with deterministic JSON preview — not a deployed FastAPI HTTP server. Do not claim otherwise.
2. Evidence findings are rule-based v1; human ops review still required for trust.
3. Simulation-validity interviews with FDE hiring managers are a **parallel non-code workstream**.
4. Partner approval is stub (`setup-required`).
5. Email verification UX: signup still auto-confirms for reliability; product copy should not promise unverified access forever.
6. Monaco not required — workspace uses monospace textarea editor for MVP reliability.
