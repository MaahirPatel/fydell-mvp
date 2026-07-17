# FDE rebuild checkpoints (revised: technical proof → thin loop → depth)

Strategy: **one extraordinary Relay + one undeniable evidence report** before marketplace breadth.

Meridian: **hidden/redirected** from customer paths; implementation preserved until Relay golden path, recovery, and submission gates pass. Do not delete yet.

## A — Runtime proof (done locally)
- Flags: marketplace, relay spike, `NEXT_PUBLIC_LEGACY_MERIDIAN=0`, `NEXT_PUBLIC_PARTNER_SIGNUP=0`
- Meridian nav/routes redirected; code kept
- Monaco + multi-file + Pyodide provider + persist/restore + worker recovery + immutable idempotent submit
- Perf budgets in `RELAY_PERF_BUDGETS`; failure matrix in `docs/checkpoint-a-runtime.md`
- **Gate:** `npm run test:relay-spike` → `RELAY_SPIKE_OK`

## B — Thin golden path (in progress)
- Employer creates mission → invites FDE → Action Inbox / invite accept → consent → preflight → Relay (edit + one test) → submit → employer opens artifact → records decision
- Manual script: `docs/checkpoint-b-golden-path.md`
- Mission Control + Action Inbox + signup→role shipped; Monaco wired into live workspace
- Migration `013_action_inbox` applied remotely
- **Gate:** complete journey without manual SQL; previous A tests still pass

## C — Complete Relay experience
- Customer simulator, scope note, AI workspace, evaluation laboratory, curveball, handoff, full recovery, technical-failure handling
- Visual tokens/primitives already started (`src/lib/fde/ui/tokens.ts`, Mission Control rails) — polish deferred
- **Gate:** every Relay surface used in a real session; recovery matrix holds in-browser

## D — Deterministic analysis
- Objective artifact metrics only: accuracy, macro-F1, high-severity recall, false-automation rate, abstention, selective accuracy, schema validity, privacy violations, idempotency, regression detection
- Evaluation contract types: `src/lib/fde/evaluation-contract.ts` (lock before first candidate)
- Five primary dimensions; secondary descriptive / insufficient evidence
- **Gate:** metrics reproducible from same artifact; no behavioral math yet

## E — Evidence inference and review
- Evidence atoms, provenance reliability, independence groups, Bayesian/shrinkage (exact formulas + golden vectors), uncertainty, operator review, disputes, receipt versions
- Activity volume / typing / prompts / latency = **context only**, never independent evidence
- Action Inbox expansions (evidence ready, dispute update, decision feedback)
- **Gate:** golden math cases + policy version on every receipt; reprocessing identical

## F — Candidate and employer depth
- Candidate home, invitations, simulations, receipts, privacy, feedback
- Employer Mission Control depth, Evidence Room, interview calibration, Decision Room
- Partners remain schema-present, operator-invited, feature-flagged (no public partner UX)

## G — One controlled generative demonstration
- One known-good canonical Relay scenario + **one** generated approved variant
- Deterministic materialization, golden-solution validation, difficulty comparison, operator approval, fallback
- Expand to three only after this works

## H — Visual polish, security audit, pilot QA
- Final system-wide RLS/security audit (RLS + tenant tests required on every migration earlier)
- Human acceptance: ≥3 candidates + ≥3 hiring leaders; record “Not yet collected” until done
- Accessibility + browser matrix documentation

## Every checkpoint must ship with
Exact files, migrations, feature flags, performance budget, security tests, rollback/repair path, automated acceptance tests, manual verification script, screenshots, known limitations, and proof previous checkpoints still pass.

## Known limitations (honest)
1. Pyodide runs a Python triage workflow with deterministic preview — not a live FastAPI HTTP server.
2. Evidence findings are still rule-based v1 until Checkpoint E.
3. Browser compatibility matrix (Safari/Firefox/private/poor network) not fully measured in CI yet.
4. Durable background job table for eval/evidence/email retries not yet migrated.
5. Human usability sessions: **Not yet collected**.
6. Generative variants: not started (Checkpoint G).
