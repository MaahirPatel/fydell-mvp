# Math card: Coverage product \(C_k\)

**Formula ID:** `MATH-coverage-product`  
**LaTeX:** \(C_k(M)=1-\prod_{m\in M}(1-B_{km})\)  
**Module:** `src/lib/fde/generator/measurement-planner.ts` → `coverageProduct`  
**Version:** measurement-planner (compiler `fde-generator-compile-v2`)  
**Parameter source:** curated episode loadings \(B_{km}\) (expert catalog), not per-candidate fabrication.

## Purpose
Measure how strongly a selected module set elicits competency \(k\), with diminishing returns for repeated weak evidence.

## Variables
| Symbol | Type | Domain | Null | Provenance |
|--------|------|--------|------|------------|
| \(B_{km}\) | number | [0,1] | treated as 0 | Episode catalog loadings |
| \(M\) | set | modules | empty → \(C_k=0\) | `planModules` / D-optimal selection |
| \(C_k\) | number | [0,1] | — | computed |

## Assumptions
Loadings are expert priors. Product form assumes conditional independence of “miss” events across modules.

## Worked example
\(B=0.7\), \(B=0.2\) → \(C=1-(0.3)(0.8)=0.76\).

## Counterexample (when not to use)
Do not treat \(C_k\) as empirical pass probability or predictive validity.

## UI
Studio quality panel coverage bars; publish gate when critical \(C_k < 0.70\).

## Tests
`scripts/test-fde-generator.ts`, `scripts/run-acceptance-proofs.ts` (`MATH-001`, `PROP-001`).
