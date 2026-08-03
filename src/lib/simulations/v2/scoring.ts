/**
 * Deterministic v2 attempt scorer.
 *
 * Performance is a weighted quality ratio - never pulled toward a 50 midpoint.
 * Coverage and confidence are separate from performance.
 */
import type { MicroConcept } from "../micro-types";
import { normalizeEvent, type SemanticEvent } from "./events";
import type {
  EvidenceOpportunity,
  SimulationDefinitionV2,
  StructuredDecisionModule,
} from "./types";

export const INSUFFICIENT_COVERAGE_V2 = 0.45;
export const ENGINE_VERSION_V2 = "v2";

export type ScoreBandV2 =
  | "strong"
  | "established"
  | "developing"
  | "limited"
  | "insufficient";

export interface V2ScoreCitation {
  claim: string;
  eventOrArtifactId: string;
  detail: string;
}

export interface V2CompetencyScore {
  key: string;
  label: string;
  performance: number | null;
  coverage: number;
  confidence: number;
  band: ScoreBandV2;
}

export interface V2AttemptInput {
  events?: unknown[];
  /** moduleId → selected value(s) for structured decisions. */
  decisions?: Record<string, string | number | string[] | undefined>;
  /** Selected evidence option ids / labels (multi-select support). */
  evidenceIds?: string[];
  /** moduleId → written text. */
  written?: Record<string, string | undefined>;
  /** Matched stakeholder response rule ids. */
  stakeholderRuleIds?: string[];
  /** When true, platform failure removed intended evidence. */
  technicalFailure?: boolean;
}

export interface V2ScoreResult {
  performance: number | null;
  coverage: number;
  confidence: number;
  band: ScoreBandV2;
  competencies: V2CompetencyScore[];
  citations: V2ScoreCitation[];
  engineVersion: typeof ENGINE_VERSION_V2;
}

/** Shape stored on sim_analysis_runs.result for engineVersion "v2". Safe for client import. */
export interface V2PersistedCompetency {
  key: string;
  label: string;
  performance: number | null;
  coverage: number;
  confidence: number;
  band: ScoreBandV2;
  bandLabel: string;
}

export interface V2PersistedResult {
  format: "v2";
  engineVersion: typeof ENGINE_VERSION_V2;
  simulationTitle: string;
  roleKey: string;
  slug: string;
  performance: number | null;
  coverage: number;
  confidence: number;
  band: ScoreBandV2;
  bandLabel: string;
  completionSeconds: number | null;
  competencies: V2PersistedCompetency[];
  citations: V2ScoreCitation[];
  strengths: string[];
  improvements: string[];
  disclaimer: string;
}

export function isV2PersistedResult(value: unknown): value is V2PersistedResult {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return r.format === "v2" || r.engineVersion === "v2";
}

// ---------------------------------------------------------------------------
// Keyword / objective helpers (mirrors micro-scoring; no server-only import)
// ---------------------------------------------------------------------------

function scoreConceptQuality(c: MicroConcept, lower: string): number {
  if (c.keywords.some((k) => lower.includes(k.toLowerCase()))) return 1;
  if ((c.partialKeywords || []).some((k) => lower.includes(k.toLowerCase()))) return 0.5;
  return 0;
}

function writtenQuality(concepts: MicroConcept[] | undefined, text: string): number {
  if (!concepts || concepts.length === 0) {
    return text.trim().length >= 30 ? 0.5 : text.trim() ? 0.25 : 0;
  }
  const lower = text.toLowerCase();
  let credit = 0;
  let weight = 0;
  for (const c of concepts) {
    const w = c.weight ?? 1;
    weight += w;
    credit += w * scoreConceptQuality(c, lower);
  }
  return weight > 0 ? credit / weight : 0;
}

function quantizeQuality(q: number): 0 | 0.5 | 1 {
  if (q >= 0.75) return 1;
  if (q >= 0.35) return 0.5;
  return 0;
}

function multiSelectF1(expected: string[], selected: string[]): number {
  const exp = new Set(expected.map(String));
  const sel = new Set(selected.map(String));
  let tp = 0;
  for (const s of sel) if (exp.has(s)) tp++;
  const fp = sel.size - tp;
  const fn = exp.size - tp;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  return precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
}

function decisionQuality(
  mod: StructuredDecisionModule,
  raw: string | number | string[] | undefined,
  evidenceIds: string[]
): number {
  if (raw === undefined || raw === null || raw === "") {
    if (mod.decisionKind === "multi_select" && evidenceIds.length > 0 && mod.answer) {
      return multiSelectF1(mod.answer.map(String), evidenceIds);
    }
    return 0;
  }
  if (!mod.answer || mod.answer.length === 0) return isPresent(raw) ? 0.5 : 0;

  if (mod.decisionKind === "number") {
    const [expected, tolerance] = mod.answer as [number, number];
    const num = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[$,\s]/g, ""));
    return Number.isFinite(num) && Math.abs(num - expected) <= (tolerance ?? 0) ? 1 : 0;
  }
  if (mod.decisionKind === "single_select") {
    return String(raw) === String(mod.answer[0]) ? 1 : 0;
  }
  if (mod.decisionKind === "multi_select") {
    const selected = Array.isArray(raw) ? raw.map(String) : [String(raw)];
    return multiSelectF1(mod.answer.map(String), selected);
  }
  return 0;
}

