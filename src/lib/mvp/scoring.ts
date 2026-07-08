// Deterministic, transparent MVP scoring. This is a "preliminary simulation
// signal" — NOT a validated psychometric or AI model. Every score is derived
// from explicit, inspectable signals in the candidate's own submission and is
// always reported alongside the evidence that produced it.

import type { OverallSignal, ReportJson, ScoreJson, SimulationEvent } from "./types";

export interface ScoringSignal {
  key: string;
  label: string;
  hit: boolean;
  evidence: string;
}

export interface ScoringResult {
  overall_score: number;
  score_json: ScoreJson;
  signals: ScoringSignal[];
  report_json: ReportJson;
}

interface ScoreInput {
  finalRecommendation: string;
  candidateNotes?: string | null;
  events?: SimulationEvent[];
}

function has(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * Score a final recommendation against the eight transparent MVP signals and
 * project them onto the seven Project-Meridian rubric dimensions.
 */
export function scoreAttempt(input: ScoreInput): ScoringResult {
  const rec = (input.finalRecommendation || "").toString();
  const notes = (input.candidateNotes || "").toString();
  const blob = `${rec}\n${notes}`.toLowerCase();
  const words = rec.trim().split(/\s+/).filter(Boolean).length;

  const signals: ScoringSignal[] = [
    {
      key: "clear_recommendation",
      label: "States a clear recommendation (proceed / pass / conditional)",
      hit: has(blob, [
        /\b(recommend|proceed|acquire|pass|walk away|do not|don't|negotiate|renegotiate|conditional|yes|no)\b/
      ]),
      evidence: "Looked for an explicit go / no-go / conditional stance."
    },
    {
      key: "mentions_valuation",
      label: "Engages with valuation",
      hit: has(blob, [/\b(valuation|fair value|multiple|x ebitda|ebitda multiple|dcf|enterprise value|\$\d|2\.4b|billion)\b/]),
      evidence: "Looked for a valuation view (price, multiple, or range)."
    },
    {
      key: "mentions_financials",
      label: "References revenue / EBITDA / margins",
      hit: has(blob, [/\b(revenue|ebitda|margin|cash flow|growth|cagr|leverage|net debt)\b/]),
      evidence: "Looked for use of the underlying financials."
    },
    {
      key: "mentions_risks",
      label: "Identifies key risks",
      hit: has(blob, [/\b(risk|concentration|customer|debt|covenant|change of control|synergy|double-count|terminal growth|downside)\b/]),
      evidence: "Looked for material risks (concentration, hidden debt, synergy double-count)."
    },
    {
      key: "mentions_strategic_fit",
      label: "Considers strategic fit",
      hit: has(blob, [/\b(strategic|fit|synerg|integration|thesis|rationale|portfolio|market position)\b/]),
      evidence: "Looked for a strategic-rationale view, not just numbers."
    },
    {
      key: "explains_assumptions",
      label: "Explains assumptions",
      hit: has(blob, [/\b(assum|assume|assuming|i expect|base case|sensitiv|if we|provided that|depends on)\b/]),
      evidence: "Looked for stated assumptions behind the view."
    },
    {
      key: "communicates_tradeoffs",
      label: "Communicates tradeoffs",
      hit: has(blob, [/\b(however|although|but|on the other hand|tradeoff|trade-off|upside|downside|balance|while)\b/]),
      evidence: "Looked for balanced reasoning across upside and downside."
    },
    {
      key: "provides_conclusion",
      label: "Provides a substantive conclusion",
      hit: words >= 40,
      evidence: `Submission length: ${words} words (>= 40 indicates a developed conclusion).`
    }
  ];

  const hits = signals.filter((s) => s.hit);
  const overall_score = clamp((hits.length / signals.length) * 100);

  const sig = (k: string) => signals.find((s) => s.key === k)?.hit ?? false;
  const dim = (...keys: string[]) => {
    const vals = keys.map((k) => (sig(k) ? 1 : 0));
    const ratio = vals.reduce((a, b) => a + b, 0) / keys.length;
    return clamp(40 + ratio * 60); // floor of 40 so a dimension is never punitive-zero
  };

  const score_json: ScoreJson = {
    analytical_accuracy: dim("mentions_financials", "mentions_valuation"),
    business_judgment: dim("clear_recommendation", "mentions_strategic_fit"),
    prioritization: dim("mentions_risks", "communicates_tradeoffs"),
    communication_clarity: dim("provides_conclusion", "communicates_tradeoffs"),
    risk_detection: dim("mentions_risks"),
    ambiguity_handling: dim("explains_assumptions", "communicates_tradeoffs"),
    recommendation_quality: dim("clear_recommendation", "provides_conclusion")
  };

  const report_json = buildReport(input, signals, overall_score);

  return { overall_score, score_json, signals, report_json };
}

function signalToSentence(s: ScoringSignal): string {
  return s.label;
}

export function buildReport(
  input: ScoreInput,
  signals: ScoringSignal[],
  overall_score: number
): ReportJson {
  const hits = signals.filter((s) => s.hit);
  const misses = signals.filter((s) => !s.hit);

  const overall_signal: OverallSignal =
    overall_score >= 75
      ? "strong"
      : overall_score >= 55
        ? "moderate"
        : overall_score >= 30
          ? "weak"
          : "insufficient";

  const strengths = hits.map(signalToSentence);
  const risks = misses.map((s) => `Did not clearly: ${s.label.toLowerCase()}`);

  // Evidence is mandatory: tie each signal back to where it came from.
  const evidence: string[] = signals.map(
    (s) => `${s.hit ? "✓" : "✗"} ${s.label} — ${s.evidence}`
  );
  const events = input.events ?? [];
  if (events.length) {
    const opened = events.filter((e) => e.event_type === "resource_opened").length;
    if (opened) evidence.push(`Opened ${opened} resource(s) during the simulation.`);
    const noteEdits = events.filter((e) => e.event_type === "note_updated").length;
    if (noteEdits) evidence.push(`Updated working notes ${noteEdits} time(s).`);
  }

  const interview_questions = [
    "Walk me through how you arrived at your valuation range for Meridian.",
    "Which single risk would most change your recommendation, and why?",
    "What did management's case get right, and where were they too optimistic?",
    "If you had 30 more minutes, what would you diligence first?"
  ];
  if (!signals.find((s) => s.key === "mentions_risks")?.hit) {
    interview_questions.unshift("You didn't surface the deal's biggest risks — what would you look for?");
  }

  const summary =
    `Preliminary simulation signal: ${overall_signal.toUpperCase()} (${overall_score}/100). ` +
    `This reflects ${hits.length} of ${signals.length} transparent execution signals present in the candidate's submitted work. ` +
    `It is a preliminary signal from a single timed exercise, not a validated predictor — use it alongside the evidence below and your own judgment.`;

  return {
    summary,
    strengths: strengths.length ? strengths : ["No clear strengths detected in the submission."],
    risks: risks.length ? risks : ["No major gaps detected against the scored signals."],
    evidence,
    interview_questions,
    overall_signal
  };
}
