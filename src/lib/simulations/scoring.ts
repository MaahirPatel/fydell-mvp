/**
 * Evidence-weighted scoring engine for Applied Technical Role simulations.
 *
 * Two evaluation layers feed this module:
 *  - Layer 1: deterministic checks (exact values, reconciliations, mappings)
 *  - Layer 2: anchored rubric evaluation (structured AI judgments with cited evidence)
 *
 * Every function here is pure and unit-tested. No LLM output reaches an
 * employer-facing number without passing through these formulas.
 *
 * Formula reference (k = competency, i = evidence item):
 *   w(i,k)            = rubricWeight(i,k) × sourceReliability(i) × relevance(i,k) × independence(i)
 *   evidenceQuality(k) = Σ[w(i,k) × quality(i)] / Σ[w(i,k)]
 *   coverage(k)        = min(1, Σw(i,k) / targetEvidenceWeight(k))
 *   adjustedScore(k)   = 0.50 + coverage(k) × (evidenceQuality(k) − 0.50)
 *   consistency(k)     = 1 − min(1, weightedStdDev(quality) / 0.50)
 *   confidence(k)      = coverage(k) × (0.50 + 0.50 × consistency(k))
 *   overall            = Σ[competencyWeight(k) × adjustedScore(k)]
 */

export type EvidenceSource = "deterministic" | "authored_rule" | "ai_rubric";

/** Reliability multipliers by evidence source. Deterministic evidence is ground truth. */
export const SOURCE_RELIABILITY: Record<EvidenceSource, number> = {
  deterministic: 1.0,
  authored_rule: 0.9,
  ai_rubric: 0.7,
};

export interface EvidenceItem {
  id: string;
  competencyKey: string;
  /** How much this indicator matters for the competency (rubric-authored, > 0). */
  rubricWeight: number;
  source: EvidenceSource;
  /** 0..1 : how relevant this observation is to the competency. */
  relevance: number;
  /** 0..1 : how well the candidate performed on this indicator. */
  quality: number;
  /**
   * Items produced by the same underlying candidate action share an actionKey.
   * Repeats receive reduced independence weight (1, 1/2, 1/3, … in weight order)
   * so one action cannot flood a competency with correlated evidence.
   */
  actionKey: string;
  /** Human-readable indicator label, carried through to reports. */
  indicator: string;
  /** Supporting event ids / excerpts, carried through to reports. */
  eventIds?: string[];
  excerpts?: string[];
  counterevidence?: string | null;
  explanation?: string | null;
  /** Evaluator self-reported confidence (only for ai_rubric items), 0..1. */
  evaluatorConfidence?: number;
}

export interface CompetencySpec {
  key: string;
  label: string;
  /** Weight in the overall summary. All weights across a rubric must total 1.0. */
  weight: number;
  /** Σw needed before we consider the competency fully covered. */
  targetEvidenceWeight: number;
  /** Role-critical competencies cap the recommendation when they fail. */
  critical?: boolean;
}

export type EvidenceBand =
  | "strong"
  | "established"
  | "developing"
  | "limited"
  | "insufficient";

export const BAND_LABELS: Record<EvidenceBand, string> = {
  strong: "Strong evidence",
  established: "Established evidence",
  developing: "Developing evidence",
  limited: "Limited evidence",
  insufficient: "Insufficient evidence",
};

export interface CompetencyResult {
  key: string;
  label: string;
  weight: number;
  critical: boolean;
  evidenceCount: number;
  totalWeight: number;
  evidenceQuality: number;
  coverage: number;
  adjustedScore: number;
  consistency: number;
  confidence: number;
  band: EvidenceBand;
  /** The evidence items (with computed weights) that produced this result. */
  items: WeightedEvidenceItem[];
}

export interface WeightedEvidenceItem extends EvidenceItem {
  independence: number;
  weight: number;
}

export type Recommendation =
  | "advance"
  | "review"
  | "further_evidence_required";

