/**
 * role-compiler.ts — parses employer intake into a RoleGraph plus a
 * regularized per-trait weight distribution (w*).
 *
 * Weight reconciliation blends three sources into one preference vector:
 *   1. employerDistribution   — normalized employer skill-weight sliders
 *   2. defaultDistribution    — FDE_W, the validated composite defaults
 *   3. jobInferredDistribution — closed-vocabulary keyword signal read off
 *                                 the intake text (title/objective/context)
 *
 * The blend itself is the mixture-distribution construction Jensen–Shannon
 * divergence is built on: JSD(P, Q) uses M = (P + Q) / 2 as a shared
 * midpoint. Here that idea is generalized to three weighted sources and
 * renormalized — because what role-compiler needs is a blended *weight
 * vector*, not a divergence score. The actual divergence metric
 * (`jensenShannonDivergence`) is exposed too and reused by validators.ts for
 * leak-similarity checks, and surfaced here as a diagnostic
 * (`divergenceFromDefault`) so an employer can see how far their reconciled
 * weights moved from the platform defaults.
 *
 * Pure functions only — no I/O, no randomness.
 */
import { FDE_W, TRAIT_IDS, type TraitId } from "../evidence/traits";
import type { EmployerIntake, PreferenceVector, RoleGraph, RoleGraphEdge, RoleGraphNode } from "./types";

export const ROLE_COMPILER_VERSION = "role-compiler-v1";

export const MIN_DURATION_MINUTES = 20;
export const MAX_DURATION_MINUTES = 120;

/**
 * Duration validation — the one hard structural gate that must fail loudly
 * rather than silently degrade. Everything else (coverage shortfalls, time
 * budget mismatches) is a validation *flag*, not a thrown error.
 */
export function assertValidDuration(durationMinutes: number): void {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error(`Invalid duration: ${durationMinutes}. Must be a positive number of minutes.`);
  }
  if (Math.round(durationMinutes) !== durationMinutes) {
    throw new Error(`Invalid duration: ${durationMinutes}. Must be a whole number of minutes.`);
  }
  if (durationMinutes < MIN_DURATION_MINUTES || durationMinutes > MAX_DURATION_MINUTES) {
    throw new Error(
      `Invalid duration: ${durationMinutes} minutes. Simulations must run ` +
        `${MIN_DURATION_MINUTES}-${MAX_DURATION_MINUTES} minutes to carry enough independent ` +
        `evidence opportunities without becoming an unbounded take-home.`
    );
  }
}

// ---------------------------------------------------------------------------
// Job-inferred trait signal — a small, closed, auditable keyword catalog.
// Deliberately not an LLM call: bounded, deterministic, and every hit is
// traceable back to the exact phrase that produced it.
// ---------------------------------------------------------------------------

const JOB_SIGNAL_KEYWORDS: Record<TraitId, string[]> = {
  elicitation: [
    "ambiguous", "underspecified", "undefined", "unclear", "figure out",
    "whatever's useful", "open-ended", "no spec", "your judgment",
  ],
  contradiction_handling: [
    "conflicting", "disagree", "contradict", "misaligned", "don't agree",
    "two stakeholders", "competing priorities", "different deliverable",
  ],
  data_integrity_vigilance: [
    "data", "csv", "spreadsheet", "reconcile", "join", "pipeline",
    "dataset", "records", "duplicate", "export", "manual tracking",
  ],
  scope_renegotiation: [
    "deadline moved", "changing requirements", "scope creep", "pivot",
    "mid-project change", "curveball", "moved up",
  ],
  technical_execution: [
    "build", "implement", "ship", "code", "integration", "automation",
    "system", "pipeline", "dashboard",
  ],
  ai_tool_judgment: [
    "ai", "copilot", "llm", "generative", "assistant", "model-assisted",
    "ai-suggested",
  ],
  verification_discipline: [
    "verify", "test", "qa", "validate", "audit", "accuracy", "correctness",
  ],
  limitation_honesty: [
    "confidence", "risk", "uncertain", "assumptions", "unknowns", "limitations",
  ],
  prioritization_under_pressure: [
    "urgent", "deadline", "board meeting", "asap", "time-sensitive",
    "pressure", "pulled forward",
  ],
  communication_translation: [
    "executive", "board", "non-technical", "stakeholder update",
    "translate", "plain language", "present", "vp of",
  ],
};

