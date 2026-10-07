/**
 * Employer chunk - REP-01 (decision brief from real data) and REP-03
 * (separated result categories, no universal hireability number).
 *
 * The brief is assembled only from supplied analysis artifacts. Every claim
 * in the brief must trace to a finding with sources; limitations are stated
 * explicitly. The output contains no aggregate score: `assertNoGlobalScore`
 * is exported so tests (and routes) can prove it.
 */

import {
  BAND_LABEL,
  CATEGORY_LABEL,
  type Band,
  type CompetencyResult,
  type DecisionBrief,
  type Finding,
  type ResultCategory,
} from "./types";

export interface AssembleInput {
  reportId: string;
  reportVersion: number;
  candidateName: string | null;
  candidateEmail: string;
  roleTitle: string;
  roleKey: string;
  scenarioTitle: string;
  scenarioVersion: string;
  rubricVersion: string;
  invitationId: string;
  sessionId: string;
  competencies: CompetencyResult[];
  findings: Omit<Finding, "flagged" | "flagReason">[];
  limitations: string[];
  interviewFollowUps: string[];
}

const CATEGORY_ORDER: ResultCategory[] = ["coding", "interpretation", "communication", "infrastructure"];

function rollupBand(bands: Band[]): Band {
  // Conservative rollup: the category band is the weakest observed band,
  // never an average. "not_observed" bands are ignored unless all are.
  const observed = bands.filter((b) => b !== "not_observed");
  if (observed.length === 0) return "not_observed";
  const rank: Record<Band, number> = {
    strong: 4,
    adequate: 3,
    developing: 2,
    insufficient: 1,
    not_observed: 0,
  };
  return observed.sort((a, b) => rank[a] - rank[b])[0];
}

export function assembleDecisionBrief(input: AssembleInput): DecisionBrief {
  const findings: Finding[] = input.findings.map((f) => ({
    ...f,
    flagged: false,
    flagReason: null,
  }));

  const categories = CATEGORY_ORDER.map((category) => {
    const comps = input.competencies.filter((c) => c.category === category);
    const band = rollupBand(comps.map((c) => c.band));
    const findingIds = findings.filter((f) => f.category === category).map((f) => f.id);
    const summary =
      comps.length > 0
        ? comps.map((c) => `${c.competency}: ${BAND_LABEL[c.band]}`).join("; ")
        : "No competency evidence in this category.";
    return { category, band, summary, findingIds };
  });

  const strengths = findings.filter((f) => f.severity === "strength").map((f) => f.title);
  const gaps = findings.filter((f) => f.severity === "gap").map((f) => f.title);

  const brief = [
    `${input.candidateName ?? input.candidateEmail} completed "${input.scenarioTitle}" for the ${input.roleTitle} role ` +
      `(scenario ${input.scenarioVersion}, rubric ${input.rubricVersion}).`,
    strengths.length > 0
      ? `Demonstrated strengths: ${strengths.join("; ")}.`
      : "No clear strengths were demonstrated against the rubric.",
    gaps.length > 0
      ? `Material gaps: ${gaps.join("; ")}.`
      : "No material gaps were flagged against the rubric.",
    ...input.limitations.map((l) => `Limitation: ${l}`),
  ].join(" ");

  return {
    reportId: input.reportId,
    reportVersion: input.reportVersion,
    candidateName: input.candidateName,
    candidateEmail: input.candidateEmail,
    roleTitle: input.roleTitle,
    roleKey: input.roleKey,
    scenarioTitle: input.scenarioTitle,
    scenarioVersion: input.scenarioVersion,
    rubricVersion: input.rubricVersion,
    invitationId: input.invitationId,
    sessionId: input.sessionId,
    brief,
    categories,
    findings,
    limitations: input.limitations,
    interviewFollowUps: input.interviewFollowUps,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * REP-03 guard: the serialized brief must not contain a universal
 * hireability-style aggregate. Tests assert this over real assembled
 * reports; routes call it before serving.
 */
const FORBIDDEN_AGGREGATE_KEYS = [
  "hireability",
  "hireabilityScore",
  "overallScore",
  "totalScore",
  "hiringScore",
  "candidateScore",
];

export function assertNoGlobalScore(report: DecisionBrief): { ok: true } | { ok: false; keys: string[] } {
  const found = FORBIDDEN_AGGREGATE_KEYS.filter((k) =>
    Object.prototype.hasOwnProperty.call(report, k)
  );
  return found.length === 0 ? { ok: true } : { ok: false, keys: found };
}
