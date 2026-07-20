# Fydell Deep Acceptance — Engineering Delivery Report (V2)

**Date:** 2026-07-20  
**Deployed URL:** https://www.fydell.com  
**Proof command:** `npm run test:acceptance-proofs`  
**Full suite:** `npm run test:fde-acceptance`  
**Manifest:** [`acceptance-manifest.json`](../acceptance-manifest.json)  
**Sign-off packet:** [`docs/acceptance-signoff-packet.md`](acceptance-signoff-packet.md)  

---

## Four-state verdict (V2 protocol)

| Tier | Verdict |
|------|---------|
| **S0 catastrophic** | All automated S0 gates **VERIFIED** (canary, preview exclusion, org-deny policy) |
| **S1 pilot blockers (code)** | Core generator/evidence/lifecycle gates **VERIFIED** |
| **S1 production E2E** | **BLOCKED** — `E2E-001` requires deployed private-browser smoke |
| **S2** | Partial (`PROP-*` verified; a11y/perf incomplete) |
| **Claim allowed** | Pilot-ready **prototype with named limitations** — not “adversarially complete on production” until E2E-001 |

\(T_c\) (S0/S1) from last proof run: see manifest `traceability.S0_S1_Tc` (expect ~0.875 with E2E-001 blocked).

---

## Lifecycle (public vocabulary)

| Public | DB |
|--------|-----|
| draft | `draft` |
| validated | `under_review` |
| published | `active` |
| archived | `archived` |

Attempt type alias: `attempt_type` ≡ `attempt_kind` ∈ {`scored`,`preview`,`demonstration`}.

---

## Implemented math (paths + tests + cards)

| Module | Path | Proof / card |
|--------|------|----------------|
| Coverage product | `generator/measurement-planner.ts` | MATH-001, `docs/math-cards/MATH-coverage-product.md` |
| D-optimal logdet | `generator/selection.ts` | GEN-003, MATH-002 |
| Difficulty / ambiguity / CPM / curveball U | `difficulty.ts`, `ambiguity.ts`, `duration-cpm.ts`, `curveball-utility.ts` | generator suite |
| Weight normalize | `role-compiler.ts` | generator suite |
| Neff / SE / Conf | `reliability.ts`, `confidence.ts` | MATH-002, math card |
| AIQ / Adaptability / IG-DE | `aiq.ts`, `adaptability.ts`, `information-gain.ts` | MATH-003 |
| Composite S | `score.ts` | MATH-004, math card |
| Overlay material runtime | `overlay.ts` | GEN-002 |
| Publish gate | `validators.ts` + `lifecycle.ts` | GEN-004 |
| Schema | `blueprint-schema.ts` | SCHEMA-001 |
| Determinism hash | `determinism.ts` | GEN-001 |

---

## Generator comparison

`GEN-002`: saas vs logistics seeds → different `materialDiffSignature`, `data/shipments.csv`, `data/inbox_thread.json`. Evidence: `artifacts/acceptance/GEN-002.json`.

---

## Analysis trace

Events → atoms (event/artifact refs) → trait (\(N_{eff}\), SE, confidence) → composite (arith/geom) → predictHire → report drill-down. Empty AI/curveball → **not observed**.

---

## Preview exclusion

`DATA-001` + Mission Control / simulations filters + `attempt_kind` column.

---

## Security

- SEC-001 canary: **VERIFIED**
- SEC-002 org policy: **VERIFIED** (live two-session attack still recommended on prod)
- RLS structural: `npm run test:rls-smoke`

---

## Env

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (never public), `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_FDE_MARKETPLACE=1`

Migration: `016_attempt_kind.sql` (applied remotely as `attempt_kind_v2`).

---

## Pilot script (5–8 min)

See prior §12 in git history / runbook in `acceptance-signoff-packet.md`. Start empty → generate → quality panel → edit → save → preview → publish → invite → candidate work → evidence → dashboard.

---

## Forbidden claim language (still)

No trained IRT, bias elimination, autonomous hire/reject, or outcome-validated accuracy. Prototype / expert-prior / design-weighted only.
