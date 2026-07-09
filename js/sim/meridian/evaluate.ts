/**
 * Part G — Analysis engine. Evidence-only. Node-runnable.
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
  valuation?: { growth_rate: number; exit_multiple: number; implied_ev: number };
  event_log?: { type: string; t?: number; label?: string; payload?: unknown }[];
  chatMessages?: ChatMessage[];
  ai_usage_log?: AIUsageEvent[];
  d1_reply_text?: string | null;
  d1_branch?: string | null;
  tabSeconds?: Record<string, number>;
  _elapsedSec?: number;
  plantedErrorFlags?: Record<string, boolean>;
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

function detectError1(session: EvalSession, params: MeridianSeedParams): { status: 'caught' | 'missed'; evidence: string[] } {
  const text = corpus(session);
  const evidence: string[] = [];
  const flaggedRisk = (session.risks || []).find((r) =>
    /multiple|valuation|comp|precedent|overpay|price/.test(`${r.category} ${r.text}`.toLowerCase())
  );
  if (flaggedRisk) evidence.push(`Risk: [${flaggedRisk.category}] ${flaggedRisk.text}`);
  const haircut = (session.assumptions || []).find((a) =>
    /multiple|haircut|comp|precedent|10\.|9\./i.test(a.text)
  );
  if (haircut) evidence.push(`Assumption: ${haircut.text}`);
  if (/comp|precedent/.test(text) && /multiple|haircut|rich|above|inflat/.test(text)) {
    evidence.push('Memo/text references comps gap on multiple');
  }
  if (session.plantedErrorFlags?.err_exit_multiple_vs_comps) {
    evidence.push('Session flag err_exit_multiple_vs_comps');
  }
  // Must show awareness of gap vs params
  const mentionsGap =
    evidence.length > 0 &&
    (flaggedRisk || haircut || (/comp|precedent/.test(text) && /multiple/.test(text)));
  if (mentionsGap) return { status: 'caught', evidence };
  return {
    status: 'missed',
    evidence: [
      `No risk/assumption/memo evidence of reconciling ${params.exit_multiple}x vs comps avg ${params.comps_avg_multiple}x`,
    ],
  };
}

function detectError2(session: EvalSession): { status: 'caught' | 'missed'; evidence: string[] } {
  const opened = (session.openedDocs || []).includes('retention_csv');
  if (!opened) {
    return {
      status: 'missed',
      evidence: [
        'Retention_Cohort.csv was never opened — cannot credit contradiction catch (Part D rule)',
      ],
    };
  }
  const text = corpus(session);
  const risk = (session.risks || []).find((r) =>
    /retention|customer|concentration|contradict|management|90%|top-?10|declin/.test(
      `${r.category} ${r.text}`.toLowerCase()
    )
  );
  const evidence: string[] = ['Opened Retention_Cohort.csv'];
  if (risk) evidence.push(`Risk: [${risk.category}] ${risk.text}`);
  if (/contradict|management.*(claim|deck|update)|90%|declin|concentration/.test(text)) {
    evidence.push('Memo/text flags retention contradiction or concentration');
  }
  if (risk || /contradict|declin|concentration/.test(text)) {
    return { status: 'caught', evidence };
  }
  return {
    status: 'missed',
    evidence: [
      'Opened Retention_Cohort.csv but did not flag the contradiction with Management_Update in risks or memo',
    ],
  };
}

function detectError3(session: EvalSession): { status: 'caught' | 'missed'; evidence: string[] } {
  const text = corpus(session);
  const hit = (session.assumptions || [])
    .concat([])
    .map((a) => a.text)
    .concat((session.risks || []).map((r) => r.text))
    .concat([session.finalMemo || ''])
    .find((t) => /synergy|double[- ]?count|overlap|debt paydown|duplicat/.test((t || '').toLowerCase()));
  if (hit) {
    return { status: 'caught', evidence: [`Identified overlap/double-count: "${String(hit).slice(0, 160)}"`] };
  }
  if (session.plantedErrorFlags?.err_synergy_double_count) {
    return { status: 'caught', evidence: ['Session flag err_synergy_double_count'] };
  }
  return {
    status: 'missed',
    evidence: ['No assumption/memo language identifying synergy / CoC debt paydown double-count'],
  };
}

function scoreAmbiguity(session: EvalSession): DimensionScore {
  const diligence = (session.recommendation?.diligence || '').toLowerCase();
  const memo = (session.finalMemo || '').toLowerCase();
  const text = `${diligence}\n${memo}`;
  const requestsGap =
    /available on request|request.*(cohort|retention)|missing.*(cohort|data)|incomplete.*(cohort|retention)|diligence.*(cohort|retention)/.test(
      text
    );
  const inventsFact =
    /\d+\s*%\s*(net )?retention/.test(text) &&
    !/incomplete|missing|request|cannot|unknown|gap/.test(text) &&
    !(session.openedDocs || []).includes('retention_csv');

  if (requestsGap) {
    return {
      dimension: 'Ambiguity handling',
      score: 'good',
      label: 'Good pattern',
      rationale:
        'Candidate noted incomplete cohort data and/or listed requesting it under next diligence steps rather than inventing a precise figure.',
      evidence: [diligence.slice(0, 200) || memo.slice(0, 200)],
      method: 'deterministic',
    };
  }
  if (inventsFact || (/retention is \d+|retention of \d+/.test(text) && !/gap|incomplete|request/.test(text))) {
    return {
      dimension: 'Ambiguity handling',
      score: 'poor',
      label: 'Poor pattern',
      rationale:
        'Candidate stated a specific retention conclusion despite missing cohort file / without flagging the data gap.',
      evidence: [text.slice(0, 220)],
      method: 'deterministic',
    };
  }
  if (!(session.recommendation?.diligence || '').trim()) {
    return {
      dimension: 'Ambiguity handling',
      score: 'insufficient_data',
      rationale: 'No diligence-steps text to classify ambiguity handling.',
      evidence: [],
      method: 'deterministic',
    };
  }
  return {
    dimension: 'Ambiguity handling',
    score: 'insufficient_data',
    rationale: 'Diligence text present but neither clearly requests missing cohort data nor invents a retention fact.',
    evidence: [diligence.slice(0, 200)],
    method: 'deterministic',
  };
}

function scoreAssumptions(session: EvalSession): DimensionScore {
  const list = session.assumptions || [];
  if (!list.length) {
    return {
      dimension: 'Assumption quality',
      score: 'insufficient_data',
      rationale: 'No assumptions logged.',
      evidence: [],
      method: 'deterministic',
    };
  }
  const specific = list.filter((a) => /\d|%|x\b|multiple|comp|growth|margin/i.test(a.text));
  const score = Math.round((specific.length / list.length) * 70 + Math.min(30, list.length * 10));
  return {
    dimension: 'Assumption quality',
    score: Math.min(100, score),
    rationale: `${specific.length}/${list.length} assumptions reference numbers or concrete model levers.`,
    evidence: list.map((a) => a.text).slice(0, 5),
    method: 'deterministic',
  };
}

function scoreAnalytical(session: EvalSession, params: MeridianSeedParams): DimensionScore {
  const v = session.valuation;
  if (!v) {
    return {
      dimension: 'Analytical accuracy',
      score: 'insufficient_data',
      rationale: 'No interactive valuation adjustment recorded.',
      evidence: [],
      method: 'deterministic',
    };
  }
  const evidence = [
    `Submitted valuation inputs: growth ${v.growth_rate}%, exit ${v.exit_multiple}x, implied EV $${v.implied_ev}M`,
    `Seed base exit ${params.exit_multiple}x; comps avg ${params.comps_avg_multiple}x`,
  ];
  const haircutClaim = corpus(session).includes('haircut') || /haircut|toward comp/.test(corpus(session));
  let score = 55;
  if (v.exit_multiple < params.exit_multiple) {
    score += 20;
    evidence.push('Exit multiple input below management framing');
  }
  if (haircutClaim && v.exit_multiple >= params.exit_multiple) {
    score -= 25;
    evidence.push('Narrative claims haircut but valuation still at/above inflated multiple — internal inconsistency');
  }
  if (Math.abs(v.growth_rate - params.forward_growth) > 0.05) {
    score += 10;
    evidence.push('Growth input differs from plan — candidate stress-tested');
  }
  return {
    dimension: 'Analytical accuracy',
    score: Math.max(0, Math.min(100, score)),
    rationale: 'Consistency between logged valuation inputs and narrative claims.',
    evidence,
    method: 'deterministic',
  };
}

function scoreCommunication(session: EvalSession): DimensionScore {
  const r1 = (session.recommendation?.reason1 || '').trim();
  const r2 = (session.recommendation?.reason2 || '').trim();
  const r3 = (session.recommendation?.reason3 || '').trim();
  const memo = (session.finalMemo || [r1, r2, r3].join(' ')).trim();
  if (!memo || memo.length < 40) {
    return {
      dimension: 'Communication clarity',
      score: 'insufficient_data',
      rationale: 'Insufficient memo/reasons text for communication scoring.',
      evidence: [],
      method: 'heuristic_fallback',
    };
  }
  // Heuristic fallback per G.4 (no LLM key assumed in MVP)
  let score = 40;
  const evidence: string[] = [];
  if (session.recommendation?.category) {
    score += 15;
    evidence.push(`Recommendation stated up front: ${session.recommendation.category}`);
  }
  const reasons = [r1, r2, r3].filter(Boolean);
  if (reasons.length === 3) {
    score += 20;
    evidence.push(`Three distinct reasons: "${r1.slice(0, 60)}"; "${r2.slice(0, 60)}"; "${r3.slice(0, 60)}"`);
  }
  const vague = /synergies will be realized|strong franchise|compelling opportunity|unlock value/i;
  if (vague.test(memo)) {
    score -= 15;
    evidence.push('Contains vague corporate language');
  } else {
    score += 10;
  }
  if (/\d|%|\$|x\b/.test(memo)) {
    score += 10;
    evidence.push('Uses specific numbers');
  }
  evidence.push(`Rubric file: ${(communicationRubric as { id?: string }).id || 'communication.v1'}`);
  return {
    dimension: 'Communication clarity',
    score: Math.max(0, Math.min(100, score)),
    rationale: 'Heuristic rubric (LLM unavailable): clarity of recommendation, distinct reasons, specificity.',
    evidence,
    method: 'heuristic_fallback',
  };
}

function scoreBusinessJudgment(
  session: EvalSession,
  errors: { status: string }[]
): DimensionScore {
  const cat = session.recommendation?.category || '';
  const caught = errors.filter((e) => e.status === 'caught').length;
  const evidence: string[] = [`Recommendation: ${cat || '(none)'}`, `Planted errors caught: ${caught}/3`];
  let score = 40;
  if (cat === 'Proceed' && caught === 0) {
    score = 15;
    evidence.push('Proceed with no planted errors caught — weak judgment');
  } else if ((cat === 'Conditional Proceed' || cat === 'Hold' || cat === 'Pass') && caught >= 2) {
    score = 85;
    evidence.push('Recommendation severity aligns with errors caught');
  } else if (cat === 'Conditional Proceed' && caught >= 1) {
    score = 75;
    evidence.push('Conditional Proceed tied to at least one real issue');
  } else if (cat) {
    score = 45 + caught * 12;
  } else {
    return {
      dimension: 'Business judgment',
      score: 'insufficient_data',
      rationale: 'No recommendation category.',
      evidence: [],
      method: 'deterministic',
    };
  }
  const reasons = `${session.recommendation?.reason1} ${session.recommendation?.reason2}`.toLowerCase();
  if (/retention|multiple|comp|concentration|synergy/.test(reasons)) {
    score += 5;
    evidence.push('Reasons reference deal-specific issues');
  }
  return {
    dimension: 'Business judgment',
    score: Math.min(100, score),
    rationale: 'Recommendation category vs severity of errors caught/missed, plus specificity of reasons.',
    evidence,
    method: 'deterministic',
  };
}

function scoreRiskDetection(session: EvalSession, errors: { id: string; status: string }[]): DimensionScore {
  const risks = session.risks || [];
  if (!risks.length) {
    return {
      dimension: 'Risk detection and prioritization',
      score: 'insufficient_data',
      rationale: 'No risks logged.',
      evidence: [],
      method: 'deterministic',
    };
  }
  const specific = risks.filter((r) =>
    /retention|concentration|multiple|comp|synergy|double|cohort|declin/i.test(`${r.category} ${r.text}`)
  );
  const evidence = risks.slice(0, 4).map((r) => `[${r.category}] ${r.text}`);
  const caught = errors.filter((e) => e.status === 'caught').length;
  const score = Math.min(100, specific.length * 25 + caught * 15);
  return {
    dimension: 'Risk detection and prioritization',
    score,
    rationale: `${specific.length} evidence-linked risks; ${caught}/3 planted errors reflected.`,
    evidence,
    method: 'deterministic',
  };
}

function scoreAdaptability(session: EvalSession): DimensionScore {
  const replies = (session.chatMessages || []).filter((m) => m.sender === 'candidate');
  if (!replies.length && !session.d1_reply_text) {
    return {
      dimension: 'Adaptability / responsiveness',
      score: 'insufficient_data',
      rationale: 'No candidate chat engagement recorded.',
      evidence: [],
      method: 'deterministic',
    };
  }
  const evidence: string[] = [];
  if (session.d1_reply_text) evidence.push(`Daniel reply: "${session.d1_reply_text}"`);
  if (session.d1_branch) evidence.push(`Daniel branch: ${session.d1_branch}`);
  const memo = corpus(session);
  let score = 40;
  if (session.d1_branch === 'customer' && /concentration|retention|customer/.test(memo)) {
    score += 35;
    evidence.push('Final submission reflects customer concentration raised in chat');
  } else if (session.d1_reply_text) {
    score += 15;
    evidence.push('Replied to Daniel but memo linkage weak');
  }
  if (replies.length >= 2) score += 10;
  return {
    dimension: 'Adaptability / responsiveness',
    score: Math.min(100, score),
    rationale: 'Engagement with stakeholder prompts and whether final work reflects them.',
    evidence,
    method: 'deterministic',
  };
}

function scorePrioritization(session: EvalSession): DimensionScore {
  const tabs = session.tabSeconds || {};
  const total = Object.values(tabs).reduce((a, b) => a + b, 0) || session._elapsedSec || 0;
  if (!total) {
    return {
      dimension: 'Prioritization and time management',
      score: 'insufficient_data',
      rationale: 'No tab timing data.',
      evidence: [],
      method: 'deterministic',
    };
  }
  const dataRoom = (tabs.data_room || tabs.DataRoom || 0) + (tabs.brief || 0);
  const financials = tabs.financials || tabs.Financials || 0;
  const evidence = [
    `Tab seconds: ${JSON.stringify(tabs)}`,
    `Docs opened: ${(session.openedDocs || []).length}`,
  ];
  let score = 50;
  if (financials < 60 && (session.openedDocs || []).length < 2) {
    score = 25;
    evidence.push('Little time on Financials/Data Room');
  }
  if ((session.openedDocs || []).includes('retention_csv') && (session.openedDocs || []).includes('comps_precedents')) {
    score += 25;
    evidence.push('Opened both critical docs (retention + comps)');
  }
  if (session.d1_fired && session.d1_reply_text) {
    const d1msg = (session.chatMessages || []).find((m) => m.triggerId === 'D1');
    const reply = (session.chatMessages || []).find((m) => m.triggerId === 'D1_reply');
    if (d1msg && reply && reply.elapsedSec - d1msg.elapsedSec < 180) {
      score += 10;
      evidence.push('Responded to Daniel within 3 minutes');
    }
  }
  return {
    dimension: 'Prioritization and time management',
    score: Math.min(100, score),
    rationale: 'Time allocation vs critical materials and responsiveness to MD prompt.',
    evidence,
    method: 'deterministic',
  };
}

function scoreAiJudgment(session: EvalSession): DimensionScore {
  const log = session.ai_usage_log || [];
  if (!log.length) {
    return {
      dimension: 'AI judgment',
      score: 60,
      label: 'Not heavily used',
      rationale: 'No AI usage logged — neither trap nor blind trust observed.',
      evidence: ['ai_usage_log empty'],
      method: 'deterministic',
    };
  }
  const trap = log.find((e) => e.trap_triggered);
  const evidence = log.map(
    (e) =>
      `${e.timestamp}: trap=${e.trap_triggered} caught=${e.trap_caught} action=${e.candidate_action_after} | ${e.prompt_text.slice(0, 80)}`
  );
  if (trap && trap.trap_caught === false) {
    return {
      dimension: 'AI judgment',
      score: 25,
      rationale: 'Triggered exit-multiple trap and did not catch comps gap afterward.',
      evidence,
      method: 'deterministic',
    };
  }
  if (trap && trap.trap_caught === true) {
    return {
      dimension: 'AI judgment',
      score: 90,
      rationale: 'Triggered trap but verified against comps / caught the gap.',
      evidence,
      method: 'deterministic',
    };
  }
  return {
    dimension: 'AI judgment',
    score: 70,
    rationale: 'Used AI without hitting the uncritical exit-multiple trap path.',
    evidence,
    method: 'deterministic',
  };
}

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

export function evaluateMeridianSession(session: EvalSession): EvaluationResult {
  const params = session.params;
  const e1 = detectError1(session, params);
  const e2 = detectError2(session);
  const e3 = detectError3(session);
  const planted = [
    { id: PLANTED_ERRORS[0].id, title: PLANTED_ERRORS[0].title, status: e1.status, evidence: e1.evidence },
    { id: PLANTED_ERRORS[1].id, title: PLANTED_ERRORS[1].title, status: e2.status, evidence: e2.evidence },
    { id: PLANTED_ERRORS[2].id, title: PLANTED_ERRORS[2].title, status: e3.status, evidence: e3.evidence },
  ] as EvaluationResult['planted_errors'];

  const ambiguity = requireEvidence(scoreAmbiguity(session));
  const hard = [
    requireEvidence(scoreAnalytical(session, params)),
    requireEvidence(scoreAssumptions(session)),
    {
      dimension: 'Error detection — Exit multiple vs comps',
      score: e1.status,
      rationale: e1.status === 'caught' ? 'Caught with evidence.' : 'Missed.',
      evidence: e1.evidence,
      method: 'deterministic' as const,
    },
    {
      dimension: 'Error detection — Retention contradiction',
      score: e2.status,
      rationale: e2.status === 'caught' ? 'Caught with evidence.' : 'Missed.',
      evidence: e2.evidence,
      method: 'deterministic' as const,
    },
    {
      dimension: 'Error detection — Synergy double-count',
      score: e3.status,
      rationale: e3.status === 'caught' ? 'Caught with evidence.' : 'Missed.',
      evidence: e3.evidence,
      method: 'deterministic' as const,
    },
  ];

  const soft = [
    ambiguity,
    requireEvidence(scoreBusinessJudgment(session, planted)),
    requireEvidence(scoreRiskDetection(session, planted)),
    requireEvidence(scoreCommunication(session)),
    requireEvidence(scoreAdaptability(session)),
    requireEvidence(scorePrioritization(session)),
    requireEvidence(scoreAiJudgment(session)),
  ];

  const caughtN = planted.filter((p) => p.status === 'caught').length;
  let executive_recommendation: EvaluationResult['executive_recommendation'] = 'Hold';
  if (caughtN >= 2 && ambiguity.score === 'good') executive_recommendation = 'Advance';
  if (caughtN === 0 && ambiguity.score === 'poor') executive_recommendation = 'Reject';

  const numericSoft = soft.filter((s) => typeof s.score === 'number') as (DimensionScore & { score: number })[];
  const avg =
    numericSoft.length > 0
      ? numericSoft.reduce((a, s) => a + s.score, 0) / numericSoft.length
      : 50;
  const confidence: EvaluationResult['confidence'] =
    (session.event_log || []).length >= 12 ? 'High' : (session.event_log || []).length >= 6 ? 'Medium' : 'Low';

  const trapEv = (session.ai_usage_log || []).find((e) => e.trap_triggered);
  const daniel = (session.chatMessages || []).filter(
    (m) => m.sender === 'daniel' || m.triggerId === 'D1_reply' || (m.sender === 'candidate' && m.triggerId === 'D1_reply')
  );

  const timeline = (session.event_log || [])
    .slice()
    .sort((a, b) => (a.t || 0) - (b.t || 0))
    .map((e) => ({ t: e.t || 0, label: e.label || e.type, type: e.type }));

  const overall_summary = `Caught ${caughtN}/3 planted errors. Ambiguity: ${ambiguity.label || ambiguity.score}. Soft-skill avg (numeric dims): ${Math.round(avg)}. ${AMBIGUITY_POINT.title} classified from diligence/memo evidence.`;

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
    daniel_exchange: daniel,
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
  };
}

export function formatMeridianReport(ev: EvaluationResult): string {
  const lines: string[] = [];
  lines.push(`# Evidence report — Project Meridian`);
  lines.push(`Recommendation: ${ev.executive_recommendation} (${ev.confidence})`);
  lines.push(ev.overall_summary);
  lines.push('');
  lines.push('## Final memo');
  lines.push(ev.final_memo || '(empty)');
  lines.push('');
  lines.push('## Planted errors');
  for (const p of ev.planted_errors) {
    lines.push(`- ${p.title}: ${p.status.toUpperCase()}`);
    p.evidence.forEach((e) => lines.push(`  evidence: ${e}`));
  }
  lines.push('');
  lines.push('## Ambiguity');
  lines.push(`${ev.ambiguity.score} — ${ev.ambiguity.rationale}`);
  ev.ambiguity.evidence.forEach((e) => lines.push(`  evidence: ${e}`));
  lines.push('');
  lines.push('## Soft skills');
  for (const s of ev.soft_skills) {
    lines.push(`- ${s.dimension}: ${s.score} — ${s.rationale}`);
    (s.evidence || []).forEach((e) => lines.push(`  evidence: ${e}`));
  }
  lines.push('');
  lines.push('## Daniel Chen exchange');
  for (const m of ev.daniel_exchange) {
    lines.push(`[${m.name}] ${m.body}`);
  }
  lines.push('');
  lines.push('## AI usage');
  lines.push(
    `trap_triggered=${ev.ai_usage_summary.trap_triggered} trap_caught=${ev.ai_usage_summary.trap_caught}`
  );
  lines.push('');
  lines.push('## Benchmark');
  lines.push(`${ev.benchmark.status}: ${ev.benchmark.comparison_text}`);
  return lines.join('\n');
}
