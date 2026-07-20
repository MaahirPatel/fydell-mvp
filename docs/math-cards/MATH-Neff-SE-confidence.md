# Math card: \(N^{eff}\), SE, confidence decomposition

**Formula IDs:** `MATH-Neff`, `MATH-SE`, `MATH-Conf`  
**Modules:** `src/lib/fde/evidence/reliability.ts`, `confidence.ts`  
**Version:** `evidence-formula-v2`  
**Parameter source:** expert priors (`CONF_TAU`, `SE_PRIOR_*`).

## \(N_k^{eff}\) (Kish)
\[
N^{eff}=\frac{(\sum w_i)^2}{\sum w_i^2+\epsilon}
\]
Weights \(w_i=\) relevance × reliability on independence-capped representatives. Never exceeds raw count.

## SE
Stabilized standard error from estimate and \(N^{eff}\); intervals clipped to [0,1].

## Confidence
\[
Conf=(1-e^{-N^{eff}/\tau})(1-SE^*)\,Diversity\,Provenance
\]
Not equal to score magnitude. Components inspectable in report drill-down.

## Counterexample
Empty evidence → sufficiency ≈ 0 → low confidence, not “50% confident.”

## UI
PredictiveHirePanel trait expand → N_eff, SE, confidence components.

## Tests
`scripts/test-evidence-math.ts`, `run-acceptance-proofs.ts` (`MATH-002`, `PROP-002`, `MUT-001`).
