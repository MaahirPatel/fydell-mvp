import "server-only";
/**
 * Deterministic analysis prototype for five-minute micro simulations.
 *
 * There are NO language model calls anywhere in this file. The same
 * submission always produces the identical result.
 *
 * Six components, each 0..1:
 *   O  objective correctness   = objective points earned / points available
 *                                (single-choice and number questions)
 *   E  evidence selection F1   = 2PR/(P+R) over the multi-select question(s)
 *   R  reasoning quality       = sum(weight x credit) / sum(weight) over the
 *                                text question's expected concepts; credit is
 *                                1 for a keyword match, 0.5 for a partial
 *                                keyword match, 0 otherwise
 *   C  communication           = passed checks / 4 (decision, evidence,
 *                                limitation, next step) on the written answer
 *   V  verification            = 1 for a revised answer or an explicit check
 *                                in the text, 0.5 for consulting two or more
 *                                resources, 0 otherwise
 *   J  stakeholder question    = 1 when an authored relevant (rel_) rule
 *                                matched, 0.5 when another authored rule
 *                                matched, 0 otherwise
 *
 * Raw = 100 x (0.40 O + 0.20 E + 0.15 R + 0.10 C + 0.10 V + 0.05 J).
 * When a sim has no question for a component (for example no multi-select),
 * that component is inapplicable and the remaining weights are renormalized
 * to sum to 1 so a complete correct attempt can still reach 100.
 *
 * Coverage = completed signal weight / total signal weight
 *   (objective answered 0.35, evidence answered 0.25, explanation of 30+
 *    characters 0.20, resources opened 0.10, stakeholder asked 0.10;
 *    inapplicable signals are dropped and the rest renormalized).
 * Adjusted = round(50 + Coverage x (Raw - 50)).
 * Bands on Adjusted: 85+ Strong, 70+ Established, 50+ Developing, else
 * Limited. Coverage below 0.45 overrides everything to Insufficient.
 */
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getVersionContent, issueCredential, listEvents, listMessages } from "./db";
import {
  bandForScore,
  isMicroContent,
  PROTOTYPE_DISCLAIMER,
  type MicroConcept,
  type MicroQuestion,
  type MicroSimContent,
} from "./micro-types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const COMPONENT_WEIGHTS = {
  O: 0.4,
  E: 0.2,
  R: 0.15,
  C: 0.1,
  V: 0.1,
  J: 0.05,
} as const;

export const COVERAGE_WEIGHTS = {
  objective: 0.35,
  evidence: 0.25,
  explanation: 0.2,
  resources: 0.1,
  stakeholder: 0.1,
} as const;

export const MIN_EXPLANATION_CHARS = 30;
export const INSUFFICIENT_COVERAGE = 0.45;
/** Back-compat alias for older imports. */
export const INSUFFICIENT_CONFIDENCE = INSUFFICIENT_COVERAGE;

export type MicroComponentKey = keyof typeof COMPONENT_WEIGHTS;

const COMPONENT_LABELS: Record<MicroComponentKey, string> = {
  O: "Objective correctness",
  E: "Evidence selection",
  R: "Reasoning quality",
  C: "Communication",
  V: "Verification",
  J: "Stakeholder question",
};

// Generic communication detectors. Per-sim phrases from
// sim.communicationChecks are ADDED to these lists.
const DECISION_MARKERS = [
  "i recommend",
  "my recommendation",
  "we should",
  "i would",
  "i chose",
  "i selected",
  "the answer is",
  "the cause is",
  "root cause",
  "the fix is",
  "go with",
  "propose",
  "i suggest",
  "the best option",
  "decision",
];
const LIMITATION_MARKERS = [
  "assum",
  "not sure",
  "not certain",
  "would verify",
  "would confirm",
  "limitation",
  "if ",
  "depends",
  "unless",
  "uncertain",
  "might",
  "may ",
  "caveat",
  "risk",
  "cannot confirm",
  "without more",
];
const NEXT_STEP_MARKERS = [
  "next",
  "then",
  "recommend",
  "should",
  "follow up",
  "follow-up",
  "monitor",
  "alert",
  "prevent",
  "add a",
  "set up",
  "implement",
  "going forward",
  "in the future",
  "will ",
];
// Verification markers for the V component (checking or recalculating).
const VERIFICATION_MARKERS = [
  "verif",
  "double check",
  "double-check",
  "re-check",
  "recheck",
  "recalculat",
  "re-calculat",
  "cross-check",
  "crosscheck",
  "checked",
  "check the",
  "confirm",
  "validat",
  "reconcil",
  "sanity check",
];

// ---------------------------------------------------------------------------
// Result shapes (stored on sim_analysis_runs.result)
// ---------------------------------------------------------------------------
export interface MicroConceptResult {
  concept: string;
  label: string;
  present: boolean;
  quality: number; // 0 | 0.5 | 1
  evidence: string;
}

