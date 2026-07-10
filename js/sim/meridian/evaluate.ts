/**
 * Part G — FP&A Forecast Review analysis engine.
 * Evidence-only scoring. No protected-trait inference. Node-runnable.
 *
 * 6 Scoring Signals:
 *   1. Modeling Discipline      — did candidate stress-test the forecast model?
 *   2. Assumption Checking      — did candidate interrogate key assumptions?
 *   3. Risk Detection           — did candidate catch the 3 planted concerns?
 *   4. Business Judgment        — does Go/Hold/Revise align with evidence?
 *   5. Communication Clarity    — is the VP Memo clear and specific?
 *   6. AI Verification Behavior — did candidate verify AI suggestions?
 *
 * Output: Advance / Hold / Reject + High/Medium/Low confidence +
 * executive summary + evidence timeline + caught/missed + interview questions.
 * Benchmark stays insufficient_data.
 */

import type { MeridianSeedParams } from './seed.js';
import { PLANTED_ERRORS, AMBIGUITY_POINT } from './documents.js';
import type { AIUsageEvent } from './ai.js';
import type { ChatMessage } from './chatMachine.js';
import communicationRubric from '../content/rubrics/communication.v1.json';

export type DimensionScore = {
  dimension: string;
  score: number | 'insufficient_data' | 'caught' | 'missed' | 'good' | 'poor';
  label?: string;
  rationale: string;
  evidence: string[];
  method?: 'deterministic' | 'llm_rubric' | 'heuristic_fallback';
};

export type EvaluationResult = {
  session_id?: string;
  seed: string;
  executive_recommendation: 'Advance' | 'Hold' | 'Reject';
  confidence: 'High' | 'Medium' | 'Low';
  overall_summary: string;
  planted_errors: {
    id: string;
    title: string;
    status: 'caught' | 'missed';
    evidence: string[];
  }[];
  ambiguity: DimensionScore;
  hard_skills: DimensionScore[];
  soft_skills: DimensionScore[];
  daniel_exchange: ChatMessage[];
  ai_usage_summary: {
    events: AIUsageEvent[];
    trap_triggered: boolean;
    trap_caught: boolean | null;
  };
  benchmark: { status: 'insufficient_data'; comparison_text: string };
  final_memo: string;
  timeline: { t: number; label: string; type?: string }[];
  interview_questions: string[];
};

type EvalSession = {
  id?: string;
  seed?: string;
  params: MeridianSeedParams;
  openedDocs: string[];
  assumptions: { id?: string; text: string; affects?: string }[];
  risks: { id?: string; category: string; text: string }[];
  recommendation?: {
    category?: string | null;
    reason1?: string;
    reason2?: string;
    reason3?: string;
    diligence?: string;
  };
  finalMemo?: string;
  valuation?: { growth_rate: number; exit_multiple: number; implied_ev: number; discount_rate?: number };
  event_log?: { type: string; t?: number; label?: string; payload?: unknown }[];
  chatMessages?: ChatMessage[];
  ai_usage_log?: AIUsageEvent[];
  d1_reply_text?: string | null;
  d1_branch?: string | null;
  tabSeconds?: Record<string, number>;
  _elapsedSec?: number;
  plantedErrorFlags?: Record<string, boolean>;
  used_trigger_ids?: string[];
  m1_fired?: boolean;
};

