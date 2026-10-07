import type { AssessmentState, RubricCriterion, RubricDimension, RubricLevel } from "./scenarios/types";
import type { CriterionAssessment, Finding, ProbeResult } from "./types";

export const STATE_LABEL: Record<RubricLevel, string> = {
  concern_observed: "Concern observed",
  partially_demonstrated: "Partially demonstrated",
  demonstrated: "Demonstrated",
  demonstrated_additional: "Demonstrated under additional constraints",
  not_assessed: "Not assessed",
  strong: "Strong",
  adequate: "Adequate",
  weak: "Weak",
  insufficient_evidence: "Insufficient evidence",
};

export const ASSESSMENT_STATES: AssessmentState[] = [
  "concern_observed",
  "partially_demonstrated",
  "demonstrated",
  "demonstrated_additional",
  "not_assessed",
];

export function isAssessmentState(value: unknown): value is AssessmentState {
  return typeof value === "string" && (ASSESSMENT_STATES as string[]).includes(value);
}

export type CriterionDef = RubricCriterion & { dimension: Finding["dimension"] };

export function criteriaOf(rubric: RubricDimension[]): CriterionDef[] {
  return rubric.flatMap((d) => (d.criteria ?? []).map((c) => ({ ...c, dimension: d.key })));
}

/** Levels the rubric allows for a dimension; v2 rubrics use the assessment scale. */
export function levelsFor(dimension: RubricDimension): RubricLevel[] {
  return dimension.anchors.map((a) => a.level);
}

/** Counts the defined checks behind a criterion. Probes that did not produce a pass or fail count as not run. */
export function observedFor(def: RubricCriterion, results: ProbeResult[]): CriterionAssessment["observed"] {
  if (def.probeIds.length === 0) return null;
  const byId = new Map(results.map((r) => [r.id, r.outcome]));
  let passed = 0;
  let notRun = 0;
  for (const id of def.probeIds) {
    const outcome = byId.get(id);
    if (outcome === "passed") passed++;
    else if (outcome === undefined || outcome === "no_result" || outcome === "timeout" || outcome === "output_limit") notRun++;
  }
  return { passed, total: def.probeIds.length, notRun };
}

/** A starting point for the reviewer. Probe-less criteria start as not assessed until a reviewer judges them. */
export function suggestState(observed: CriterionAssessment["observed"]): AssessmentState {
  if (!observed || observed.notRun === observed.total) return "not_assessed";
  if (observed.passed === observed.total) return "demonstrated";
  if (observed.passed === 0) return "concern_observed";
  return "partially_demonstrated";
}

/** Plain sentence for an observed result, with its denominator. */
export function observedSentence(observed: NonNullable<CriterionAssessment["observed"]>): string {
  const ran = observed.total - observed.notRun;
  const base = `${observed.passed} of ${observed.total} defined case${observed.total === 1 ? "" : "s"} passed`;
  return observed.notRun > 0 ? `${base}; ${observed.notRun} did not produce a result (${ran} ran)` : base;
}

/**
 * Checks the reviewer's states against what the defined checks showed. A state
 * can go beyond the checks only where the checks allow it: "demonstrated"
 * needs every defined case to pass, a concern needs a failing case, and a
 * criterion whose checks all ran cannot be hidden as "not assessed".
 */
export function criterionProblems(defs: CriterionDef[], given: CriterionAssessment[] | undefined): string[] {
  if (defs.length === 0) return [];
  const problems: string[] = [];
  const byId = new Map((given ?? []).map((c) => [c.id, c]));
  for (const def of defs) {
    const c = byId.get(def.id);
    if (!c) {
      problems.push(`Assess the criterion "${def.label}".`);
      continue;
    }
    if (c.state !== "not_assessed" && !c.rationale.trim()) problems.push(`"${def.label}": explain the state in terms of its anchors.`);
    const o = c.observed;
    if (!o) continue;
    const ran = o.total - o.notRun;
    if ((c.state === "demonstrated" || c.state === "demonstrated_additional") && o.passed < o.total) {
      problems.push(`"${def.label}": ${observedSentence(o)}, so it cannot be marked demonstrated.`);
    }
    if (c.state === "concern_observed" && o.passed === o.total) {
      problems.push(`"${def.label}": every defined case passed. Record a concern from reading the code as a finding marked hypothesis instead.`);
    }
    if (c.state === "not_assessed" && ran === o.total) {
      problems.push(`"${def.label}": all ${o.total} defined cases ran, so the result has to be reported rather than marked not assessed.`);
    }
  }
  return problems;
}
