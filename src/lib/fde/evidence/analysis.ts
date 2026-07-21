/**
 * Full session analysis: events (+ workspace notes) → atoms → 10 trait
 * scores → composite fit → predictive hire → employer-facing findings.
 */
import { eventsToAtoms, type EventsToAtomsOptions } from "./atoms";
import { opportunityFlagsFromEvents } from "./opportunity";
import { compositeFitScore, type CompositeFit, type TraitBucket, type TraitResult } from "./score";
import { predictHire, type PredictiveHire } from "./predict";
import type { EvidenceAtomInput, RelayEventLike } from "./types";
import { FORMULA_VERSION, POLICY_VERSION } from "./reliability";
import type { TraitId } from "./traits";
import {
  LIMITATION_LANGUAGE_RE,
  PRIORITIZATION_RE,
  RECOMMENDATION_RE,
  VERIFICATION_LANGUAGE_RE,
} from "./signals";
import { computeProcessQuality, type ProcessQuality } from "./process-quality";
import { computeAiQuality, type AiQualityResult } from "./aiq";
import { computeAdaptability, type AdaptabilityResult } from "./adaptability";
import {
  DEFAULT_HYPOTHESIS_PROBS,
  diagnosticEfficiency,
  informationGain,
} from "./information-gain";
import { clampFinite } from "./reliability";
import { commandOf, payloadHasIntegritySignal, textOf } from "./signals";
import {
  atomsFromEngineEvents,
  scoreCompetency,
  type CompetencyReport,
} from "@/lib/relay/workspace/evidence-credibility";
import { roleFit, emptyCapabilityVector, type CapabilityId } from "@/lib/relay/workspace/scoring";

export type AnalysisFinding = {
  /** Kept as `dimension` (not `traitId`) — this is the column name in
   * fde_evidence_findings and the key the employer UI keys off of. */
  dimension: TraitId;
  observation: string;
  interpretation: string;
  confidence: "low" | "medium" | "high";
  limitation: string;
  event_ids: string[];
  artifact_ids: string[];
  score100: number | null;
  bucket: TraitBucket;
  opportunityFlag: boolean;
};

export type InterviewFollowup = {
  traitId: TraitId;
  label: string;
  prompt: string;
  /** Event IDs that motivated this follow-up, when available. */
  eventIds?: string[];
  why?: string;
};

export type DiagnosticEfficiencyResult = {
  /** Information gain in bits from prior → posterior proxy. */
  totalIG: number;
  /** DE = IG / (aT + bC + gR + ε), finite ≥ 0. */
  efficiency: number;
  timeNorm: number;
  changeNorm: number;
  redundancyNorm: number;
};

export type SessionAnalysis = {
  atoms: EvidenceAtomInput[];
  traits: TraitResult[];
  composite: CompositeFit;
  prediction: PredictiveHire;
  findings: AnalysisFinding[];
  interviewFollowups: InterviewFollowup[];
  processQuality: ProcessQuality;
  aiQuality: AiQualityResult;
  adaptability: AdaptabilityResult;
  diagnosticEfficiency: DiagnosticEfficiencyResult;
  validationMaturity: "design_weighted";
  policyVersion: string;
  formulaVersion: string;
  /** Workspace-engine credibility reports (employer-only; not candidate-visible scores). */
  workspaceCredibility: CompetencyReport[];
  /** Provisional Fit_r — never claim predictive validity without outcome data. */
  provisionalRoleFit: { fit: number; provisional: true };
};

/**
 * Session-level diagnostic efficiency proxy: IG from curated priors toward a
 * posterior shaped by observed integrity / contradiction / verification events,
 * divided by normalized time / change / redundancy costs.
 */