function corpus(session: EvalSession): string {
  return [
    session.finalMemo || '',
    session.recommendation?.reason1,
    session.recommendation?.reason2,
    session.recommendation?.reason3,
    session.recommendation?.diligence,
    session.d1_reply_text,
    ...(session.assumptions || []).map((a) => a.text),
    ...(session.risks || []).map((r) => `${r.category} ${r.text}`),
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();
}

// ── Planted Error Detection ────────────────────────────────────────────────────

/**
 * Error 1 — Revenue growth vs. churn rate.
 * Detection: candidate mentioned churn rate in context of growth target,
 * or flagged the growth/pipeline math in risks/assumptions/memo.
 */
function detectError1(session: EvalSession): { status: 'caught' | 'missed'; evidence: string[] } {
  const text = corpus(session);
  const openedChurn = (session.openedDocs || []).includes('churn_update');

  const flaggedRisk = (session.risks || []).find((r) =>
    /churn|net.*retention|gross.*retention|attrition|growth.*gap|growth.*require|pipeline/.test(
      `${r.category} ${r.text}`.toLowerCase()
    )
  );
  const flaggedAssumption = (session.assumptions || []).find((a) =>
    /churn|net.*retention|gross.*retention|attrition|growth.*require|pipeline/i.test(a.text)
  );
  const inMemo = /churn.*growth|growth.*churn|attrition.*growth|net.*retention.*target|pipeline.*offset/.test(text);

  const evidence: string[] = [];
  if (openedChurn) evidence.push('Opened Churn_Update.pdf');
  if (flaggedRisk) evidence.push(`Risk: [${flaggedRisk.category}] ${flaggedRisk.text}`);
  if (flaggedAssumption) evidence.push(`Assumption: ${flaggedAssumption.text}`);
  if (inMemo) evidence.push('Memo/text addresses churn vs. growth math');
  if (session.plantedErrorFlags?.err_growth_churn_mismatch) evidence.push('Session flag: err_growth_churn_mismatch');

  const caught = evidence.length > 0 && (
    flaggedRisk !== undefined ||
    flaggedAssumption !== undefined ||
    session.plantedErrorFlags?.err_growth_churn_mismatch ||
    inMemo
  );
  if (caught) return { status: 'caught', evidence };

  return {
    status: 'missed',
    evidence: [
      `No risk/assumption/memo evidence linking ${session.params?.churn_rate ?? 7}% gross churn to the ${session.params?.q3_revenue_growth ?? 12}% revenue growth target`,
    ],
  };
}

/**
 * Error 2 — Opex growth vs. revenue growth (margin compression).
 * Detection: risk/assumption mentioning opex/margin divergence, OR
 * model adjusted to show lower margin (exit_multiple lowered 2+ pp).
 */
function detectError2(session: EvalSession): { status: 'caught' | 'missed'; evidence: string[] } {
  const text = corpus(session);
  const params = session.params;

  const flaggedRisk = (session.risks || []).find((r) =>
    /opex|margin.*compres|operating.*expense|expense.*faster|compress|squeeze/.test(
      `${r.category} ${r.text}`.toLowerCase()
    )
  );
  const flaggedAssumption = (session.assumptions || []).find((a) =>
    /opex|margin.*compres|operating.*expense.*revenue|expense.*faster|18.*12|faster.*revenue/i.test(a.text)
  );
  const modelLowered =
    session.valuation !== undefined &&
    params !== undefined &&
    session.valuation.exit_multiple <= params.gross_margin - 2;
  const inMemo = /opex.*revenue|margin.*compres|18.*12|expense.*grow.*faster|ebitda.*shrink/.test(text);

  const evidence: string[] = [];
  if (flaggedRisk) evidence.push(`Risk: [${flaggedRisk.category}] ${flaggedRisk.text}`);
  if (flaggedAssumption) evidence.push(`Assumption: ${flaggedAssumption.text}`);
  if (modelLowered) evidence.push(`Model: gross margin adjusted down to ${session.valuation?.exit_multiple}% (plan: ${params?.gross_margin}%)`);
  if (inMemo) evidence.push('Memo/text addresses opex vs. revenue divergence');
  if (session.plantedErrorFlags?.err_opex_margin_compression) evidence.push('Session flag: err_opex_margin_compression');

  const caught = evidence.length > 0 && (
    flaggedRisk !== undefined ||
    flaggedAssumption !== undefined ||
    modelLowered ||
    session.plantedErrorFlags?.err_opex_margin_compression ||
    inMemo
  );
  if (caught) return { status: 'caught', evidence };

  return {
    status: 'missed',
    evidence: [
      `No evidence of noting ${session.params?.opex_growth ?? 18}% opex growth vs ${session.params?.q3_revenue_growth ?? 12}% revenue growth — EBITDA margin compression not flagged`,
    ],
  };
}

/**
 * Error 3 — Hire ramp vs. extended sales cycle.
 * Detection: Jordan's manager update (J1) must have fired, AND candidate
 * noted that extended sales cycle means Q3 hires won't contribute Q3 revenue.
 * Alternatively: candidate anticipated the issue before the update.
 */
function detectError3(session: EvalSession): { status: 'caught' | 'missed'; evidence: string[] } {
  const text = corpus(session);
  const m1Fired =
    session.m1_fired ||
    (session.used_trigger_ids || []).includes('J1');

  const flaggedRisk = (session.risks || []).find((r) =>
    /ramp|sales.*cycle.*ext|cycle.*ext|75.*day|q4.*hire|hire.*q4|hire.*contribut|no.*q3.*rev/.test(
      `${r.category} ${r.text}`.toLowerCase()
    )
  );
  const flaggedAssumption = (session.assumptions || []).find((a) =>
    /ramp|sales.*cycle.*ext|cycle.*extend|75.*day|q[34].*revenue|hire.*contribut/i.test(a.text)
  );
  const inMemo = /ramp.*cycle|cycle.*ramp|75.*day|cycle.*extend.*hire|hire.*revenue.*q[34]/.test(text);
  const anticipatedEarly =
    /ramp.*sales.*cycle|sales.*cycle.*ramp|hire.*pipeline|75.*day/.test(text) && !m1Fired;

  const evidence: string[] = [];
  if (m1Fired) evidence.push('Manager update received: VP Sales flagged sales cycle +30 days, 2 at-risk renewals');
  if (flaggedRisk) evidence.push(`Risk: [${flaggedRisk.category}] ${flaggedRisk.text}`);
  if (flaggedAssumption) evidence.push(`Assumption: ${flaggedAssumption.text}`);
  if (inMemo) evidence.push('Memo/text addresses ramp vs. extended sales cycle');
  if (session.plantedErrorFlags?.err_ramp_sales_cycle_mismatch) evidence.push('Session flag: err_ramp_sales_cycle_mismatch');
  if (anticipatedEarly) evidence.push('Candidate anticipated ramp/cycle conflict before manager update');

  const caught =
    session.plantedErrorFlags?.err_ramp_sales_cycle_mismatch ||
    anticipatedEarly ||
    (m1Fired && (flaggedRisk !== undefined || flaggedAssumption !== undefined || inMemo));

  if (caught) return { status: 'caught', evidence: evidence.length ? evidence : ['Caught via plantedErrorFlags'] };

  if (!m1Fired) {
    return {
      status: 'missed',
      evidence: ['VP Sales manager update not received — ramp/cycle extension could not be detected'],
    };
  }
  return {
    status: 'missed',
    evidence: [
      'Manager update received but candidate did not note that extended sales cycle (75 days) + ramp (30 days) = Q3 hires cannot contribute Q3 revenue',
    ],
  };
}

// ── Ambiguity Scoring ──────────────────────────────────────────────────────────

/**
 * Ambiguity point: at-risk customer ARR amounts are NOT provided.
 * Good: note the gap, list requesting ARR breakdown in verification steps.
 * Poor: state a specific revenue impact without verifying with account managers.
 */
function scoreAmbiguity(session: EvalSession): DimensionScore {
  const diligence = (session.recommendation?.diligence || '').toLowerCase();
  const memo = (session.finalMemo || '').toLowerCase();
  const text = `${diligence}\n${memo}`;
  const openedConcentration = (session.openedDocs || []).includes('concentration_note');

  // Good: explicitly requests the at-risk ARR data
  const requestsAtRiskData =
    /request.*arr|arr.*request|verify.*renewal|confirm.*account|arr.*breakdown|account.*arr|at.?risk.*arr.*unknown|unknown.*at.?risk|get.*arr|confirm.*arr/i.test(
      text
    );

  // Poor: invents specific dollar amount for at-risk ARR without opening concentration note
  // or without flagging it as an estimate
  const inventsFact =
    /\$\d+(\.\d+)?\s*(m|million|k|b)\s*(arr|at.?risk|renewal|customer)|lose \d+%\s*(arr|revenue)|impact.*\$\d+/i.test(
      text
    ) && !openedConcentration;

  if (requestsAtRiskData) {
    return {
      dimension: 'Ambiguity handling',
      score: 'good',
      label: 'Good pattern',
      rationale:
        'Candidate noted the at-risk ARR gap and/or listed requesting ARR breakdown from account managers in verification steps.',
      evidence: [diligence.slice(0, 200) || memo.slice(0, 200)],
      method: 'deterministic',
    };
  }
  if (inventsFact) {
    return {
      dimension: 'Ambiguity handling',
      score: 'poor',
      label: 'Poor pattern',
      rationale:
        'Candidate stated a specific revenue/ARR impact for at-risk customers without verifying the ARR breakdown with account managers or opening the concentration note.',
      evidence: [text.slice(0, 220)],
      method: 'deterministic',
    };
  }
  if (!(session.recommendation?.diligence || '').trim()) {
    return {
      dimension: 'Ambiguity handling',
      score: 'insufficient_data',
      rationale: 'No verification steps text to classify ambiguity handling.',
      evidence: [],
      method: 'deterministic',
    };
  }
  return {
    dimension: 'Ambiguity handling',
    score: 'insufficient_data',
    rationale:
      'Verification steps present but neither clearly requests at-risk ARR data nor invents a specific revenue figure.',
    evidence: [diligence.slice(0, 200)],
    method: 'deterministic',
  };
}

// ── 6 Scoring Signals ─────────────────────────────────────────────────────────

/**
 * Signal 1 — Modeling Discipline.
 * Did the candidate actively stress-test the forecast model inputs?
 */
function scoreModelingDiscipline(session: EvalSession): DimensionScore {
  const v = session.valuation;
  if (!v) {
    return {
      dimension: 'Modeling Discipline',
      score: 'insufficient_data',
      rationale: 'No forecast model adjustment recorded.',
      evidence: [],
      method: 'deterministic',
    };
  }
  const params = session.params;
  const evidence = [
    `Model inputs submitted: revenue growth ${v.growth_rate}%, gross margin ${v.exit_multiple}%, opex growth ${v.discount_rate ?? params?.opex_growth ?? 18}%`,
    `Plan defaults: growth ${params?.q3_revenue_growth}%, GM ${params?.gross_margin}%, opex ${params?.opex_growth}%`,
  ];
  let score = 40;

  // Lowered growth rate from plan (reflects churn or market concern)
  if (params && v.growth_rate < params.q3_revenue_growth - 1) {
    score += 20;
    evidence.push('Growth input lowered below plan — candidate stress-tested');
  }
  // Lowered gross margin (reflects opex compression awareness)
  if (params && v.exit_multiple < params.gross_margin - 1) {
    score += 20;
    evidence.push('Gross margin input lowered below plan — candidate reflected compression');
  }
  // Raised opex growth (conservative scenario)
  if (params && v.discount_rate !== undefined && v.discount_rate > params.opex_growth) {
    score += 15;
    evidence.push('Opex growth input raised above plan — conservative scenario tested');
  }
  // No changes at all
  if (params && Math.abs(v.growth_rate - params.q3_revenue_growth) < 0.1 && Math.abs(v.exit_multiple - params.gross_margin) < 0.1) {
    score = Math.max(10, score - 30);
    evidence.push('Model left unchanged from plan defaults — no stress-test performed');
  }

  return {
    dimension: 'Modeling Discipline',
    score: Math.min(100, score),
    rationale: 'Extent to which candidate adjusted forecast model inputs to reflect identified risks.',
    evidence,
    method: 'deterministic',
  };
}

/**
 * Signal 2 — Assumption Checking.
 * Did the candidate interrogate and log key forecast assumptions?
 */
function scoreAssumptionChecking(session: EvalSession): DimensionScore {
  const list = session.assumptions || [];
  if (!list.length) {
    return {
      dimension: 'Assumption Checking',
      score: 'insufficient_data',
      rationale: 'No assumptions logged.',
      evidence: [],
      method: 'deterministic',
    };
  }
  // Specific assumptions reference numbers, rates, or concrete model levers
  const specific = list.filter((a) =>
    /\d|%|day|week|month|churn|opex|margin|growth|ramp|cycle|arr|revenue/i.test(a.text)
  );
  const score = Math.round((specific.length / list.length) * 60 + Math.min(40, list.length * 13));
  return {
    dimension: 'Assumption Checking',
    score: Math.min(100, score),
    rationale: `${specific.length}/${list.length} assumptions reference concrete forecast levers (numbers, rates, days, or named metrics).`,
    evidence: list.map((a) => a.text).slice(0, 5),
    method: 'deterministic',
  };
}

/**
 * Signal 3 — Risk Detection.
 * How many of the three planted concerns were identified?
 */
function scoreRiskDetection(session: EvalSession, errors: { id: string; status: string }[]): DimensionScore {
  const risks = session.risks || [];
  if (!risks.length) {
    return {
      dimension: 'Risk Detection',
      score: 'insufficient_data',
      rationale: 'No risks logged.',
      evidence: [],
      method: 'deterministic',
    };
  }
  const fpaConcerns = risks.filter((r) =>
    /churn|retention|opex|margin|compres|ramp|cycle|extend|renewal|concentration|runway/i.test(
      `${r.category} ${r.text}`
    )
  );
  const evidence = risks.slice(0, 4).map((r) => `[${r.category}] ${r.text}`);
  const caught = errors.filter((e) => e.status === 'caught').length;
  const score = Math.min(100, fpaConcerns.length * 20 + caught * 15);
  return {
    dimension: 'Risk Detection',
    score,
    rationale: `${fpaConcerns.length} FP&A-relevant risks logged; ${caught}/3 planted concerns reflected in evaluation.`,
    evidence,
    method: 'deterministic',
  };
}

/**
 * Signal 4 — Business Judgment.
 * Does the Go/Hold/Revise recommendation align with the evidence found?
 */
function scoreBusinessJudgment(
  session: EvalSession,
  errors: { status: string }[]
): DimensionScore {
  const cat = session.recommendation?.category || '';
  const caught = errors.filter((e) => e.status === 'caught').length;
  const evidence: string[] = [`Recommendation: ${cat || '(none)'}`, `Planted concerns caught: ${caught}/3`];
  let score = 40;

  if (!cat) {
    return {
      dimension: 'Business Judgment',
      score: 'insufficient_data',
      rationale: 'No recommendation category submitted.',
      evidence: [],
      method: 'deterministic',
    };
  }

  const catLower = cat.toLowerCase();
  if ((catLower === 'go' || catLower === 'proceed') && caught === 0) {
    score = 15;
    evidence.push('Go/Proceed with no concerns caught — weak judgment');
  } else if ((catLower === 'revise' || catLower === 'hold') && caught >= 2) {
    score = 85;
    evidence.push('Revise/Hold recommendation aligns with ≥2 concerns caught');
  } else if ((catLower === 'revise' || catLower === 'hold') && caught >= 1) {
    score = 70;
    evidence.push('Revise/Hold tied to at least one real concern');
  } else {
    score = 45 + caught * 12;
  }

  const reasons = `${session.recommendation?.reason1 || ''} ${session.recommendation?.reason2 || ''}`.toLowerCase();
  if (/churn|opex|margin|ramp|cycle|renewal|concentration|runway/.test(reasons)) {
    score += 5;
    evidence.push('Reasons reference plan-specific FP&A concerns');
  }
  return {
    dimension: 'Business Judgment',
    score: Math.min(100, score),
    rationale: 'Alignment between recommendation severity and FP&A concerns caught/missed, plus specificity of reasoning.',
    evidence,
    method: 'deterministic',
  };
}

/**
 * Signal 5 — Communication Clarity.
 * Is the VP Memo clear, specific, and well-structured?
 */
function scoreCommunicationClarity(session: EvalSession): DimensionScore {
  const r1 = (session.recommendation?.reason1 || '').trim();
  const r2 = (session.recommendation?.reason2 || '').trim();
  const r3 = (session.recommendation?.reason3 || '').trim();
  const memo = (session.finalMemo || [r1, r2, r3].join(' ')).trim();
  if (!memo || memo.length < 40) {
    return {
      dimension: 'Communication Clarity',
      score: 'insufficient_data',
      rationale: 'Insufficient VP Memo / reasons text for communication scoring.',
      evidence: [],
      method: 'heuristic_fallback',
    };
  }
  let score = 40;
  const evidence: string[] = [];

  if (session.recommendation?.category) {
    score += 15;
    evidence.push(`Recommendation stated up front: ${session.recommendation.category}`);
  }
  const reasons = [r1, r2, r3].filter(Boolean);
  if (reasons.length === 3) {
    score += 20;
    evidence.push(`Three distinct reasons: "${r1.slice(0, 50)}"; "${r2.slice(0, 50)}"; "${r3.slice(0, 50)}"`);
  }
  const vague = /synergies will be realized|strong franchise|compelling opportunity|unlock value|management.*experienced/i;
  if (vague.test(memo)) {
    score -= 15;
    evidence.push('Contains vague corporate language without specific numbers');
  } else {
    score += 10;
  }
  if (/\d|%|\$|pp\b|days?/.test(memo)) {
    score += 10;
    evidence.push('Uses specific numbers / metrics in memo');
  }
  evidence.push(`Rubric: ${(communicationRubric as { id?: string }).id || 'communication.v1'}`);
  return {
    dimension: 'Communication Clarity',
    score: Math.max(0, Math.min(100, score)),
    rationale: 'Clarity of recommendation, three distinct non-redundant reasons, use of specific data.',
    evidence,
    method: 'heuristic_fallback',
  };
}

/**
 * Signal 6 — AI Verification Behavior.
 * Did the candidate verify AI output against the data room evidence?
 */
function scoreAiVerificationBehavior(session: EvalSession): DimensionScore {
  const aiLog = session.ai_usage_log || [];
  if (!aiLog.length) {
    return {
      dimension: 'AI Verification Behavior',
      score: 60,
      label: 'Not heavily used',
      rationale: 'No AI usage recorded — neither trap triggered nor blind trust observed.',
      evidence: ['ai_usage_log empty'],
      method: 'deterministic',
    };
  }
  const trap = aiLog.find((e) => e.trap_triggered);
  const evidence = aiLog.map(
    (e) =>
      `${e.timestamp}: trap=${e.trap_triggered} caught=${e.trap_caught} action=${e.candidate_action_after} | ${e.prompt_text.slice(0, 80)}`
  );
  if (trap && trap.trap_caught === false) {
    return {
      dimension: 'AI Verification Behavior',
      score: 25,
      rationale: 'Received AI endorsement of optimistic growth forecast without churn cross-check, and did not subsequently flag the churn/growth mismatch.',
      evidence,
      method: 'deterministic',
    };
  }
  if (trap && trap.trap_caught === true) {
    return {
      dimension: 'AI Verification Behavior',
      score: 90,
      rationale: 'Received AI growth endorsement but verified against churn data and caught the mismatch.',
      evidence,
      method: 'deterministic',
    };
  }
  return {
    dimension: 'AI Verification Behavior',
    score: 70,
    rationale: 'Used AI without triggering the uncritical growth forecast trap path.',
    evidence,
    method: 'deterministic',
  };
}

// ── Interview Questions Generator ──────────────────────────────────────────────

function generateInterviewQuestions(
  errors: { id: string; title: string; status: string }[],
  session: EvalSession
): string[] {
  const questions: string[] = [];
  const missed = errors.filter((e) => e.status === 'missed');
  const caught = errors.filter((e) => e.status === 'caught');

  for (const e of missed) {
    if (e.id === 'err_growth_churn_mismatch') {
      questions.push(
        `Walk me through how you'd pressure-test a ${session.params?.q3_revenue_growth ?? 12}% revenue growth target when gross churn is running at ${session.params?.churn_rate ?? 7}%. What pipeline math would you need to see?`
      );
    }
    if (e.id === 'err_opex_margin_compression') {
      questions.push(
        `If operating expenses grow ${session.params?.opex_growth ?? 18}% but revenue only grows ${session.params?.q3_revenue_growth ?? 12}%, what happens to EBITDA margin? Would you approve the hiring plan anyway?`
      );
    }
    if (e.id === 'err_ramp_sales_cycle_mismatch') {
      questions.push(
        `The VP Sales just told you the sales cycle extended by 30 days. You have 8 new hires starting in July with a 30-day ramp. What does that mean for Q3 revenue projections?`
      );
    }
  }

  for (const e of caught) {
    if (e.id === 'err_growth_churn_mismatch') {
      questions.push(
        `You flagged the churn/growth tension — if you were the CFO, what specific change to the Q3 plan would you require before approving it?`
      );
    }
    if (e.id === 'err_ramp_sales_cycle_mismatch') {
      questions.push(
        `You noted the hire ramp and sales cycle conflict. How would you restructure the Q3 headcount plan to still hit the year-end target?`
      );
    }
  }

  const cat = (session.recommendation?.category || '').toLowerCase();
  if (cat === 'go' || cat === 'proceed') {
    questions.push(
      `Your recommendation is to proceed. What single data point would make you change that view before the board meeting?`
    );
  } else if (cat === 'revise') {
    questions.push(
      `You recommended Revise. What is the minimum set of changes to the Q3 plan that would get you comfortable enough to say Go?`
    );
  }

  if (!questions.length) {
    questions.push('What was your biggest uncertainty in this forecast review, and how did you decide to handle it?');
  }
  return questions.slice(0, 4);
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function requireEvidence(dim: DimensionScore): DimensionScore {
  if ((!dim.evidence || !dim.evidence.length) && dim.score !== 'insufficient_data') {
    return {
      ...dim,
      score: 'insufficient_data',
      rationale: `${dim.rationale} (reclassified: no evidence array)`,
      evidence: [],
    };
  }
  return dim;
}

// ── Main Evaluation ────────────────────────────────────────────────────────────

export function evaluateMeridianSession(session: EvalSession): EvaluationResult {
  const params = session.params;

  // Detect the 3 planted concerns
  const e1 = detectError1(session);
  const e2 = detectError2(session);
  const e3 = detectError3(session);

  const planted = [
    { id: PLANTED_ERRORS[0].id, title: PLANTED_ERRORS[0].title, status: e1.status, evidence: e1.evidence },
    { id: PLANTED_ERRORS[1].id, title: PLANTED_ERRORS[1].title, status: e2.status, evidence: e2.evidence },
    { id: PLANTED_ERRORS[2].id, title: PLANTED_ERRORS[2].title, status: e3.status, evidence: e3.evidence },
  ] as EvaluationResult['planted_errors'];

  // Ambiguity
  const ambiguity = requireEvidence(scoreAmbiguity(session));

  // Hard skills — modeling + detection
  const hard: DimensionScore[] = [
    requireEvidence(scoreModelingDiscipline(session)),
    requireEvidence(scoreAssumptionChecking(session)),
    {
      dimension: 'Concern detection — Revenue growth vs. churn',
      score: e1.status,
      rationale: e1.status === 'caught' ? 'Caught with evidence.' : 'Missed.',
      evidence: e1.evidence,
      method: 'deterministic' as const,
    },
    {
      dimension: 'Concern detection — Opex vs. revenue (margin compression)',
      score: e2.status,
      rationale: e2.status === 'caught' ? 'Caught with evidence.' : 'Missed.',
      evidence: e2.evidence,
      method: 'deterministic' as const,
    },
    {
      dimension: 'Concern detection — Hire ramp vs. extended sales cycle',
      score: e3.status,
      rationale: e3.status === 'caught' ? 'Caught with evidence.' : 'Missed.',
      evidence: e3.evidence,
      method: 'deterministic' as const,
    },
  ];

  // Soft skills — judgment + communication + adaptability + AI
  const soft: DimensionScore[] = [
    ambiguity,
    requireEvidence(scoreBusinessJudgment(session, planted)),
    requireEvidence(scoreRiskDetection(session, planted)),
    requireEvidence(scoreCommunicationClarity(session)),
    requireEvidence(scoreAiVerificationBehavior(session)),
  ];

  // Executive recommendation
  const caughtN = planted.filter((p) => p.status === 'caught').length;
  let executive_recommendation: EvaluationResult['executive_recommendation'] = 'Hold';
  if (caughtN >= 2 && ambiguity.score === 'good') executive_recommendation = 'Advance';
  if (caughtN === 0 && ambiguity.score === 'poor') executive_recommendation = 'Reject';

  // Confidence
  const confidence: EvaluationResult['confidence'] =
    (session.event_log || []).length >= 12
      ? 'High'
      : (session.event_log || []).length >= 6
      ? 'Medium'
      : 'Low';

  // Numeric soft skill average
  const numericSoft = soft.filter((s) => typeof s.score === 'number') as (DimensionScore & { score: number })[];
  const avg =
    numericSoft.length > 0
      ? numericSoft.reduce((a, s) => a + s.score, 0) / numericSoft.length
      : 50;

  // Alex Kim / CFO exchange (D1 analog)
  const alexExchange = (session.chatMessages || []).filter(
    (m) =>
      m.sender === 'alex' ||
      m.triggerId === 'A1_reply' ||
      (m.sender === 'candidate' && m.triggerId === 'A1_reply')
  );

  const trapEv = (session.ai_usage_log || []).find((e) => e.trap_triggered);

  const timeline = (session.event_log || [])
    .slice()
    .sort((a, b) => (a.t || 0) - (b.t || 0))
    .map((e) => ({ t: e.t || 0, label: e.label || e.type, type: e.type }));

  const overall_summary =
    `Caught ${caughtN}/3 FP&A concerns. Ambiguity handling: ${ambiguity.label || ambiguity.score}. ` +
    `Soft-skill numeric avg: ${Math.round(avg)}. ` +
    `${AMBIGUITY_POINT.title} classified from verification-steps/memo evidence. ` +
    `Manager update (VP Sales): ${session.m1_fired ? 'received and actioned' : 'not yet received'}.`;

  const interviewQuestions = generateInterviewQuestions(planted, session);

  return {
    session_id: session.id,
    seed: params.seed,
    executive_recommendation,
    confidence,
    overall_summary,
    planted_errors: planted,
    ambiguity,
    hard_skills: hard,
    soft_skills: soft,
    daniel_exchange: alexExchange, // kept as 'daniel_exchange' for API compat — now represents Alex Kim (CFO)
    ai_usage_summary: {
      events: session.ai_usage_log || [],
      trap_triggered: !!trapEv,
      trap_caught: trapEv ? trapEv.trap_caught : null,
    },
    benchmark: {
      status: 'insufficient_data',
      comparison_text:
        'Not enough completed pilot sessions yet to benchmark this candidate against real hiring outcomes.',
    },
    final_memo:
      session.finalMemo ||
      [
        session.recommendation?.category,
        session.recommendation?.reason1,
        session.recommendation?.reason2,
        session.recommendation?.reason3,
        session.recommendation?.diligence,
      ]
        .filter(Boolean)
        .join('\n'),
    timeline,
    interview_questions: interviewQuestions,
  };
}

export function formatMeridianReport(ev: EvaluationResult): string {
  const lines: string[] = [];
  lines.push(`# Evidence Report — Project Meridian: FP&A Forecast Review`);
  lines.push(`Recommendation: **${ev.executive_recommendation}** (confidence: ${ev.confidence})`);
  lines.push(ev.overall_summary);
  lines.push('');
  lines.push('## VP Memo');
  lines.push(ev.final_memo || '(empty)');
  lines.push('');
  lines.push('## Planted Concerns');
  for (const p of ev.planted_errors) {
    lines.push(`- ${p.title}: **${p.status.toUpperCase()}**`);
    p.evidence.forEach((e) => lines.push(`  evidence: ${e}`));
  }
  lines.push('');
  lines.push(`## Ambiguity Handling (${AMBIGUITY_POINT.title})`);
  lines.push(`${ev.ambiguity.score} — ${ev.ambiguity.rationale}`);
  ev.ambiguity.evidence.forEach((e) => lines.push(`  evidence: ${e}`));
  lines.push('');
  lines.push('## Hard Skills');
  for (const s of ev.hard_skills) {
    lines.push(`- ${s.dimension}: ${s.score} — ${s.rationale}`);
    (s.evidence || []).slice(0, 2).forEach((e) => lines.push(`  evidence: ${e}`));
  }
  lines.push('');
  lines.push('## Soft Skills');
  for (const s of ev.soft_skills) {
    lines.push(`- ${s.dimension}: ${s.score} — ${s.rationale}`);
    (s.evidence || []).slice(0, 2).forEach((e) => lines.push(`  evidence: ${e}`));
  }
  lines.push('');
  lines.push('## CFO Exchange (Alex Kim)');
  for (const m of ev.daniel_exchange) {
    lines.push(`[${m.name}] ${m.body}`);
  }
  lines.push('');
  lines.push('## AI Usage');
  lines.push(
    `trap_triggered=${ev.ai_usage_summary.trap_triggered} trap_caught=${ev.ai_usage_summary.trap_caught}`
  );
  lines.push('');
  lines.push('## Benchmark');
  lines.push(`${ev.benchmark.status}: ${ev.benchmark.comparison_text}`);
  lines.push('');
  lines.push('## Interview Questions');
  ev.interview_questions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
  return lines.join('\n');
}