export interface MicroSectionResult {
  questionId: string;
  prompt: string;
  kind: string;
  competencyKey: string;
  candidateAnswer: string;
  expectedEvidence: string;
  pointsEarned: number;
  pointsAvailable: number;
  correct: boolean;
  concepts?: MicroConceptResult[];
}

export interface MicroComponent {
  key: MicroComponentKey;
  label: string;
  /** The specified weight (0.40 for O, and so on). */
  weight: number;
  /** The weight actually used after renormalizing over applicable components. */
  usedWeight: number;
  /** 0..1 */
  value: number;
  /** Plain-language description of what earned this value. */
  detail: string;
  /** False when the sim has no question feeding this component. */
  applicable: boolean;
}

export interface MicroCoverageSignal {
  key: keyof typeof COVERAGE_WEIGHTS;
  label: string;
  weight: number;
  /** 0..1 fraction of this signal that was completed. */
  completed: number;
  applicable: boolean;
}

export interface MicroTrailItem {
  label: string;
  detail: string;
  at: string | null;
}

export interface MicroAiDisclosure {
  used: boolean;
  note?: string;
}

export interface MicroCompetencyResult {
  key: string;
  label: string;
  earned: number;
  available: number;
  band: string;
  bandLabel: string;
  /** 0..1: fraction of this competency's evidence that was actually provided. */
  confidence?: number;
}

export interface MicroAnalysis {
  components: Record<MicroComponentKey, MicroComponent>;
  /** 0..100, before the coverage adjustment. */
  raw: number;
  /** 0..1 */
  coverage: number;
  coverageSignals: MicroCoverageSignal[];
  /** round(50 + coverage x (raw - 50)), the primary score. */
  adjusted: number;
  band: string;
  bandLabel: string;
  competencies: MicroCompetencyResult[];
  trail: MicroTrailItem[];
  strengths: string[];
  improvements: string[];
  /** The candidate's written answer(s), joined. */
  explanation: string;
  /** Read from the submission; never affects the score. */
  aiDisclosure: MicroAiDisclosure | null;
}

export interface MicroResult {
  format: "micro";
  simulationTitle: string;
  roleKey: string;
  slug: string;
  /** The adjusted score (primary, 0..100). */
  total: number;
  band: string;
  bandLabel: string;
  completionSeconds: number | null;
  sections: MicroSectionResult[];
  strengths: string[];
  improvements: string[];
  competencies: MicroCompetencyResult[];
  /** Equals analysis.coverage (kept for older consumers). */
  confidence?: number;
  stakeholder: {
    asked: boolean;
    relevant: boolean;
    pointsEarned: number;
    pointsAvailable: number;
    lastQuestion: string | null;
  };
  /** Legacy field. Always "keyword": scoring is fully deterministic. */
  writtenEvaluationMode?: "ai" | "keyword";
  disclaimer: string;
  analysis?: MicroAnalysis;
}

// ---------------------------------------------------------------------------
// Objective scoring (single-choice and number questions)
// ---------------------------------------------------------------------------
export function scoreObjective(
  q: MicroQuestion,
  raw: string | number | string[] | undefined
): { earned: number; correct: boolean; answerText: string } {
  if (raw === undefined || raw === null || raw === "")
    return { earned: 0, correct: false, answerText: "" };

  if (q.kind === "number") {
    const [expected, tolerance] = q.answer as [number, number];
    const num =
      typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[$,\s]/g, ""));
    const correct = Number.isFinite(num) && Math.abs(num - expected) <= tolerance;
    return { earned: correct ? q.points : 0, correct, answerText: String(raw) };
  }
  if (q.kind === "single_select") {
    const correct = String(raw) === String(q.answer![0]);
    return { earned: correct ? q.points : 0, correct, answerText: String(raw) };
  }
  if (q.kind === "multi_select") {
    // Points shown per question use the same F1 measure as the E component.
    const { f1 } = multiSelectF1(q, raw);
    const correct = f1 === 1;
    return {
      earned: Math.round(q.points * f1),
      correct,
      answerText: (Array.isArray(raw) ? raw.map(String) : [String(raw)]).join(", "),
    };
  }
  return { earned: 0, correct: false, answerText: String(raw) };
}

/** Precision/recall/F1 for one multi-select question. */
export function multiSelectF1(
  q: MicroQuestion,
  raw: string | number | string[] | undefined
): { tp: number; fp: number; fn: number; precision: number; recall: number; f1: number } {
  const selected = new Set(
    raw === undefined || raw === null || raw === ""
      ? []
      : (Array.isArray(raw) ? raw : [raw]).map(String)
  );
  const expected = new Set((q.answer as (string | number)[]).map(String));
  let tp = 0;
  for (const s of selected) if (expected.has(s)) tp++;
  const fp = selected.size - tp;
  const fn = expected.size - tp;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  return { tp, fp, fn, precision, recall, f1 };
}