function computeSessionDiagnosticEfficiency(events: RelayEventLike[]): DiagnosticEfficiencyResult {
  const before = [...DEFAULT_HYPOTHESIS_PROBS];
  // Posterior proxy: concentrate mass when integrity or contradiction evidence appears.
  let after = [...before];
  const blob = events.map((e) => textOf(e.payload)).join(" ").toLowerCase();
  const hasIntegrity =
    events.some(
      (e) =>
        e.event_type === "command_run" &&
        (commandOf(e.payload) === "reconcile" || payloadHasIntegritySignal(e.payload))
    ) || /schema|mismatch|join|format/.test(blob);
  const hasContradiction = /ops|vp|dashboard|contradict/.test(blob);
  const hasVerify = events.some(
    (e) =>
      e.event_type === "command_run" &&
      /^(test|pytest|evals)$/.test(commandOf(e.payload))
  );

  if (hasIntegrity || hasContradiction || hasVerify) {
    const boost = (hasIntegrity ? 0.35 : 0) + (hasContradiction ? 0.15 : 0) + (hasVerify ? 0.1 : 0);
    after = before.map((p, i) => (i === 0 ? p + boost : Math.max(0.02, p - boost / 3)));
    const sum = after.reduce((s, p) => s + p, 0) || 1;
    after = after.map((p) => p / sum);
  }

  const totalIG = informationGain(before, after);
  const n = Math.max(events.length, 1);
  const timeNorm = clampFinite(n / 40, 0, 1);
  const changeNorm = clampFinite(
    events.filter((e) => e.event_type === "curveball_revealed" || e.event_type === "plan_updated").length / 3,
    0,
    1
  );
  const uniqueTypes = new Set(events.map((e) => e.event_type)).size;
  const redundancyNorm = clampFinite(1 - uniqueTypes / n, 0, 1);
  const efficiency = diagnosticEfficiency({ totalIG, timeNorm, changeNorm, redundancyNorm });

  return { totalIG, efficiency, timeNorm, changeNorm, redundancyNorm };
}

function confidenceFromBucket(trait: TraitResult): "low" | "medium" | "high" {
  if (trait.bucket === "not_observed" || trait.bucket === "limited_evidence") return "low";
  if (trait.bucket === "strong_evidence" && trait.reliability >= 0.6) return "high";
  return "medium";
}

function limitationTextFor(trait: TraitResult): string {
  if (trait.bucket === "not_observed") {
    return "The scenario never presented this trait's trap and the candidate never created the opportunity — inconclusive, not negative.";
  }
  if (trait.bucket === "needs_review" || trait.independentCount < 2) {
    return "Fewer than two independent evidence moments — treat as inconclusive, not negative. Use the paired interview follow-up to calibrate.";
  }
  return `Computed with ${POLICY_VERSION} / ${FORMULA_VERSION}; score is shrunk toward a neutral prior based on independent evidence count.`;
}

function findingFromTrait(trait: TraitResult): AnalysisFinding {
  const topSummaries = trait.summaries.slice(0, 3).join(" ");
  const scoreText =
    trait.score100 == null
      ? "Not observed — the scenario or the candidate never created this opportunity."
      : `Trait score ${trait.score100}/100 · bucket: ${trait.bucket.replace(/_/g, " ")} (${trait.independentCount} independent moment${trait.independentCount === 1 ? "" : "s"}).`;

  return {
    dimension: trait.traitId,
    observation: topSummaries || `No behavioral atoms recorded for ${trait.label}.`,
    interpretation: scoreText,
    confidence: confidenceFromBucket(trait),
    limitation: limitationTextFor(trait),
    event_ids: trait.eventRefs,
    artifact_ids: trait.artifactRefs,
    score100: trait.score100,
    bucket: trait.bucket,
    opportunityFlag: trait.opportunityFlag,
  };
}

const INTERVIEW_FOLLOWUP_TEMPLATES: Record<TraitId, (trait: TraitResult) => string> = {
  elicitation: () =>
    "Walk me through what you believed the real problem was at minute five versus at submission — what question, if any, changed your mind?",
  contradiction_handling: () =>
    "Ops, the VP, and the dashboard told slightly different stories in this scenario. What did you conclude was actually true, and how did you get there?",
  data_integrity_vigilance: () =>
    "Was there a point where you weren't sure you could trust the data? What would you have checked with more time?",
  scope_renegotiation: () =>
    "After the mid-session change, what did you explicitly decide was now out of scope, and how did you communicate that?",
  technical_execution: (t) =>
    t.bucket === "not_observed"
      ? "Walk me through how you'd validate a fix like this before shipping it to production."
      : "Walk me through one change you made, how you verified it, and what you'd still want to check with more time.",
  ai_tool_judgment: () =>
    "Tell me about a time an AI suggestion looked right but wasn't — how did you catch it?",
  verification_discipline: (t) =>
    t.bucket === "not_observed"
      ? "How would you have verified this solution before handing it off, given more time?"
      : "What specifically did you check before calling this done, and what did you not have time to check?",
  limitation_honesty: () =>
    "What's the one thing about this solution you'd flag to your manager as not fully verified?",
  prioritization_under_pressure: () =>
    "When the requirements shifted mid-session, what did you consciously decide to stop working on, and why?",
  communication_translation: () =>
    "If you had to explain this recommendation to a non-technical stakeholder in two sentences, what would you say?",
};

