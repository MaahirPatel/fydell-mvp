# Math card: Composite role alignment \(S\)

**Formula ID:** `MATH-composite-S`  
**Module:** `src/lib/fde/evidence/score.ts` → `compositeFitScore`  
**Version:** `evidence-formula-v2`  
**Parameters:** `COMPOSITE_ALPHA=0.65` (expert prior).

\[
S_{arith}=\sum_k\omega_k^*z_k,\quad
S_{geom}=\exp\left(\sum_k\omega_k^*\log(\epsilon+z_k)\right),\quad
S=\alpha S_{arith}+(1-\alpha)S_{geom}
\]

Critical-gap / insufficient-evidence suppression: `fitScore100=null` when observed traits < 2 or mean \(N^{eff}\) too low.

## Counterexample
Do not treat \(S\) as validated hire probability. Prediction panel remains `prototype_unvalidated`.

## UI
Evidence report fit score + arith/geom components; methodology copy.

## Tests
`scripts/test-predictive-hire.ts`, `run-acceptance-proofs.ts` (`MATH-004`).