// ---------------------------------------------------------------------------
// Written-response concept matching (deterministic keywords only)
// ---------------------------------------------------------------------------
function scoreConcept(c: MicroConcept, lower: string): MicroConceptResult {
  const hit = c.keywords.find((k) => lower.includes(k.toLowerCase()));
  if (hit)
    return { concept: c.id, label: c.label, present: true, quality: 1, evidence: `Mentions "${hit}"` };
  const partial = (c.partialKeywords || []).find((k) => lower.includes(k.toLowerCase()));
  if (partial)
    return {
      concept: c.id,
      label: c.label,
      present: true,
      quality: 0.5,
      evidence: `Partially covered ("${partial}")`,
    };
  return { concept: c.id, label: c.label, present: false, quality: 0, evidence: "Not found in the response" };
}

export function scoreTextByKeywords(q: MicroQuestion, text: string): MicroConceptResult[] {
  const lower = text.toLowerCase();
  return (q.concepts || []).map((c) => scoreConcept(c, lower));
}

/** Weighted concept credit converted to question points (used by sections). */
export function conceptPoints(q: MicroQuestion, concepts: MicroConceptResult[]): number {
  const defs = q.concepts || [];
  const totalWeight = defs.reduce((s, c) => s + (c.weight ?? 1), 0);
  if (totalWeight === 0) return 0;
  const byId = new Map(concepts.map((c) => [c.concept, c.quality]));
  const credit = defs.reduce((s, c) => s + (c.weight ?? 1) * (byId.get(c.id) ?? 0), 0);
  return Math.round(q.points * (credit / totalWeight));
}

// ---------------------------------------------------------------------------
// Communication detectors
// ---------------------------------------------------------------------------
function findMarker(lower: string, markers: string[]): string | null {
  return markers.find((m) => lower.includes(m.toLowerCase())) || null;
}

/** Evidence markers: resource titles, numbers found in resources, option text. */
function buildEvidenceMarkers(sim: MicroSimContent): string[] {
  const markers = new Set<string>();
  for (const r of sim.resources) {
    markers.add(r.title.toLowerCase());
    for (const num of r.content.match(/\d[\d,.]*\d|\d\d+/g) || []) {
      markers.add(num.toLowerCase());
    }
  }
  for (const q of sim.questions) {
    for (const o of q.options || []) if (o.length >= 4) markers.add(o.toLowerCase());
  }
  for (const p of sim.communicationChecks?.evidencePhrases || []) markers.add(p.toLowerCase());
  return [...markers];
}

/** Decision markers: generic decisive phrases plus the answer-key option text. */
function buildDecisionMarkers(sim: MicroSimContent): string[] {
  const markers = new Set(DECISION_MARKERS);
  for (const q of sim.questions) {
    if (q.kind === "single_select" && q.answer?.length) {
      const key = String(q.answer[0]).toLowerCase();
      if (key.length >= 4) markers.add(key);
    }
  }
  for (const p of sim.communicationChecks?.decisionPhrases || []) markers.add(p.toLowerCase());
  return [...markers];
}

interface CommunicationCheck {
  name: string;
  passed: boolean;
  evidence: string | null;
}

function scoreCommunication(sim: MicroSimContent, text: string): { value: number; checks: CommunicationCheck[] } {
  const lower = text.toLowerCase();
  const limitationMarkers = [
    ...LIMITATION_MARKERS,
    ...(sim.communicationChecks?.limitationPhrases || []).map((p) => p.toLowerCase()),
  ];
  const nextStepMarkers = [
    ...NEXT_STEP_MARKERS,
    ...(sim.communicationChecks?.nextStepPhrases || []).map((p) => p.toLowerCase()),
  ];
  const checks: CommunicationCheck[] = [
    { name: "States a decision", passed: false, evidence: findMarker(lower, buildDecisionMarkers(sim)) },
    { name: "References evidence", passed: false, evidence: findMarker(lower, buildEvidenceMarkers(sim)) },
    { name: "Notes a limitation", passed: false, evidence: findMarker(lower, limitationMarkers) },
    { name: "Gives a next step", passed: false, evidence: findMarker(lower, nextStepMarkers) },
  ];
  for (const c of checks) c.passed = Boolean(text.trim()) && c.evidence !== null;
  return { value: checks.filter((c) => c.passed).length / 4, checks };
}

// ---------------------------------------------------------------------------
// Pure analysis (no database, fully deterministic)
// ---------------------------------------------------------------------------
export interface MicroSubmissionEvent {
  event_type: string;
  resource_id?: string | null;
  payload?: Record<string, unknown>;
  created_at?: string | null;
}

export interface MicroSubmissionMessage {
  thread: string;
  sender: string;
  body: string;
  created_at?: string | null;
}