function buildInterviewFollowups(traits: TraitResult[]): InterviewFollowup[] {
  const priority = traits
    .filter((t) => t.bucket === "needs_review" || t.bucket === "limited_evidence")
    .sort((a, b) => {
      const rank = (t: TraitResult) =>
        t.bucket === "limited_evidence" ? 0 : t.bucket === "needs_review" ? 1 : 2;
      return rank(a) - rank(b);
    });

  const selected = priority.slice(0, 5);
  // Ensure at least 3 follow-ups when possible by including strong traits with open questions.
  if (selected.length < 3) {
    for (const t of traits) {
      if (selected.some((s) => s.traitId === t.traitId)) continue;
      if (t.bucket === "not_observed") continue;
      selected.push(t);
      if (selected.length >= 3) break;
    }
  }

  return selected.map((t) => ({
    traitId: t.traitId,
    label: t.label,
    prompt: INTERVIEW_FOLLOWUP_TEMPLATES[t.traitId](t),
    eventIds: t.eventRefs.slice(0, 4),
    why:
      t.bucket === "limited_evidence"
        ? "Limited observable evidence on this trait — calibrate in interview."
        : t.bucket === "needs_review"
          ? "Mixed or sparse evidence — resolve before a hiring decision."
          : "Useful probe tied to observed work moments.",
  }));
}

export type AnalyzeSessionOptions = EventsToAtomsOptions & {
  /** Optional workspace plan/handoff/notes text to mint additional (text-based) atoms. */
  planText?: string;
  handoffText?: string;
  /** Optional "what we know / what we don't know yet" workspace notes, when the candidate used them. */
  knownsText?: string;
  unknownsText?: string;
};

function makeTextAtom(
  sessionId: string,
  traitId: TraitId,
  opts: {
    direction: EvidenceAtomInput["direction"];
    magnitude: number;
    relevance: number;
    independenceGroup: string;
    summary: string;
  }
): EvidenceAtomInput {
  return {
    sessionId,
    dimensionId: traitId,
    direction: opts.direction,
    magnitude: opts.magnitude,
    relevance: opts.relevance,
    reliability: 0.75,
    independenceGroup: opts.independenceGroup,
    sourceKind: "behavioral_heuristic",
    summary: opts.summary,
    // Text atoms cite the workspace note artifact when no discrete event exists.
    eventRefs: [],
    artifactRefs: [`workspace:notes/${opts.independenceGroup}`],
  };
}

/** Enrich event-derived atoms with workspace-note evidence (behavioral, not volume). */
function enrichContextualAtoms(atoms: EvidenceAtomInput[], opts: AnalyzeSessionOptions): EvidenceAtomInput[] {
  const extra: EvidenceAtomInput[] = [...atoms];
  const plan = (opts.planText || "").trim();
  const handoff = (opts.handoffText || "").trim();
  const knowns = (opts.knownsText || "").trim();
  const unknowns = (opts.unknownsText || "").trim();

  if (plan.length >= 30) {
    extra.push(
      makeTextAtom(opts.sessionId, "verification_discipline", {
        direction: "supporting",
        magnitude: 0.5,
        relevance: 0.5,
        independenceGroup: "verification_discipline:plan_test_strategy",
        summary: "Documented a test/verification strategy in the plan before implementation.",
      })
    );
    extra.push(
      makeTextAtom(opts.sessionId, "prioritization_under_pressure", {
        direction: PRIORITIZATION_RE.test(plan) ? "supporting" : "mixed",
        magnitude: PRIORITIZATION_RE.test(plan) ? 0.5 : 0.35,
        relevance: 0.5,
        independenceGroup: "prioritization_under_pressure:plan_risk_notes",
        summary: "Captured scoping/risk notes in the plan panel.",
      })
    );
  }

  if (handoff.length >= 30) {
    const hasVerificationLanguage = VERIFICATION_LANGUAGE_RE.test(handoff);
    extra.push(
      makeTextAtom(opts.sessionId, "verification_discipline", {
        direction: hasVerificationLanguage ? "supporting" : "mixed",
        magnitude: hasVerificationLanguage ? 0.6 : 0.35,
        relevance: 0.6,
        independenceGroup: "verification_discipline:handoff_verification_language",
        summary: hasVerificationLanguage
          ? "Handoff states what was verified and how."
          : "Handoff exists but doesn't state what was actually verified.",
      })
    );

    const hasLimitationLanguage = LIMITATION_LANGUAGE_RE.test(handoff);
    extra.push(
      makeTextAtom(opts.sessionId, "limitation_honesty", {
        direction: hasLimitationLanguage ? "supporting" : "counter",
        magnitude: hasLimitationLanguage ? 0.6 : 0.5,
        relevance: 0.65,
        independenceGroup: "limitation_honesty:name_limitations_in_handoff",
        summary: hasLimitationLanguage
          ? "Handoff names a specific limitation, risk, or thing left unverified."
          : "Handoff claims completion with no named limitation or residual risk.",
      })
    );

    const hasRecommendation = RECOMMENDATION_RE.test(handoff);
    extra.push(
      makeTextAtom(opts.sessionId, "communication_translation", {
        direction: hasRecommendation ? "supporting" : "mixed",
        magnitude: hasRecommendation ? 0.55 : 0.35,
        relevance: 0.55,
        independenceGroup: "communication_translation:plain_language_recommendation",
        summary: hasRecommendation
          ? "Handoff includes an explicit recommendation / next step."
          : "Handoff doesn't clearly state a recommendation or next step.",
      })
    );
  }

  if (knowns.length >= 20) {
    extra.push(
      makeTextAtom(opts.sessionId, "elicitation", {
        direction: "supporting",
        magnitude: 0.5,
        relevance: 0.5,
        independenceGroup: "elicitation:documented_knowns",
        summary: "Documented what was learned about the requirements in workspace notes.",
      })
    );
  }

  if (unknowns.length >= 20) {
    extra.push(
      makeTextAtom(opts.sessionId, "limitation_honesty", {
        direction: "supporting",
        magnitude: 0.55,
        relevance: 0.55,
        independenceGroup: "limitation_honesty:documented_unknowns",
        summary: "Documented open unknowns / unresolved questions in workspace notes.",
      })
    );
  }

  return extra;
}

