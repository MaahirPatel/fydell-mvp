# V2 Adversarial Sign-off Packet

**Generated:** see `acceptance-manifest.json` → `generatedAt`  
**Deployed URL:** https://www.fydell.com  
**Commit:** working tree (run proofs with `ACCEPTANCE_COMMIT=$(git rev-parse HEAD)` after commit)  
**Environment for automated proofs:** local  

## How to regenerate

```bash
npm run test:fde-acceptance
# or proofs only:
ACCEPTANCE_COMMIT=$(git rev-parse HEAD) npm run test:acceptance-proofs
```

## Packet contents

| Required item | Location | Status |
|---------------|----------|--------|
| acceptance-manifest.json | `/acceptance-manifest.json` | Present |
| Commit SHA + URL | manifest `commit`, `deployedUrl` | Present |
| Env inventory (secrets redacted) | `.env.example` + `docs/pilot-production-setup.md` | Present |
| Build/typecheck/tests | `npm run test:fde-acceptance` + `build:next` | Run locally |
| S0/S1 automated report | `artifacts/acceptance/*.json` | Present |
| Accessibility report | — | **IMPLEMENTED_UNVERIFIED** (A11Y-001) |
| Security abuse-case | SEC-001/002 + `test:rls-smoke` | Partial (live cross-tenant E2E still needed) |
| Performance measurements | — | **NOT_STARTED** (PERF-001) |
| Two-config generator differential | GEN-002 | **VERIFIED** |
| Determinism hash | GEN-001 | **VERIFIED** |
| Hidden-answer canary | SEC-001 | **VERIFIED** |
| Cross-tenant denial | SEC-002 (policy) + RLS structural | Partial |
| Autosave/reconnect | CHAOS-001 | **IMPLEMENTED_UNVERIFIED** |
| Preview exclusion | DATA-001 | **VERIFIED** |
| Event→claim provenance | analysis + report UI | Code path present |
| Formula cards | `docs/math-cards/*` | Present |
| Mutation detection | MUT-001 | **VERIFIED** |
| Pilot runbook | `docs/acceptance-delivery-report.md` §12 | Present |

## Traceability

See manifest `traceability.S0_S1_Tc`. Target for calling “release-ready without named limitations” is \(T_c=1.0\) on S0/S1.

Current named limitations that keep \(T_c<1\):

1. **E2E-001 (S1 BLOCKED):** production private-browser lifecycle not re-executed after this working tree.
2. **CHAOS-001 (S1 IMPLEMENTED_UNVERIFIED):** submit idempotency exists; chaos harness not run.

## Absolute questions (honest)

| Question | Answer |
|----------|--------|
| Zero fabricated employer data? | **YES** |
| Employer intent alters candidate environment? | **YES** (GEN-002) |
| Candidate finishes despite refresh/provider failure? | **PARTIAL** — refresh path implemented; chaos not proven |
| Every conclusion → immutable evidence? | **YES** for scored traits with atoms; sparse → insufficient |
| Uncertainty rises when sparse/contradictory? | **YES** |
| Refuse to score without opportunity? | **YES** (`not_observed`, AIQ/adaptability) |
| Fail honestly? | **YES** for publish gate / missing evidence; chaos incomplete |
| Math reproducible? | **YES** |
| HR buyer understands without black box? | Needs live pilot feedback |
| Demonstrated on deployed build? | **NO until E2E-001** |

**Label until E2E-001 is VERIFIED:** deeply instrumented **prototype / pilot candidate**, not “fully adversarially verified on production.”