export interface AnalysisSummary {
  competencies: CompetencyResult[];
  /** Internal calibration value; employer-facing UI should emphasize bands. */
  overall: number;
  recommendation: Recommendation;
  cappedByCritical: string | null;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Assign independence multipliers: within each actionKey group, items ordered
 * by descending base weight receive 1, 1/2, 1/3, …
 */
export function assignIndependence(items: EvidenceItem[]): WeightedEvidenceItem[] {
  const groups = new Map<string, EvidenceItem[]>();
  for (const item of items) {
    const list = groups.get(item.actionKey) || [];
    list.push(item);
    groups.set(item.actionKey, list);
  }
  const out: WeightedEvidenceItem[] = [];
  for (const list of groups.values()) {
    const sorted = [...list].sort(
      (a, b) =>
        b.rubricWeight * SOURCE_RELIABILITY[b.source] * b.relevance -
        a.rubricWeight * SOURCE_RELIABILITY[a.source] * a.relevance
    );
    sorted.forEach((item, idx) => {
      const independence = 1 / (idx + 1);
      const weight =
        item.rubricWeight *
        SOURCE_RELIABILITY[item.source] *
        clamp01(item.relevance) *
        independence;
      out.push({ ...item, independence, weight });
    });
  }
  return out;
}

/** Weighted standard deviation of item quality. */
export function weightedStdDev(items: WeightedEvidenceItem[]): number {
  const totalW = items.reduce((s, i) => s + i.weight, 0);
  if (totalW <= 0 || items.length < 2) return 0;
  const mean = items.reduce((s, i) => s + i.weight * i.quality, 0) / totalW;
  const variance =
    items.reduce((s, i) => s + i.weight * (i.quality - mean) ** 2, 0) / totalW;
  return Math.sqrt(variance);
}

export function bandFor(adjustedScore: number, confidence: number): EvidenceBand {
  if (confidence < 0.45) return "insufficient";
  if (adjustedScore >= 0.8 && confidence >= 0.65) return "strong";
  if (adjustedScore >= 0.65) return "established";
  if (adjustedScore >= 0.5) return "developing";
  return "limited";
}

export function scoreCompetency(
  spec: CompetencySpec,
  evidence: EvidenceItem[]
): CompetencyResult {
  const relevant = evidence.filter((e) => e.competencyKey === spec.key);
  const weighted = assignIndependence(relevant);
  const totalWeight = weighted.reduce((s, i) => s + i.weight, 0);

  const evidenceQuality =
    totalWeight > 0
      ? weighted.reduce((s, i) => s + i.weight * clamp01(i.quality), 0) / totalWeight
      : 0.5;

  const coverage =
    spec.targetEvidenceWeight > 0
      ? Math.min(1, totalWeight / spec.targetEvidenceWeight)
      : 0;

  const adjustedScore = 0.5 + coverage * (evidenceQuality - 0.5);
  const consistency = 1 - Math.min(1, weightedStdDev(weighted) / 0.5);
  const confidence = coverage * (0.5 + 0.5 * consistency);

  return {
    key: spec.key,
    label: spec.label,
    weight: spec.weight,
    critical: Boolean(spec.critical),
    evidenceCount: weighted.length,
    totalWeight,
    evidenceQuality,
    coverage,
    adjustedScore,
    consistency,
    confidence,
    band: bandFor(adjustedScore, confidence),
    items: weighted.sort((a, b) => b.weight - a.weight),
  };
}

/**
 * Score all competencies and compute the internal overall summary.
 * If a role-critical competency falls below 0.40 adjusted score, the
 * employer-facing recommendation is capped at "further evidence required" :
 * strong communication cannot erase a critical technical or safety failure.
 */
export function analyze(
  specs: CompetencySpec[],
  evidence: EvidenceItem[]
): AnalysisSummary {
  const totalSpecWeight = specs.reduce((s, c) => s + c.weight, 0);
  if (Math.abs(totalSpecWeight - 1) > 0.001) {
    throw new Error(
      `Competency weights must total 1.00 (got ${totalSpecWeight.toFixed(3)})`
    );
  }
  const competencies = specs.map((spec) => scoreCompetency(spec, evidence));
  const overall = competencies.reduce((s, c) => s + c.weight * c.adjustedScore, 0);

  const failedCritical = competencies.find(
    (c) => c.critical && c.adjustedScore < 0.4
  );

  let recommendation: Recommendation;
  if (failedCritical) {
    recommendation = "further_evidence_required";
  } else if (overall >= 0.72 && !competencies.some((c) => c.band === "insufficient")) {
    recommendation = "advance";
  } else {
    recommendation = "review";
  }

  return {
    competencies,
    overall,
    recommendation,
    cappedByCritical: failedCritical ? failedCritical.key : null,
  };
}

/**
 * Validate structured AI-evaluator output. Rejects entries without evidence
 * references : an opaque judgment is never allowed to become evidence.
 */
export interface RubricEvaluationEntry {
  competency: string;
  indicator: string;
  rating: number;
  eventIds: string[];
  excerpts: string[];
  counterevidence: string | null;
  explanation: string;
  evaluatorConfidence: number;
}

export function validateRubricOutput(raw: unknown): RubricEvaluationEntry[] {
  if (!Array.isArray(raw)) throw new Error("Evaluator output must be an array");
  const entries: RubricEvaluationEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const competency = typeof o.competency === "string" ? o.competency : "";
    const indicator = typeof o.indicator === "string" ? o.indicator : "";
    const rating = typeof o.rating === "number" ? o.rating : NaN;
    const eventIds = Array.isArray(o.eventIds)
      ? o.eventIds.filter((x): x is string => typeof x === "string")
      : [];
    const excerpts = Array.isArray(o.excerpts)
      ? o.excerpts.filter((x): x is string => typeof x === "string")
      : [];
    const explanation = typeof o.explanation === "string" ? o.explanation : "";
    const evaluatorConfidence =
      typeof o.evaluatorConfidence === "number" ? clamp01(o.evaluatorConfidence) : 0.5;

    if (!competency || !indicator) continue;
    if (!Number.isFinite(rating) || rating < 0 || rating > 1) continue;
    // Hard requirement: evidence references or excerpts must be present.
    if (eventIds.length === 0 && excerpts.length === 0) continue;

    entries.push({
      competency,
      indicator,
      rating,
      eventIds,
      excerpts,
      counterevidence:
        typeof o.counterevidence === "string" ? o.counterevidence : null,
      explanation,
      evaluatorConfidence,
    });
  }
  return entries;
}