export function analyzeSession(events: RelayEventLike[], opts: AnalyzeSessionOptions): SessionAnalysis {
  const baseAtoms = eventsToAtoms(events, opts);
  const atoms = enrichContextualAtoms(baseAtoms, opts);

  const handoffTextPresent = (opts.handoffText || "").trim().length >= 30;
  const opportunityFlags = opportunityFlagsFromEvents(events, { handoffTextPresent });

  const composite = compositeFitScore(atoms, opportunityFlags);
  const prediction = predictHire(composite);
  const findings = composite.traits.map(findingFromTrait);
  const interviewFollowups = buildInterviewFollowups(composite.traits);
  const processQuality = computeProcessQuality(events);
  const aiQuality = computeAiQuality(events);
  const adaptability = computeAdaptability(events);
  const diagnosticEfficiencyResult = computeSessionDiagnosticEfficiency(events);

  const engineAtoms = atomsFromEngineEvents(
    events.map((e) => ({
      id: e.id,
      event_type: e.event_type,
      payload: (e.payload || {}) as Record<string, unknown>,
    }))
  );
  const competencyIds = [
    "data_integrity",
    "verification",
    "customer_communication",
    "ai_judgment",
    "adaptation",
  ] as const;
  const workspaceCredibility = competencyIds.map((c) => scoreCompetency(c, engineAtoms));
  const theta = emptyCapabilityVector(0.5);
  const map: Partial<Record<CapabilityId, string>> = {
    data_integrity: "data_integrity",
    verification: "verification",
    customer_communication: "customer_communication",
    ai_judgment: "ai_judgment",
    adaptation: "adaptation",
  };
  for (const report of workspaceCredibility) {
    const key = map[report.competency as CapabilityId];
    if (key) theta[key] = report.estimate;
  }
  for (const t of composite.traits) {
    if (t.traitId === "verification_discipline") theta.verification = Math.max(theta.verification, (t.score100 ?? 50) / 100);
    if (t.traitId === "data_integrity_vigilance") theta.data_integrity = Math.max(theta.data_integrity, (t.score100 ?? 50) / 100);
    if (t.traitId === "communication_translation") {
      theta.customer_communication = Math.max(theta.customer_communication, (t.score100 ?? 50) / 100);
    }
  }
  const provisionalRoleFit = roleFit(theta);

  return {
    atoms,
    traits: composite.traits,
    composite,
    prediction,
    findings,
    interviewFollowups,
    processQuality,
    aiQuality,
    adaptability,
    diagnosticEfficiency: diagnosticEfficiencyResult,
    validationMaturity: "design_weighted",
    policyVersion: POLICY_VERSION,
    formulaVersion: FORMULA_VERSION,
    workspaceCredibility,
    provisionalRoleFit,
  };
}