export interface MicroSubmissionInput {
  /** The submitted deliverable, keyed by question id. May contain "__aiDisclosure". */
  answers: Record<string, unknown>;
  events: MicroSubmissionEvent[];
  messages: MicroSubmissionMessage[];
  completionSeconds?: number | null;
}

function answerFor(
  answers: Record<string, unknown>,
  q: MicroQuestion
): string | number | string[] | undefined {
  const raw = answers[q.id];
  if (raw === undefined || raw === null) return undefined;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "number") return raw;
  return String(raw);
}

function isAnswered(raw: string | number | string[] | undefined): boolean {
  if (raw === undefined || raw === null) return false;
  if (Array.isArray(raw)) return raw.length > 0;
  return String(raw).trim() !== "";
}

function parseAiDisclosure(answers: Record<string, unknown>): MicroAiDisclosure | null {
  const raw = answers["__aiDisclosure"];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const out: MicroAiDisclosure = { used: Boolean(o.used) };
  if (typeof o.note === "string" && o.note.trim()) out.note = o.note.trim().slice(0, 500);
  return out;
}

/** Field id an edit event refers to, checked against several payload keys. */
function editedFieldId(payload: Record<string, unknown> | undefined): string {
  if (!payload) return "";
  for (const k of ["field", "fieldKey", "key", "questionId", "id"]) {
    const v = payload[k];
    if (typeof v === "string" && v) return v;
  }
  return "";
}

const fmt2 = (n: number) => n.toFixed(2);

