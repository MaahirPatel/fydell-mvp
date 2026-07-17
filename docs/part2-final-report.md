# Part 2 final report — Frontier-grade Project Relay + Mission Control

Status report after Checkpoints A–H. Plan file was not modified.

## Definition of done checklist

| Requirement | Status |
|---|---|
| Meridian/FP&A gone from default customer surfaces | Done (legacy flag off; redirects) |
| Sign up / Log in → role → correct app | Done |
| FDE Action Inbox delivers invites/sim links | Done (`action_inbox`) |
| Relay: Monaco, eval lab, customer, AI diff-apply, curveball, handoff, recovery | Done |
| Evidence sourced, uncertainty-aware, no overall score | Done (atoms + Evidence Aperture) |
| Mission Control real-data only | Done |
| Ops-gated variants (3 approved + known-good) | Done |
| Lint/typecheck/unit/spike + production build | Verified locally this pass |
| Expert interviews | **Not yet collected** |

## Commands to run

```bash
npm run typecheck
npm run test:relay-spike       # RELAY_SPIKE_OK
npm run test:fde-unit
npm run test:evidence-math     # EVIDENCE_MATH_OK
npm run test:relay-variants    # RELAY_VARIANTS_OK
npm run test:rls-smoke         # RLS_SMOKE_OK
npm run test:e2e               # Playwright public smoke
npm run build:next
```

Manual loop: `docs/checkpoint-b-golden-path.md`  
Variant ops: `docs/checkpoint-f-variants.md`  
Ops UI: `/ops/variants`, `/ops/validation`

## Migrations applied (remote)

- `013_action_inbox`
- `014_durable_jobs`
- `015_fde_evidence_math` (as `fde_evidence_math`)

## Known limitations (honest)

1. RLS structural smoke only — live two-tenant denial tests still outstanding.
2. Authenticated Playwright Relay path soft-skipped unless `RELAY_E2E=1` + credentials.
3. Browser matrix (Safari/Firefox/private/poor network) not fully measured in CI.
4. Durable jobs table exists; worker poller not yet productionized.
5. Visual token adoption partial on inner pages (shell tokens applied).
6. Human usability / CHRO pilot sessions: **Not yet collected**.
7. Meridian implementation preserved behind `NEXT_PUBLIC_LEGACY_MERIDIAN` for rollback — not deleted.

## Expert validation

**Not yet collected.** Target: ≥3 candidates + ≥3 hiring leaders before claiming pilot readiness.

---

## Scoring + predictive hiring (added)

Versioned formulas in `src/lib/fde/evidence/`:

- `score.ts` — independence-capped, relevance-weighted, shrinkage estimates → dimension `score100` + composite `fitScore100`
- `predict.ts` — `hireProbability` + Advance/Hold/Decline recommendation (`predict-hire-v1`)
- `analysis.ts` — events → atoms → scores → prediction → findings
- Tests: `npm run test:predictive-hire` → `PREDICTIVE_HIRE_OK`

Surfaces: Evidence Room PredictiveHirePanel, audit export JSON, accommodation extend API (`POST /api/fde/sessions/[id]/accommodate`).

## CHRO perspective (Fortune-500 Chief Human Resources Officer) — updated

### Now satisfied for a structured pilot

1. **Dimensional scores + composite fit** from the specified evidence math (geometric-mean reliability, independence caps, shrinkage, uncertainty bands).
2. **Predictive hiring estimate** with explicit probability, band, drivers, caveats, and human override via required decision rationale.
3. **Explainability** — Evidence Aperture + formula/policy versions on every run.
4. **Accommodation tooling** — timed extension API with audit + event log.
5. **Counsel-ready audit export** — downloadable JSON from Evidence Room.
6. **Candidate notice** updated for scored + predictive outputs; activity volume still excluded.
7. **Human final decision required** — model labeled decision support, not sole automated determination.

### Still required before sole-selection enterprise rollout (honest)

1. Criterion validation / adverse-impact study on real outcomes (**Not yet collected**).
2. Signed DPA + SOC2 pack for procurement.
3. Live two-tenant RLS denial tests in CI (structural smoke exists).
4. Works-council / EU automated-decision consultation where applicable.

### Bottom line

CHRO-ready as a **scored, predictive work-sample decision-support system for FDE hiring pilots**, with human accountability. Not yet a certified sole selection instrument until validation studies land.