function isPresent(raw: string | number | string[] | undefined): boolean {
  if (raw === undefined || raw === null) return false;
  if (Array.isArray(raw)) return raw.length > 0;
  return String(raw).trim() !== "";
}

function bandForPerformance(performance: number | null, coverage: number): ScoreBandV2 {
  if (coverage < INSUFFICIENT_COVERAGE_V2) return "insufficient";
  if (performance === null) return "insufficient";
  if (performance >= 85) return "strong";
  if (performance >= 70) return "established";
  if (performance >= 50) return "developing";
  return "limited";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ---------------------------------------------------------------------------
// Signal set
// ---------------------------------------------------------------------------

function collectSignals(
  events: SemanticEvent[],
  def: SimulationDefinitionV2,
  input: V2AttemptInput
): Set<string> {
  const signals = new Set<string>();
  const decisions = input.decisions || {};
  const written = input.written || {};

  for (const e of events) {
    if (e.type === "resource_opened" && e.resourceId) {
      signals.add(`resource_opened:${e.resourceId}`);
    }
    if (e.type === "decision_selected" && e.moduleId) {
      signals.add(`decision_selected:${e.moduleId}`);
    }
    if (e.type === "evidence_selected" && e.moduleId) {
      signals.add(`evidence_selected:${e.moduleId}`);
    }
    if (e.type === "deliverable_revised" && e.moduleId) {
      signals.add(`deliverable_revised:${e.moduleId}`);
    }
    if (e.type === "stakeholder_message_sent") {
      signals.add("stakeholder_message_sent");
    }
    if (e.type === "stakeholder_reply_received") {
      signals.add("stakeholder_reply_received");
      if (e.ruleId) signals.add(`stakeholder_reply_received:${e.ruleId}`);
    }
    if (e.type === "submitted") signals.add("submitted");
    if (e.type === "curveball_presented") signals.add("curveball_presented");
  }

  for (const m of def.modules) {
    if (m.kind === "structured_decision") {
      const raw = decisions[m.id];
      if (isPresent(raw)) {
        if (m.decisionKind === "multi_select") signals.add(`evidence_selected:${m.id}`);
        else signals.add(`decision_selected:${m.id}`);
      }
    }
    if (m.kind === "written_deliverable") {
      const text = written[m.id];
      if (typeof text === "string" && text.trim()) {
        signals.add(`deliverable_revised:${m.id}`);
      }
    }
  }

  if ((input.evidenceIds || []).length > 0) {
    for (const m of def.modules) {
      if (m.kind === "structured_decision" && m.decisionKind === "multi_select") {
        if (!isPresent(decisions[m.id])) signals.add(`evidence_selected:${m.id}`);
      }
    }
  }

  if ((input.stakeholderRuleIds || []).length > 0) {
    signals.add("stakeholder_reply_received");
    for (const id of input.stakeholderRuleIds!) {
      signals.add(`stakeholder_reply_received:${id}`);
    }
  }

  return signals;
}

function opportunityCovered(opp: EvidenceOpportunity, signals: Set<string>): boolean {
  if (opp.requiredSignals.length === 0) return false;
  // Resources opportunity: require all listed resource opens.
  if (opp.id === "opp_resources") {
    return opp.requiredSignals.every((s) => signals.has(s));
  }
  // Stakeholder: message sent is enough for coverage; reply improves quality.
  if (opp.id === "opp_stakeholder") {
    return signals.has("stakeholder_message_sent");
  }
  return opp.requiredSignals.every((s) => signals.has(s));
}

function opportunityQuality(
  opp: EvidenceOpportunity,
  def: SimulationDefinitionV2,
  input: V2AttemptInput,
  signals: Set<string>
): number {
  if (opp.id === "opp_resources") {
    const opened = opp.requiredSignals.filter((s) => signals.has(s)).length;
    if (opened === 0) return 0;
    if (opened < opp.requiredSignals.length) return 0.5;
    return 1;
  }

  if (opp.id === "opp_stakeholder") {
    const rules = input.stakeholderRuleIds || [];
    const fromEvents = [...signals]
      .filter((s) => s.startsWith("stakeholder_reply_received:"))
      .map((s) => s.slice("stakeholder_reply_received:".length));
    const allRules = new Set([...rules, ...fromEvents]);
    if ([...allRules].some((r) => r.startsWith("rel_"))) return 1;
    if (allRules.size > 0 || signals.has("stakeholder_reply_received")) return 0.5;
    if (signals.has("stakeholder_message_sent")) return 0;
    return 0;
  }

  const moduleId = opp.id.replace(/^opp_/, "");
  const mod = def.modules.find((m) => m.id === moduleId);
  if (!mod) return signals.has(opp.requiredSignals[0]) ? 0.5 : 0;

  if (mod.kind === "structured_decision") {
    const raw = input.decisions?.[mod.id];
    return decisionQuality(mod, raw, input.evidenceIds || []);
  }
  if (mod.kind === "written_deliverable") {
    const text = input.written?.[mod.id] || "";
    return writtenQuality(mod.concepts, text);
  }
  return 0;
}

function consistencyFactor(qualities: number[]): number {
  if (qualities.length <= 1) return qualities.length === 0 ? 0 : 1;
  const mean = qualities.reduce((s, q) => s + q, 0) / qualities.length;
  const variance =
    qualities.reduce((s, q) => s + (q - mean) * (q - mean), 0) / qualities.length;
  // Low variance → high consistency. Floor at 0.5 so coverage still dominates.
  return Math.max(0.5, Math.min(1, 1 - Math.sqrt(variance)));
}

/**
 * Score a v2 attempt. Pure and deterministic for the same definition + input.
 */
export function scoreV2Attempt(def: SimulationDefinitionV2, input: V2AttemptInput): V2ScoreResult {
  const events = (input.events || [])
    .map((e) => normalizeEvent(e))
    .filter((e): e is SemanticEvent => e !== null);

  const signals = collectSignals(events, def, input);
  const opportunities = def.scoring.opportunities;
  const citations: V2ScoreCitation[] = [];

  const technicalFailure = Boolean(input.technicalFailure);

  type OppEval = {
    opp: EvidenceOpportunity;
    covered: boolean;
    quality: number;
    scorable: boolean;
  };

  const evals: OppEval[] = opportunities.map((opp) => {
    const covered = opportunityCovered(opp, signals);
    const rawQ = opportunityQuality(opp, def, input, signals);
    const quality = quantizeQuality(rawQ);
    // Technical failure: opportunity not scorable for performance; coverage lost.
    const scorable = !technicalFailure;
    if (covered && quality > 0) {
      citations.push({
        claim: opp.label,
        eventOrArtifactId: opp.id,
        detail: `Quality ${quality} from required signals [${opp.requiredSignals.join(", ")}].`,
      });
    }
    return { opp, covered: technicalFailure ? false : covered, quality, scorable };
  });

  const totalWeight = opportunities.reduce((s, o) => s + o.weight, 0);
  const coveredWeight = evals.reduce((s, e) => s + (e.covered ? e.opp.weight : 0), 0);
  let coverage = totalWeight > 0 ? coveredWeight / totalWeight : 0;

  const scorableEvals = evals.filter((e) => e.scorable);
  const scorableWeight = scorableEvals.reduce((s, e) => s + e.opp.weight, 0);
  const earnedWeight = scorableEvals.reduce((s, e) => s + e.opp.weight * e.quality, 0);

  let performance: number | null;
  if (technicalFailure || scorableWeight <= 0) {
    performance = null;
    coverage = technicalFailure ? round2(coverage * 0.5) : coverage;
  } else {
    // Display score 0–100 from performance ratio. No midpoint pull.
    performance = round1(100 * (earnedWeight / scorableWeight));
  }

  const qualitiesForConsistency = evals.filter((e) => e.covered).map((e) => e.quality);
  const consistency = technicalFailure
    ? Math.min(0.5, consistencyFactor(qualitiesForConsistency))
    : consistencyFactor(qualitiesForConsistency);
  let confidence = round2(Math.max(0, Math.min(1, coverage * consistency)));
  if (technicalFailure) confidence = round2(confidence * 0.5);

  coverage = round2(Math.max(0, Math.min(1, coverage)));

  const band = bandForPerformance(performance, coverage);

  // Competency breakdown
  const competencies: V2CompetencyScore[] = def.competencies.map((c) => {
    const cEvals = evals.filter((e) => e.opp.competencyKey === c.key);
    const cTotal = cEvals.reduce((s, e) => s + e.opp.weight, 0);
    const cCovered = cEvals.reduce((s, e) => s + (e.covered ? e.opp.weight : 0), 0);
    const cScorable = cEvals.filter((e) => e.scorable);
    const cScorableW = cScorable.reduce((s, e) => s + e.opp.weight, 0);
    const cEarned = cScorable.reduce((s, e) => s + e.opp.weight * e.quality, 0);
    const cCoverage = cTotal > 0 ? round2(cCovered / cTotal) : 0;
    const cPerf =
      technicalFailure || cScorableW <= 0 ? null : round1(100 * (cEarned / cScorableW));
    const cQualities = cEvals.filter((e) => e.covered).map((e) => e.quality);
    const cConf = round2(cCoverage * consistencyFactor(cQualities));
    return {
      key: c.key,
      label: c.label,
      performance: cPerf,
      coverage: cCoverage,
      confidence: cConf,
      band: bandForPerformance(cPerf, cCoverage),
    };
  });

  return {
    performance,
    coverage,
    confidence,
    band,
    competencies,
    citations,
    engineVersion: ENGINE_VERSION_V2,
  };
}