export function analyzeMicroSubmission(
  sim: MicroSimContent,
  input: MicroSubmissionInput
): MicroResult {
  const answers = input.answers || {};
  const events = input.events || [];
  const messages = input.messages || [];

  const objectiveQs = sim.questions.filter((q) => q.kind === "single_select" || q.kind === "number");
  const multiQs = sim.questions.filter((q) => q.kind === "multi_select");
  const textQs = sim.questions.filter((q) => q.kind === "text");

  const explanation = textQs
    .map((q) => {
      const raw = answerFor(answers, q);
      return typeof raw === "string" ? raw : "";
    })
    .filter(Boolean)
    .join("\n\n");
  const explanationLower = explanation.toLowerCase();

  // ---- O: objective correctness ------------------------------------------
  let objEarned = 0;
  let objAvailable = 0;
  let objCorrectCount = 0;
  for (const q of objectiveQs) {
    const { earned, correct } = scoreObjective(q, answerFor(answers, q));
    objEarned += earned;
    objAvailable += q.points;
    if (correct) objCorrectCount++;
  }
  const O = objAvailable > 0 ? objEarned / objAvailable : 0;

  // ---- E: evidence selection F1 -------------------------------------------
  let tp = 0;
  let fp = 0;
  let fn = 0;
  for (const q of multiQs) {
    const r = multiSelectF1(q, answerFor(answers, q));
    tp += r.tp;
    fp += r.fp;
    fn += r.fn;
  }
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const E = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  // ---- R: reasoning quality ------------------------------------------------
  let conceptCredit = 0;
  let conceptWeight = 0;
  let conceptsPresent = 0;
  let conceptsTotal = 0;
  const conceptsByQuestion = new Map<string, MicroConceptResult[]>();
  for (const q of textQs) {
    const raw = answerFor(answers, q);
    const text = typeof raw === "string" ? raw : "";
    const results = scoreTextByKeywords(q, text);
    conceptsByQuestion.set(q.id, results);
    const defs = q.concepts || [];
    for (let i = 0; i < defs.length; i++) {
      const w = defs[i].weight ?? 1;
      conceptWeight += w;
      conceptCredit += w * results[i].quality;
      conceptsTotal++;
      if (results[i].quality > 0) conceptsPresent++;
    }
  }
  const R = conceptWeight > 0 ? conceptCredit / conceptWeight : 0;

  // ---- C: communication ------------------------------------------------------
  const comm = scoreCommunication(sim, explanation);
  const C = comm.value;

  // ---- V: verification --------------------------------------------------------
  const editCounts = new Map<string, number>();
  for (const e of events) {
    if (e.event_type !== "deliverable_field_edited") continue;
    const field = editedFieldId(e.payload);
    if (field) editCounts.set(field, (editCounts.get(field) || 0) + 1);
  }
  const revisedAnswer = [...editCounts.values()].some((n) => n >= 2);
  const verificationMarker = findMarker(explanationLower, VERIFICATION_MARKERS);
  const openedResourceIds = new Set(
    events
      .filter((e) => e.event_type === "resource_opened")
      .map((e) => e.resource_id || String(e.payload?.resourceId || ""))
      .filter(Boolean)
  );
  let V = 0;
  let vDetail = "No answer revision or explicit check was found.";
  if (revisedAnswer) {
    V = 1;
    vDetail = "Revised an answer after the first entry.";
  } else if (verificationMarker) {
    V = 1;
    vDetail = `The written answer mentions checking the work ("${verificationMarker}").`;
  } else if (openedResourceIds.size >= 2) {
    V = 0.5;
    vDetail = `Consulted ${openedResourceIds.size} resources, but no explicit check or revision was found.`;
  }

  // ---- J: stakeholder question -------------------------------------------------
  const firedRuleIds = events
    .filter((e) => e.event_type === "message_received")
    .map((e) => {
      const r = e.payload?.ruleId;
      return typeof r === "string" ? r : "";
    })
    .filter(Boolean);
  const relevantAsk = firedRuleIds.some((r) => r.startsWith("rel_"));
  const partialAsk = firedRuleIds.some((r) => !r.startsWith("rel_"));
  const askedAnything = messages.some((m) => m.thread === "stakeholder" && m.sender === "candidate");
  const lastQuestion =
    [...messages].reverse().find((m) => m.thread === "stakeholder" && m.sender === "candidate")?.body ||
    null;
  let J = 0;
  let jDetail = "No stakeholder question was asked.";
  if (relevantAsk) {
    J = 1;
    jDetail = "Asked a relevant clarifying question that targeted the key ambiguity.";
  } else if (partialAsk) {
    J = 0.5;
    jDetail = "Asked a question on a useful topic, but not the one that mattered most.";
  } else if (askedAnything) {
    J = 0;
    jDetail = "Messaged the stakeholder, but the question did not target the key ambiguity.";
  }

  // ---- components + Raw ----------------------------------------------------------
  const componentValues: Record<MicroComponentKey, { value: number; detail: string; applicable: boolean }> = {
    O: {
      value: O,
      detail:
        objectiveQs.length > 0
          ? `${objCorrectCount} of ${objectiveQs.length} objective answers correct (${objEarned} of ${objAvailable} points).`
          : "This simulation has no objective questions.",
      applicable: objectiveQs.length > 0,
    },
    E: {
      value: E,
      detail:
        multiQs.length > 0
          ? `Precision ${fmt2(precision)} (${tp} of ${tp + fp} selections correct), recall ${fmt2(recall)} (${tp} of ${tp + fn} expected items found).`
          : "This simulation has no multi-select question, so this component is not scored.",
      applicable: multiQs.length > 0,
    },
    R: {
      value: R,
      detail:
        textQs.length > 0
          ? `${conceptsPresent} of ${conceptsTotal} expected concepts covered in the written answer.`
          : "This simulation has no written question, so this component is not scored.",
      applicable: textQs.length > 0,
    },
    C: {
      value: C,
      detail:
        textQs.length > 0
          ? `${comm.checks.filter((c) => c.passed).length} of 4 checks passed: ` +
            comm.checks.map((c) => `${c.name.toLowerCase()} (${c.passed ? "yes" : "no"})`).join(", ") +
            "."
          : "This simulation has no written question, so this component is not scored.",
      applicable: textQs.length > 0,
    },
    V: { value: V, detail: vDetail, applicable: true },
    J: { value: J, detail: jDetail, applicable: true },
  };

  const applicableKeys = (Object.keys(COMPONENT_WEIGHTS) as MicroComponentKey[]).filter(
    (k) => componentValues[k].applicable
  );
  const applicableWeightSum = applicableKeys.reduce((s, k) => s + COMPONENT_WEIGHTS[k], 0);
  const components = {} as Record<MicroComponentKey, MicroComponent>;
  let rawScore01 = 0;
  for (const k of Object.keys(COMPONENT_WEIGHTS) as MicroComponentKey[]) {
    const cv = componentValues[k];
    const usedWeight = cv.applicable ? COMPONENT_WEIGHTS[k] / applicableWeightSum : 0;
    rawScore01 += usedWeight * cv.value;
    components[k] = {
      key: k,
      label: COMPONENT_LABELS[k],
      weight: COMPONENT_WEIGHTS[k],
      usedWeight,
      value: cv.value,
      detail: cv.detail,
      applicable: cv.applicable,
    };
  }
  const raw = Math.round(100 * rawScore01 * 10) / 10; // one decimal place

  // ---- coverage -------------------------------------------------------------------
  const answeredFraction = (qs: MicroQuestion[]) =>
    qs.length > 0 ? qs.filter((q) => isAnswered(answerFor(answers, q))).length / qs.length : 0;
  const explanationOk =
    textQs.length > 0
      ? textQs.filter((q) => {
          const raw = answerFor(answers, q);
          return typeof raw === "string" && raw.trim().length >= MIN_EXPLANATION_CHARS;
        }).length / textQs.length
      : 0;
  const weightsCfg = { ...COVERAGE_WEIGHTS, ...(sim.coverageWeights || {}) };
  const signalDefs: { key: keyof typeof COVERAGE_WEIGHTS; label: string; completed: number; applicable: boolean }[] = [
    { key: "objective", label: "Objective questions answered", completed: answeredFraction(objectiveQs), applicable: objectiveQs.length > 0 },
    { key: "evidence", label: "Evidence question answered", completed: answeredFraction(multiQs), applicable: multiQs.length > 0 },
    { key: "explanation", label: `Explanation of ${MIN_EXPLANATION_CHARS}+ characters`, completed: explanationOk, applicable: textQs.length > 0 },
    { key: "resources", label: "Resources opened", completed: openedResourceIds.size > 0 ? 1 : 0, applicable: true },
    { key: "stakeholder", label: "Stakeholder asked", completed: askedAnything ? 1 : 0, applicable: true },
  ];
  const coverageSignals: MicroCoverageSignal[] = signalDefs.map((s) => ({
    key: s.key,
    label: s.label,
    weight: s.applicable ? weightsCfg[s.key] : 0,
    completed: s.completed,
    applicable: s.applicable,
  }));
  const coverageTotal = coverageSignals.reduce((s, x) => s + x.weight, 0);
  const coverageEarned = coverageSignals.reduce((s, x) => s + x.weight * x.completed, 0);
  const coverage =
    coverageTotal > 0 ? Math.min(1, Math.max(0, Math.round((coverageEarned / coverageTotal) * 100) / 100)) : 0;

  // ---- adjusted + band ---------------------------------------------------------------
  const adjusted = Math.max(0, Math.min(100, Math.round(50 + coverage * (raw - 50))));
  let { band, label: bandLabel } = bandForScore(adjusted);
  if (coverage < INSUFFICIENT_COVERAGE) {
    band = "insufficient";
    bandLabel = "Insufficient evidence";
  }

  // ---- sections (per-question breakdown, kept for older consumers) -------------------
  const sections: MicroSectionResult[] = sim.questions.map((q) => {
    const raw = answerFor(answers, q);
    if (q.kind === "text") {
      const text = typeof raw === "string" ? raw : "";
      const concepts = conceptsByQuestion.get(q.id) || [];
      const earned = text.trim() ? conceptPoints(q, concepts) : 0;
      return {
        questionId: q.id,
        prompt: q.prompt,
        kind: q.kind,
        competencyKey: q.competencyKey,
        candidateAnswer: text,
        expectedEvidence: q.expectedEvidence,
        pointsEarned: earned,
        pointsAvailable: q.points,
        correct: earned >= q.points * 0.75,
        concepts,
      };
    }
    const { earned, correct, answerText } = scoreObjective(q, raw);
    return {
      questionId: q.id,
      prompt: q.prompt,
      kind: q.kind,
      competencyKey: q.competencyKey,
      candidateAnswer: answerText,
      expectedEvidence: q.expectedEvidence,
      pointsEarned: earned,
      pointsAvailable: q.points,
      correct,
    };
  });

  // ---- competencies -------------------------------------------------------------------
  // Each competency is a points-weighted blend of the component values that
  // feed it: single-choice and number questions contribute their correctness
  // (the O measure per question), multi-select questions contribute their F1
  // (the E measure per question), the written question contributes an equal
  // blend of its concept credit (R) and the communication checks (C), and the
  // stakeholder competency receives J. Verification (V) stays overall-only.
  const compSignals = new Map<string, { weight: number; value: number; answeredWeight: number }[]>();
  for (const c of sim.competencies) compSignals.set(c.key, []);
  for (const q of sim.questions) {
    const list = compSignals.get(q.competencyKey);
    if (!list) continue;
    const raw = answerFor(answers, q);
    const answered = isAnswered(raw);
    let value = 0;
    if (q.kind === "multi_select") value = multiSelectF1(q, raw).f1;
    else if (q.kind === "text") {
      const defs = q.concepts || [];
      const results = conceptsByQuestion.get(q.id) || [];
      const totalW = defs.reduce((s, c) => s + (c.weight ?? 1), 0);
      const credit = defs.reduce((s, c, i) => s + (c.weight ?? 1) * (results[i]?.quality ?? 0), 0);
      const rq = totalW > 0 ? credit / totalW : 0;
      value = 0.5 * rq + 0.5 * C;
    } else value = scoreObjective(q, raw).correct ? 1 : 0;
    list.push({ weight: q.points, value, answeredWeight: answered ? q.points : 0 });
  }
  const shList = compSignals.get(sim.stakeholderCompetencyKey);
  if (shList)
    shList.push({
      weight: sim.stakeholderPoints,
      value: J,
      answeredWeight: askedAnything ? sim.stakeholderPoints : 0,
    });

  const competencies: MicroCompetencyResult[] = sim.competencies.map((c) => {
    const list = compSignals.get(c.key) || [];
    let totalW = list.reduce((s, x) => s + x.weight, 0);
    let score01: number;
    let coverage01: number;
    if (totalW > 0) {
      score01 = list.reduce((s, x) => s + x.weight * x.value, 0) / totalW;
      coverage01 = list.reduce((s, x) => s + x.answeredWeight, 0) / totalW;
    } else {
      // A competency with no directly mapped question inherits the overall
      // component blend, so it reflects the whole attempt deterministically.
      score01 = rawScore01;
      coverage01 = coverage;
      totalW = 100;
    }
    const pct = Math.round(score01 * 100);
    const b =
      coverage01 < INSUFFICIENT_COVERAGE
        ? { band: "insufficient", label: "Insufficient evidence" }
        : bandForScore(pct);
    return {
      key: c.key,
      label: c.label,
      earned: Math.round(score01 * totalW),
      available: totalW,
      band: b.band,
      bandLabel: b.label,
      confidence: Math.round(coverage01 * 100) / 100,
    };
  });

  // ---- strengths / improvements ---------------------------------------------------------
  const strengths = sections
    .filter((s) => s.correct)
    .map((s) => sim.strengthTemplates[s.questionId])
    .filter(Boolean)
    .slice(0, 3);
  if (relevantAsk && strengths.length < 3)
    strengths.push("Asked the stakeholder a relevant clarifying question before concluding.");
  const improvements = sections
    .filter((s) => !s.correct)
    .map((s) => sim.improvementTemplates[s.questionId])
    .filter(Boolean)
    .slice(0, 2);
  if (improvements.length === 0 && !relevantAsk)
    improvements.push(
      askedAnything
        ? "The stakeholder messages did not probe the ambiguity that mattered. A targeted clarifying question would have strengthened the evidence."
        : "No stakeholder question was asked. In real work, confirming assumptions with the owner strengthens a recommendation."
    );

  // ---- evidence trail ---------------------------------------------------------------------
  const trail: MicroTrailItem[] = [];
  const resourceTitles = new Map(sim.resources.map((r) => [r.id, r.title]));
  const questionKinds = new Map(sim.questions.map((q) => [q.id, q.kind]));
  const seenFields = new Set<string>();
  const seenResources = new Set<string>();
  for (const e of events) {
    const at = e.created_at || null;
    if (e.event_type === "session_started") {
      trail.push({ label: "Started", detail: "Timer started.", at });
    } else if (e.event_type === "resource_opened") {
      const id = e.resource_id || String(e.payload?.resourceId || "");
      if (seenResources.has(id)) continue;
      seenResources.add(id);
      trail.push({ label: "Resource opened", detail: resourceTitles.get(id) || id || "Resource", at });
    } else if (e.event_type === "deliverable_field_edited") {
      const field = editedFieldId(e.payload);
      const kind = questionKinds.get(field);
      if (seenFields.has(field)) {
        trail.push({ label: "Answer revised", detail: `Changed the answer to "${field}".`, at });
        continue;
      }
      seenFields.add(field);
      if (kind === "multi_select") trail.push({ label: "Evidence selected", detail: `Answered "${field}".`, at });
      else if (kind === "text") trail.push({ label: "Explanation drafted", detail: `Wrote the answer to "${field}".`, at });
      else trail.push({ label: "Decision selected", detail: `Answered "${field}".`, at });
    } else if (e.event_type === "message_sent") {
      trail.push({ label: "Stakeholder question", detail: lastQuestion ? `"${lastQuestion}"` : "Sent a message.", at });
    } else if (e.event_type === "submission_confirmed") {
      trail.push({ label: "Submitted", detail: "Work submitted for scoring.", at });
    }
  }
  if (trail.length === 0) {
    // No event log (older sessions): derive a minimal trail from the answers.
    for (const q of sim.questions) {
      if (!isAnswered(answerFor(answers, q))) continue;
      const label =
        q.kind === "multi_select" ? "Evidence selected" : q.kind === "text" ? "Explanation drafted" : "Decision selected";
      trail.push({ label, detail: `Answered "${q.id}".`, at: null });
    }
    if (askedAnything)
      trail.push({ label: "Stakeholder question", detail: lastQuestion ? `"${lastQuestion}"` : "Sent a message.", at: null });
    trail.push({ label: "Submitted", detail: "Work submitted for scoring.", at: null });
  }

  const analysis: MicroAnalysis = {
    components,
    raw,
    coverage,
    coverageSignals,
    adjusted,
    band,
    bandLabel,
    competencies,
    trail,
    strengths,
    improvements,
    explanation,
    aiDisclosure: parseAiDisclosure(answers),
  };

  return {
    format: "micro",
    simulationTitle: sim.title,
    roleKey: sim.roleKey,
    slug: sim.slug,
    total: adjusted,
    band,
    bandLabel,
    completionSeconds: input.completionSeconds ?? null,
    sections,
    strengths,
    improvements,
    competencies,
    confidence: coverage,
    stakeholder: {
      asked: askedAnything,
      relevant: relevantAsk,
      pointsEarned: relevantAsk ? sim.stakeholderPoints : 0,
      pointsAvailable: sim.stakeholderPoints,
      lastQuestion,
    },
    writtenEvaluationMode: "keyword",
    disclaimer: PROTOTYPE_DISCLAIMER,
    analysis,
  };
}