function normalizeDistribution(record: Partial<Record<TraitId, number>>): PreferenceVector {
  const clamped: Record<TraitId, number> = {} as Record<TraitId, number>;
  let sum = 0;
  for (const id of TRAIT_IDS) {
    const v = Math.max(0, Number(record[id]) || 0);
    clamped[id] = v;
    sum += v;
  }
  if (sum <= 0) {
    // No signal at all — fall back to the validated default shape rather
    // than a flat uniform, so an empty employer input never distorts the
    // composite toward traits FDE_W itself treats as lower-weight.
    return { ...FDE_W };
  }
  const out: Record<TraitId, number> = {} as Record<TraitId, number>;
  for (const id of TRAIT_IDS) out[id] = clamped[id] / sum;
  return out;
}

/** Raw (un-normalized) keyword hit counts — kept separate from the smoothed
 * distribution so world-generator/role-graph can surface which specific
 * tags actually fired, for transparency. */
export function rawJobSignalHits(text: string): Record<TraitId, number> {
  const lower = text.toLowerCase();
  const hits: Record<TraitId, number> = {} as Record<TraitId, number>;
  for (const id of TRAIT_IDS) {
    hits[id] = JOB_SIGNAL_KEYWORDS[id].reduce((n, kw) => (lower.includes(kw) ? n + 1 : n), 0);
  }
  return hits;
}

function inferJobSignalDistribution(text: string): PreferenceVector {
  const hits = rawJobSignalHits(text);
  const smoothed: Record<TraitId, number> = {} as Record<TraitId, number>;
  for (const id of TRAIT_IDS) {
    // Laplace-smoothed by a fraction of the trait's own default weight so a
    // trait with zero keyword hits still contributes sanely to the mixture
    // instead of collapsing to a hard zero.
    smoothed[id] = hits[id] + 0.4 * FDE_W[id];
  }
  return normalizeDistribution(smoothed);
}

// ---------------------------------------------------------------------------
// Blend + divergence
// ---------------------------------------------------------------------------

export function blendPreferenceVectors(
  sources: { distribution: PreferenceVector; weight: number }[]
): PreferenceVector {
  const totalWeight = sources.reduce((s, x) => s + Math.max(0, x.weight), 0) || 1;
  const out: Record<TraitId, number> = {} as Record<TraitId, number>;
  for (const id of TRAIT_IDS) out[id] = 0;
  for (const { distribution, weight } of sources) {
    const w = Math.max(0, weight) / totalWeight;
    for (const id of TRAIT_IDS) out[id] += w * (distribution[id] ?? 0);
  }
  const sum = TRAIT_IDS.reduce((s, id) => s + out[id], 0) || 1;
  for (const id of TRAIT_IDS) out[id] = out[id] / sum;
  return out;
}

/** Jensen–Shannon divergence (log2, bounded in [0, 1]) between two trait
 * distributions. Symmetric, unlike raw KL divergence — used here purely as
 * a similarity/dissimilarity diagnostic, not to drive scoring. */
export function jensenShannonDivergence(p: PreferenceVector, q: PreferenceVector): number {
  const klTerm = (a: number, m: number) => (a <= 0 || m <= 0 ? 0 : a * Math.log2(a / m));
  let jsd = 0;
  for (const id of TRAIT_IDS) {
    const pi = p[id] ?? 0;
    const qi = q[id] ?? 0;
    const m = (pi + qi) / 2;
    jsd += 0.5 * klTerm(pi, m) + 0.5 * klTerm(qi, m);
  }
  return Math.max(0, Math.min(1, jsd));
}

const EMPLOYER_BLEND_WEIGHT = 0.45;
const DEFAULT_BLEND_WEIGHT = 0.3;
const JOB_INFERRED_BLEND_WEIGHT = 0.25;

export type ReconciledWeights = {
  preferenceVector: PreferenceVector;
  employerDistribution: PreferenceVector;
  defaultDistribution: PreferenceVector;
  jobInferredDistribution: PreferenceVector;
  jobSignalHits: Record<TraitId, number>;
  divergenceFromDefault: number;
  blendVersion: string;
};