// ---------------------------------------------------------------------------
// Pipeline (loads the submission, runs the pure analysis, persists results)
// ---------------------------------------------------------------------------
export async function runMicroScoring(sessionId: string): Promise<{ analysisRunId: string }> {
  const db = createAdminSupabaseClient();

  const { data: existing } = await db
    .from("sim_analysis_runs")
    .select("id")
    .eq("session_id", sessionId)
    .eq("status", "complete")
    .maybeSingle();
  if (existing) return { analysisRunId: existing.id };

  const { data: session } = await db.from("sim_sessions").select("*").eq("id", sessionId).single();
  if (!session) throw new Error("Session not found");
  const { data: submission } = await db
    .from("sim_submissions")
    .select("snapshot, external_ai_disclosed")
    .eq("session_id", sessionId)
    .single();
  if (!submission) throw new Error("No submission to score");

  const content = await getVersionContent(session.template_version_id);
  if (!isMicroContent(content)) throw new Error("Not a micro simulation");
  const sim = content as MicroSimContent;

  const { data: run, error: runErr } = await db
    .from("sim_analysis_runs")
    .insert({ session_id: sessionId, status: "running", engine_version: "micro-v2" })
    .select("id")
    .single();
  if (runErr) throw new Error(`Could not create analysis run: ${runErr.message}`);

  try {
    const snapshot = submission.snapshot as {
      deliverable: Record<string, unknown>;
    };
    const answers = snapshot.deliverable || {};
    const events = await listEvents(sessionId);
    const messages = await listMessages(sessionId);

    const completionSeconds =
      session.started_at && session.submitted_at
        ? Math.round(
            (new Date(session.submitted_at).getTime() - new Date(session.started_at).getTime()) /
              1000
          )
        : null;

    const result = analyzeMicroSubmission(sim, {
      answers,
      events,
      messages,
      completionSeconds,
    });

    // If the runner did not write the "__aiDisclosure" answers key, fall back
    // to the boolean captured on the submission row. Never affects the score.
    if (result.analysis && !result.analysis.aiDisclosure) {
      result.analysis.aiDisclosure = { used: Boolean(submission.external_ai_disclosed) };
    }

    // ---- persist ----------------------------------------------------------
    // Competency rows + evidence items keep the employer report working.
    for (const comp of result.competencies) {
      await db.from("sim_competency_results").insert({
        analysis_run_id: run.id,
        competency_key: comp.key,
        label: comp.label,
        band: comp.band,
        adjusted_score: (comp.available > 0 ? comp.earned / comp.available : 0).toFixed(4),
        confidence: (comp.confidence ?? 0).toFixed(4),
        coverage: (comp.confidence ?? 0).toFixed(4),
        consistency: "1.0000",
        evidence_quality: (comp.available > 0 ? comp.earned / comp.available : 0).toFixed(4),
        critical: false,
        summary: "",
      });
    }
    for (const s of result.sections) {
      await db.from("sim_evidence_items").insert({
        analysis_run_id: run.id,
        competency_key: s.competencyKey,
        indicator: s.prompt,
        source: s.kind === "text" ? "authored_rule" : "deterministic",
        quality: (s.pointsAvailable ? s.pointsEarned / s.pointsAvailable : 0).toFixed(4),
        weight: s.pointsAvailable.toFixed(4),
        relevance: "1.0000",
        independence: "1.0000",
        excerpts: [s.candidateAnswer || "(no answer)", `Expected: ${s.expectedEvidence}`],
        explanation: s.correct ? "Matches the expected evidence." : "Differs from the expected evidence.",
      });
    }

    await db
      .from("sim_analysis_runs")
      .update({
        status: "complete",
        overall: (result.total / 100).toFixed(4),
        recommendation: null,
        result,
        ai_use_summary: { scoringMode: "deterministic" },
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    /*
     * No share token is minted. See the note in v2/run.ts: sharing is the
     * candidate's decision, made through the Work Receipt, not a permanent
     * public URL created for them as a side effect of scoring.
     */

    await db
      .from("sim_sessions")
      .update({ status: "analyzed" })
      .eq("id", sessionId)
      .eq("status", "submitted");
    await issueCredential(sessionId);
    await db
      .from("sim_sessions")
      .update({ status: "report_ready" })
      .eq("id", sessionId)
      .eq("status", "analyzed");

    return { analysisRunId: run.id };
  } catch (err) {
    await db
      .from("sim_analysis_runs")
      .update({ status: "failed", error: err instanceof Error ? err.message : String(err) })
      .eq("id", run.id);
    throw err;
  }
}