export function reconcileWeights(intake: EmployerIntake): ReconciledWeights {
  const employerDistribution = normalizeDistribution(intake.skillWeights || {});
  const defaultDistribution: PreferenceVector = { ...FDE_W };
  const intakeText = [intake.title, intake.objective, intake.customerContext, intake.industry]
    .filter(Boolean)
    .join(" \n ");
  const jobInferredDistribution = inferJobSignalDistribution(intakeText);
  const jobSignalHits = rawJobSignalHits(intakeText);

  const preferenceVector = blendPreferenceVectors([
    { distribution: employerDistribution, weight: EMPLOYER_BLEND_WEIGHT },
    { distribution: defaultDistribution, weight: DEFAULT_BLEND_WEIGHT },
    { distribution: jobInferredDistribution, weight: JOB_INFERRED_BLEND_WEIGHT },
  ]);

  return {
    preferenceVector,
    employerDistribution,
    defaultDistribution,
    jobInferredDistribution,
    jobSignalHits,
    divergenceFromDefault: jensenShannonDivergence(preferenceVector, defaultDistribution),
    blendVersion: ROLE_COMPILER_VERSION,
  };
}

// ---------------------------------------------------------------------------
// Role graph
// ---------------------------------------------------------------------------

/** Closed set of tags this compiler can produce — every tag is derived
 * mechanically from job-signal hits, never invented per-call. */
export function inferSkillTags(hits: Record<TraitId, number>): string[] {
  const tags: string[] = [];
  if (hits.data_integrity_vigilance > 0) tags.push("data_pipeline");
  if (hits.contradiction_handling > 0) tags.push("stakeholder_conflict");
  if (hits.prioritization_under_pressure > 0 || hits.scope_renegotiation > 0) tags.push("time_pressure");
  if (hits.communication_translation > 0) tags.push("customer_facing");
  if (hits.ai_tool_judgment > 0) tags.push("ai_assisted_workflow");
  if (hits.technical_execution > 0) tags.push("build_from_scratch");
  return tags;
}

export function buildRoleGraph(intake: EmployerIntake, jobSignalHits: Record<TraitId, number>): RoleGraph {
  const inferredSkillTags = inferSkillTags(jobSignalHits);

  const nodes: RoleGraphNode[] = [
    {
      id: "requester",
      kind: "stakeholder",
      label: "Requester",
      description: "The stakeholder who sent the underspecified ask — wants an operational, check-it-daily deliverable.",
    },
    {
      id: "counterpart",
      kind: "stakeholder",
      label: "Escalation counterpart",
      description: "A second stakeholder who gets looped in mid-thread wanting a different, unreconciled deliverable (analysis/root-cause, not a dashboard).",
    },
    {
      id: "system_of_record",
      kind: "system",
      label: "System of record",
      description: "The primary exported dataset for the role's objective — internally consistent, joinable by a canonical ID format.",
    },
    {
      id: "manual_tracking_source",
      kind: "system",
      label: "Manual tracking source",
      description: "A hand-kept secondary source that was never validated against the system of record — the data-integrity trap lives here.",
    },
    {
      id: "deliverable_operational",
      kind: "deliverable",
      label: "Operational deliverable",
      description: "What the requester actually asked for (a dashboard/checklist they can act on daily).",
    },
    {
      id: "deliverable_analytical",
      kind: "deliverable",
      label: "Analytical deliverable",
      description: "What the counterpart actually wants (a defensible root-cause writeup).",
    },
    {
      id: "constraint_deadline",
      kind: "constraint",
      label: "Deadline constraint",
      description: "A time constraint that moves mid-session, forcing a visible reprioritization.",
    },
  ];

  const edges: RoleGraphEdge[] = [
    { from: "requester", to: "deliverable_operational", relation: "wants" },
    { from: "counterpart", to: "deliverable_analytical", relation: "wants" },
    { from: "deliverable_operational", to: "deliverable_analytical", relation: "conflicts_with" },
    { from: "deliverable_operational", to: "system_of_record", relation: "depends_on" },
    { from: "deliverable_analytical", to: "system_of_record", relation: "depends_on" },
    { from: "manual_tracking_source", to: "system_of_record", relation: "feeds" },
    { from: "constraint_deadline", to: "deliverable_analytical", relation: "conflicts_with" },
  ];

  return {
    roleTitle: intake.title.trim() || "Untitled role",
    industry: intake.industry.trim() || "general",
    objective: intake.objective.trim(),
    nodes,
    edges,
    inferredSkillTags,
  };
}
