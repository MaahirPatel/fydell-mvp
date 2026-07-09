/**
 * Deterministic session scoring engine (MVP — no LLM).
 * Evidence-only: never invent scores without cited events/snippets.
 * @module js/sim/evaluate
 */

import { evaluateCommitments } from './commitments.js';
import { listEvents } from './events.js';

/** @typedef {import('./types.js').CandidateSession} CandidateSession */
/** @typedef {import('./types.js').PlantedError} PlantedError */
/** @typedef {import('./types.js').AmbiguityPoint} AmbiguityPoint */
/** @typedef {import('./types.js').Commitment} Commitment */

const SCORE_LABELS = {
  strong: 'Strong evidence',
  observed: 'Observed',
  limited: 'Limited evidence',
  none: 'Not observed',
  insufficient_data: 'Not observed',
};

const FINANCE_KEYWORDS = [
  'valuation', 'multiple', 'ebitda', 'revenue', 'margin', 'npv', 'irr',
  'wacc', 'dcf', 'bridge', 'synergy', 'retention', 'churn', 'growth',
  'downside', 'upside', 'precedent', 'offer', 'enterprise', 'ltm',
];

const CITATION_RE = /\b(exhibit|csv|brief|memo|model|table|fig\.?|source|per the|according to|data room|retention_csv|market_memo|exec_brief)\b/i;

/**
 * @param {*} v
 * @returns {string}
 */
function asText(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/**
 * @param {string} text
 * @param {string[]} keywords
 * @returns {string[]}
 */
function matchedKeywords(text, keywords) {
  const lower = String(text || '').toLowerCase();
  if (!lower.trim() || !Array.isArray(keywords)) return [];
  return keywords.filter((k) => k && lower.includes(String(k).toLowerCase()));
}

/**
 * @param {CandidateSession} session
 * @returns {string}
 */
function corpusText(session) {
  const parts = [];
  parts.push(session.finalMemo || '');
  for (const a of session.assumptions || []) parts.push(asText(a));
  for (const r of session.risks || []) parts.push(asText(r));
  for (const m of session.chatMessages || []) {
    parts.push(asText(m.content || m.body || m.text || m.message || m));
  }
  for (const e of session.event_log || []) {
    parts.push(asText(e.payload));
  }
  return parts.join('\n');
}

/**
 * @param {CandidateSession} session
 * @returns {number}
 */
function resourceCount(session) {
  const opened = Array.isArray(session.openedResources) ? session.openedResources : [];
  if (opened.length) return new Set(opened.map(String)).size;
  const fromEvents = new Set();
  for (const e of listEvents(session, ['resource_opened', 'document_opened', 'retention_csv_opened'])) {
    const id = (e.payload && (e.payload.resourceId || e.payload.id || e.payload.label || e.payload.title)) || e.id;
    fromEvents.add(String(id));
  }
  return fromEvents.size;
}

/**
 * @param {CandidateSession} session
 * @returns {boolean}
 */
function modelViewed(session) {
  if (session._modelViewed) return true;
  if (session.fin) return true;
  return listEvents(session, [
    'model_viewed',
    'financial_model_viewed',
    'model_opened',
    'scenario_changed',
    'driver_changed',
  ]).length > 0;
}

/**
 * @param {CandidateSession} session
 * @returns {boolean}
 */
function curveballViewed(session) {
  if (session._curveballSeen || session._curveballViewed) return true;
  return listEvents(session, [
    'manager_update_viewed',
    'curveball_viewed',
    'stakeholder_curveball',
  ]).length > 0;
}

/**
 * @param {string} haystack
 * @param {string[]} needles
 * @returns {boolean}
 */
function anyKeyword(haystack, needles) {
  return matchedKeywords(haystack, needles || []).length > 0;
}

/**
 * @param {CandidateSession} session
 * @param {PlantedError} err
 * @returns {{ caught: boolean, evidence: string[] }}
 */
function detectPlantedError(session, err) {
  const criteria = (err && err.detection_criteria) || {};
  const evidence = [];
  const risksText = (session.risks || []).map(asText).join('\n');
  const assumptionsText = (session.assumptions || []).map(asText).join('\n');
  const memo = String(session.finalMemo || '');
  const opened = (session.openedResources || []).map(String);
  const events = listEvents(session);
  const eventBlob = events.map((e) => `${e.type} ${asText(e.payload)}`).join('\n');

  let hits = 0;

  if (Array.isArray(criteria.resource_ids) && criteria.resource_ids.length) {
    for (const rid of criteria.resource_ids) {
      const openedHit = opened.some((r) => r === rid || r.includes(rid));
      const eventHit = events.some((e) => {
        const p = e.payload || {};
        const id = String(p.resourceId || p.id || p.label || p.title || '');
        return id === rid || id.includes(rid) || asText(p).includes(rid);
      });
      if (openedHit || eventHit) {
        hits += 1;
        evidence.push(`resource:${rid}`);
      }
    }
  }

  if (Array.isArray(criteria.risk_keywords) && anyKeyword(risksText, criteria.risk_keywords)) {
    hits += 1;
    const mk = matchedKeywords(risksText, criteria.risk_keywords).slice(0, 3);
    evidence.push(`risks mention: ${mk.join(', ')}`);
    const riskEv = (session.risks || []).find((r) => anyKeyword(asText(r), criteria.risk_keywords));
    if (riskEv && riskEv.id) evidence.push(`risk:${riskEv.id}`);
  }

  if (Array.isArray(criteria.memo_keywords) && anyKeyword(memo, criteria.memo_keywords)) {
    hits += 1;
    const mk = matchedKeywords(memo, criteria.memo_keywords).slice(0, 3);
    evidence.push(`memo mentions: ${mk.join(', ')}`);
  }

  if (Array.isArray(criteria.assumption_keywords) && anyKeyword(assumptionsText, criteria.assumption_keywords)) {
    hits += 1;
    const mk = matchedKeywords(assumptionsText, criteria.assumption_keywords).slice(0, 3);
    evidence.push(`assumptions mention: ${mk.join(', ')}`);
  }

  if (Array.isArray(criteria.event_keywords) && anyKeyword(eventBlob, criteria.event_keywords)) {
    hits += 1;
    evidence.push(`event_log keywords: ${matchedKeywords(eventBlob, criteria.event_keywords).slice(0, 3).join(', ')}`);
  }

  // Explicit session flag from UI / prior detection
  if (session.plantedErrorFlags && session.plantedErrorFlags[err.id]) {
    hits += 1;
    evidence.push(`plantedErrorFlags.${err.id}`);
  }

  // String / RegExp criteria fallback
  if (typeof criteria === 'string' || criteria instanceof RegExp) {
    const blob = corpusText(session);
    const re = criteria instanceof RegExp ? criteria : new RegExp(criteria, 'i');
    if (re.test(blob)) {
      hits += 1;
      evidence.push('detection_criteria regex matched corpus');
    }
  }

  // Require at least one substantive signal; resource-only is not enough for retention-style errors
  // that also list risk/memo keywords — need risk OR memo OR assumption hit when those keys exist.
  const needsContent =
    (criteria.risk_keywords && criteria.risk_keywords.length) ||
    (criteria.memo_keywords && criteria.memo_keywords.length) ||
    (criteria.assumption_keywords && criteria.assumption_keywords.length);

  let caught = hits > 0;
  if (needsContent) {
    const contentHit =
      (criteria.risk_keywords && anyKeyword(risksText, criteria.risk_keywords)) ||
      (criteria.memo_keywords && anyKeyword(memo, criteria.memo_keywords)) ||
      (criteria.assumption_keywords && anyKeyword(assumptionsText, criteria.assumption_keywords)) ||
      (session.plantedErrorFlags && session.plantedErrorFlags[err.id]);
    caught = !!contentHit;
    if (!caught) {
      // keep resource evidence but mark not caught
    }
  }

  return { caught, evidence: caught ? evidence : evidence.slice(0, 2) };
}

/**
 * @param {CandidateSession} session
 * @param {AmbiguityPoint} point
 * @returns {{ ambiguity_point_id: string, response_quality: string, evidence: string[] }}
 */
function scoreAmbiguity(session, point) {
  const good = point.good_keywords || [];
  const poor = point.poor_keywords || [];
  const chat = (session.chatMessages || [])
    .map((m) => asText(m.content || m.body || m.text || m.message || m))
    .join('\n');
  const memo = String(session.finalMemo || '');
  const assumptions = (session.assumptions || []).map(asText).join('\n');
  const blob = `${chat}\n${memo}\n${assumptions}`;

  const goodHits = matchedKeywords(blob, good);
  const poorHits = matchedKeywords(blob, poor);
  const evidence = [];

  if (goodHits.length) evidence.push(`good_keywords: ${goodHits.slice(0, 4).join(', ')}`);
  if (poorHits.length) evidence.push(`poor_keywords: ${poorHits.slice(0, 4).join(', ')}`);

  // Quote a short snippet if available
  const snippetSource = memo || chat;
  if (snippetSource && (goodHits.length || poorHits.length)) {
    const lower = snippetSource.toLowerCase();
    const key = (goodHits[0] || poorHits[0] || '').toLowerCase();
    const idx = lower.indexOf(key);
    if (idx >= 0) {
      evidence.push(`snippet: "${snippetSource.slice(Math.max(0, idx - 20), idx + 60).trim()}"`);
    }
  }

  if (!goodHits.length && !poorHits.length) {
    return {
      ambiguity_point_id: point.id,
      response_quality: 'insufficient_data',
      evidence: ['No matching good/poor keywords in chat, memo, or assumptions.'],
    };
  }

  if (goodHits.length && !poorHits.length) {
    return { ambiguity_point_id: point.id, response_quality: 'good', evidence };
  }
  if (poorHits.length && !goodHits.length) {
    return { ambiguity_point_id: point.id, response_quality: 'poor', evidence };
  }
  // Mixed: prefer good if more good hits
  if (goodHits.length >= poorHits.length) {
    return { ambiguity_point_id: point.id, response_quality: 'good', evidence };
  }
  return { ambiguity_point_id: point.id, response_quality: 'poor', evidence };
}

/**
 * @param {'strong'|'observed'|'limited'|'none'|'insufficient_data'} score
 * @param {string} dimension
 * @param {string} rationale
 * @param {string[]} evidence
 * @param {string} [confidence]
 * @param {string[]} [concerns]
 * @param {string[]} [interviewFollowUps]
 */
function dimResult(score, dimension, rationale, evidence, confidence, concerns, interviewFollowUps) {
  const normalized = score === 'insufficient_data' ? 'none' : score;
  const hasEvidence = Array.isArray(evidence) && evidence.length > 0;
  const finalScore = hasEvidence ? normalized : 'none';
  const finalLabel = SCORE_LABELS[finalScore] || SCORE_LABELS.none;
  return {
    dimension,
    score: finalScore,
    label: finalLabel,
    confidence: confidence || (hasEvidence ? 'Medium' : 'Low'),
    evidence: hasEvidence ? evidence.slice() : [],
    rationale: hasEvidence
      ? rationale
      : (rationale || 'Not observed — no supporting events, artifacts, or quoted snippets.'),
    concerns: Array.isArray(concerns) ? concerns.slice() : [],
    interviewFollowUps: Array.isArray(interviewFollowUps) ? interviewFollowUps.slice() : [],
  };
}

/**
 * Map internal score to observed/strong for recommendation checks.
 * @param {string} score
 * @returns {boolean}
 */
function isObservedOrStrong(score) {
  return score === 'observed' || score === 'strong';
}

/**
 * @param {CandidateSession} session
 * @param {Commitment[]} commitments
 */
function scoreDimensions(session, commitments, plantedCaught, plantedTotal) {
  const events = listEvents(session);
  const eventIds = (types) =>
    events.filter((e) => types.includes(e.type)).map((e) => e.id);
  const memo = String(session.finalMemo || '');
  const memoLen = memo.trim().length;
  const resources = resourceCount(session);
  const assumptions = session.assumptions || [];
  const risks = session.risks || [];
  const aiLog = session.ai_usage_log || [];

  /** @type {ReturnType<typeof dimResult>[]} */
  const dims = [];

  // --- Analytical accuracy / Financial reasoning ---
  {
    const evidence = [];
    if (modelViewed(session)) {
      evidence.push(...eventIds(['model_viewed', 'financial_model_viewed', 'model_opened']).slice(0, 2));
      if (!evidence.length) evidence.push('model_viewed:true');
    }
    if (assumptions.length) {
      evidence.push(`assumptions:${assumptions.length}`);
      const a0 = assumptions[0];
      if (a0 && a0.id) evidence.push(`assumption:${a0.id}`);
      else evidence.push(`assumption_snippet: ${asText(a0).slice(0, 80)}`);
    }
    const finHits = matchedKeywords(memo, FINANCE_KEYWORDS);
    if (finHits.length) evidence.push(`memo finance keywords: ${finHits.slice(0, 5).join(', ')}`);
    evidence.push(...eventIds(['assumption_added', 'assumption_viewed']).slice(0, 2));

    let score = 'none';
    let rationale = 'No model view, assumptions, or finance language in the memo.';
    if (evidence.length) {
      if (modelViewed(session) && assumptions.length >= 1 && finHits.length >= 2) {
        score = assumptions.length >= 2 && finHits.length >= 4 ? 'strong' : 'observed';
        rationale = `Model inspected, ${assumptions.length} assumption(s) logged, and memo uses financial language (${finHits.slice(0, 4).join(', ')}).`;
      } else if (modelViewed(session) || assumptions.length || finHits.length) {
        score = 'limited';
        rationale = 'Partial financial reasoning signals present, but not a full model + assumption + memo chain.';
      }
    }
    dims.push(dimResult(score, 'Analytical accuracy / Financial reasoning', rationale, evidence, undefined, [], [
      'Walk me through how you challenged management’s valuation bridge.',
    ]));
  }

  // --- Modeling ---
  {
    const evidence = [];
    const scenarioEvents = listEvents(session, 'scenario_changed');
    for (const e of scenarioEvents) evidence.push(e.id);
    const downside =
      session.selectedScenario === 'downside' ||
      (session.fin && session.fin.scenario === 'downside') ||
      scenarioEvents.some((e) => /downside/i.test(asText(e.payload)));
    if (downside) evidence.push('downside_case_used');
    if (listEvents(session, 'driver_changed').length) {
      evidence.push(...eventIds(['driver_changed']).slice(0, 2));
    }

    let score = 'none';
    let rationale = 'No scenario changes or downside case usage observed.';
    if (evidence.length) {
      if (downside && scenarioEvents.length) {
        score = 'strong';
        rationale = 'Candidate changed scenarios and used a downside case.';
      } else if (downside || scenarioEvents.length) {
        score = 'observed';
        rationale = downside
          ? 'Downside case was used.'
          : 'Scenario was changed in the model.';
      } else {
        score = 'limited';
        rationale = 'Some modeling interaction without clear downside stress.';
      }
    }
    dims.push(dimResult(score, 'Modeling', rationale, evidence, undefined, [], [
      'What broke first when you stressed the downside case?',
    ]));
  }

  // --- Risk detection ---
  {
    const evidence = [];
    if (risks.length) {
      evidence.push(`risks:${risks.length}`);
      for (const r of risks.slice(0, 3)) {
        if (r && r.id) evidence.push(`risk:${r.id}`);
        else evidence.push(`risk_snippet: ${asText(r).slice(0, 80)}`);
      }
    }
    evidence.push(...eventIds(['risk_added', 'risk_updated']).slice(0, 3));
    if (plantedCaught.length) {
      evidence.push(`planted_errors_caught: ${plantedCaught.join(', ')}`);
    }

    let score = 'none';
    let rationale = 'No risks logged and no planted errors caught.';
    if (evidence.length) {
      if (risks.length >= 2 && plantedCaught.length >= 1) {
        score = 'strong';
        rationale = `${risks.length} risk(s) logged and ${plantedCaught.length}/${plantedTotal} planted error(s) caught.`;
      } else if (risks.length >= 1 || plantedCaught.length >= 1) {
        score = plantedCaught.length >= 1 && risks.length >= 1 ? 'observed' : 'limited';
        rationale = risks.length
          ? `${risks.length} risk(s) logged; planted errors caught: ${plantedCaught.length}/${plantedTotal}.`
          : `Planted errors caught: ${plantedCaught.length}/${plantedTotal}, but risk register empty.`;
      }
    }
    dims.push(dimResult(score, 'Risk detection', rationale, evidence, undefined, [], [
      'Which risk would you escalate first to the investment committee, and why?',
    ]));
  }

  // --- Communication clarity ---
  {
    const evidence = [];
    const chatCandidate = (session.chatMessages || []).filter((m) => {
      const role = String(m.senderType || m.role || m.from || '').toLowerCase();
      return !role || role === 'candidate' || role === 'user';
    });
    if (memoLen) evidence.push(`memo_length:${memoLen}`);
    if (memoLen >= 300) {
      const hasStructure = /recommend|risk|next|diligence|conditional|proceed|pass|hold/i.test(memo);
      if (hasStructure) evidence.push('memo_structure_signals');
      evidence.push(`memo_snippet: "${memo.trim().slice(0, 100)}…"`);
    }
    if (chatCandidate.length) {
      evidence.push(`candidate_chat_messages:${chatCandidate.length}`);
      const sample = asText(chatCandidate[0].content || chatCandidate[0].body || chatCandidate[0]).slice(0, 80);
      if (sample) evidence.push(`chat_snippet: "${sample}"`);
    }
    evidence.push(...eventIds(['chat_message_sent', 'stakeholder_replied', 'message_sent']).slice(0, 2));

    let score = 'none';
    let rationale = 'No memo or substantive chat evidence.';
    if (evidence.length) {
      if (memoLen >= 300 && /recommend|risk|next|diligence/i.test(memo) && chatCandidate.length >= 1) {
        score = 'strong';
        rationale = `Memo is ${memoLen} chars with recommendation/risk structure, plus stakeholder chat.`;
      } else if (memoLen >= 300 || (memoLen >= 150 && chatCandidate.length)) {
        score = 'observed';
        rationale = memoLen >= 300
          ? `Memo length ${memoLen} meets the submission bar.`
          : 'Partial memo and chat communication signals.';
      } else if (memoLen || chatCandidate.length) {
        score = 'limited';
        rationale = 'Some communication artifacts, but memo is short or unstructured.';
      }
    }
    dims.push(dimResult(score, 'Communication clarity', rationale, evidence));
  }

  // --- Adaptability ---
  {
    const evidence = [];
    const curveball = curveballViewed(session);
    if (curveball) {
      evidence.push(...eventIds(['manager_update_viewed', 'curveball_viewed', 'stakeholder_curveball']).slice(0, 2));
      if (!evidence.length) evidence.push('curveball_viewed:true');
    }

    const curveballTs = (() => {
      const ev = events.find((e) =>
        ['manager_update_viewed', 'curveball_viewed', 'stakeholder_curveball'].includes(e.type)
      );
      return ev ? Date.parse(ev.timestamp) || 0 : 0;
    })();

    const afterCurveball = (types) =>
      events.filter((e) => types.includes(e.type) && (!curveballTs || Date.parse(e.timestamp) >= curveballTs));

    const subsequent =
      afterCurveball(['assumption_added', 'assumption_updated', 'risk_added', 'risk_updated', 'recommendation_selected', 'recommendation_revised', 'scenario_changed']);
    const recChanged =
      listEvents(session, ['recommendation_revised', 'answer_revised']).length > 0 ||
      listEvents(session, 'recommendation_selected').length >= 2;

    if (subsequent.length) {
      for (const e of subsequent.slice(0, 3)) evidence.push(e.id);
    }
    if (recChanged) evidence.push('recommendation_changed_after_pressure');

    let score = 'none';
    let rationale = 'No curveball view or subsequent work-product change observed.';
    if (curveball && subsequent.length) {
      score = subsequent.length >= 2 || recChanged ? 'strong' : 'observed';
      rationale = 'Curveball viewed and subsequent assumption/risk/recommendation/scenario change recorded.';
    } else if (curveball) {
      score = 'limited';
      rationale = 'Curveball was viewed, but no clear subsequent change to assumptions, risks, or recommendation.';
      evidence.push('no_subsequent_change_detected');
    } else if (subsequent.length || recChanged) {
      score = 'limited';
      rationale = 'Work-product changes observed without a recorded curveball view.';
    }
    dims.push(dimResult(score, 'Adaptability', rationale, evidence, undefined, [], [
      'After the management update, what specifically did you change and why?',
    ]));
  }

  // --- Ownership / follow-through ---
  {
    const fulfilled = commitments.filter((c) => c.status === 'fulfilled');
    const missed = commitments.filter((c) => c.status === 'missed');
    const open = commitments.filter((c) => c.status === 'open');
    const evidence = [];
    for (const c of fulfilled) evidence.push(`fulfilled:${c.id}:${c.type}`);
    for (const c of missed) evidence.push(`missed:${c.id}:${c.type}`);
    for (const c of open) evidence.push(`open:${c.id}:${c.type}`);

    let score = 'none';
    let rationale = 'No commitments detected in chat.';
    if (commitments.length) {
      if (fulfilled.length && !missed.length) {
        score = fulfilled.length >= 2 ? 'strong' : 'observed';
        rationale = `${fulfilled.length} commitment(s) fulfilled; none missed.`;
      } else if (fulfilled.length && missed.length) {
        score = 'limited';
        rationale = `${fulfilled.length} fulfilled, ${missed.length} missed.`;
      } else if (missed.length) {
        score = 'limited';
        rationale = `${missed.length} commitment(s) missed at submit.`;
      } else {
        score = 'limited';
        rationale = `${open.length} commitment(s) still open (session may not be submitted).`;
      }
    }
    dims.push(dimResult(score, 'Ownership / follow-through', rationale, evidence, undefined,
      missed.map((c) => `Missed: ${c.phrase || c.type}`),
      missed.length ? ['You said you would follow up — what blocked completion?'] : []
    ));
  }

  // --- Evidence discipline ---
  {
    const evidence = [];
    if (resources) evidence.push(`resources_opened:${resources}`);
    for (const r of (session.openedResources || []).slice(0, 5)) evidence.push(`resource:${r}`);
    evidence.push(...eventIds(['resource_opened', 'document_opened', 'retention_csv_opened']).slice(0, 3));
    const citations = (memo.match(new RegExp(CITATION_RE.source, 'gi')) || []).length;
    if (citations) evidence.push(`memo_citation_signals:${citations}`);

    let score = 'none';
    let rationale = 'No resources opened and no citation signals in the memo.';
    if (evidence.length) {
      if (resources >= 3 && citations >= 1) {
        score = 'strong';
        rationale = `${resources} resources opened and memo cites sources.`;
      } else if (resources >= 2) {
        score = citations ? 'observed' : 'limited';
        rationale = `${resources} resources opened${citations ? ' with citation language' : ' without clear citations'}.`;
      } else if (resources >= 1 || citations) {
        score = 'limited';
        rationale = 'Sparse resource or citation evidence.';
      }
    }
    dims.push(dimResult(score, 'Evidence discipline', rationale, evidence));
  }

  // --- Integrity ---
  {
    const evidence = [];
    if (session.integrityStrong) evidence.push('integrityStrong:true');
    if (session.integrityConcern) evidence.push('integrityConcern:true');
    evidence.push(...eventIds(['integrity_response']).slice(0, 2));

    let score = 'none';
    let rationale = 'No integrity pressure response recorded.';
    const concerns = [];
    if (session.integrityConcern) {
      score = 'limited';
      rationale = 'Integrity concern flag set (candidate signaled willingness to soften or omit risk).';
      concerns.push('Integrity concern: possible risk sanitization under pressure.');
    } else if (session.integrityStrong) {
      score = 'strong';
      rationale = 'Candidate explicitly refused to hide or omit material risk under pressure.';
    } else if (evidence.length) {
      score = 'limited';
      rationale = 'Integrity-related event present without a clear strong/concern flag.';
    }
    dims.push(dimResult(score, 'Integrity', rationale, evidence, undefined, concerns, [
      'A partner asks you to soften a risk in the memo — how do you respond?',
    ]));
  }

  // --- AI judgment ---
  {
    const evidence = [];
    const actions = aiLog.map((a) => String(a.action || '').toLowerCase());
    for (const a of aiLog.slice(0, 8)) {
      evidence.push(`ai:${a.id || a.action}:${a.action}`);
    }
    const accepts = actions.filter((a) => a === 'accept').length;
    const edits = actions.filter((a) => a === 'edit').length;
    const rejects = actions.filter((a) => a === 'reject').length;
    const caught = actions.filter((a) => a === 'caught_error' || a === 'catch_error').length;
    const asks = actions.filter((a) => a === 'ask' || a === 'prompt').length;

    let score = 'none';
    let rationale = 'No AI usage log entries.';
    if (aiLog.length) {
      if ((edits || rejects || caught) && asks) {
        score = caught || (edits + rejects >= 1 && accepts <= edits + rejects) ? 'strong' : 'observed';
        rationale = `AI usage shows ask=${asks}, accept=${accepts}, edit=${edits}, reject=${rejects}, caught_error=${caught}.`;
      } else if (accepts && !edits && !rejects && !caught) {
        score = 'limited';
        rationale = 'AI outputs were accepted without recorded edit/reject/error-catch behavior.';
      } else {
        score = 'observed';
        rationale = `AI usage recorded (${aiLog.length} action(s)).`;
      }
    }
    dims.push(dimResult(score, 'AI judgment', rationale, evidence, undefined, [], [
      'Show me an AI suggestion you rejected or edited — what was wrong with it?',
    ]));
  }

  return dims;
}

/**
 * @param {ReturnType<typeof dimResult>[]} dims
 * @param {string} namePart
 */
function findDim(dims, namePart) {
  const re = new RegExp(namePart, 'i');
  return dims.find((d) => re.test(d.dimension));
}

/**
 * Evaluate a candidate session into an evidence-based EvaluationResult.
 *
 * @param {CandidateSession} session
 * @param {Object} [options]
 * @returns {Object}
 */
export function evaluateSession(session, options = {}) {
  if (!session || typeof session !== 'object') {
    throw new Error('evaluateSession: session is required');
  }

  const scenario = session.scenario || options.scenario || null;
  const plantedErrors = (scenario && Array.isArray(scenario.planted_errors))
    ? scenario.planted_errors
    : [];
  const ambiguityPoints = (scenario && Array.isArray(scenario.ambiguity_points))
    ? scenario.ambiguity_points
    : [];

  const commitments = evaluateCommitments(session);
  const fulfilled = commitments.filter((c) => c.status === 'fulfilled');
  const missed = commitments.filter((c) => c.status === 'missed');
  const open = commitments.filter((c) => c.status === 'open');

  const errors_caught = [];
  const errors_missed = [];
  const plantedEvidence = [];
  for (const err of plantedErrors) {
    const { caught, evidence } = detectPlantedError(session, err);
    if (caught) {
      errors_caught.push(err.id);
      plantedEvidence.push({ id: err.id, caught: true, evidence });
    } else {
      errors_missed.push(err.id);
      plantedEvidence.push({ id: err.id, caught: false, evidence });
    }
  }

  const ambiguity_handling = ambiguityPoints.map((p) => scoreAmbiguity(session, p));

  const dimension_scores = scoreDimensions(
    session,
    commitments,
    errors_caught,
    plantedErrors.length
  );

  // AI usage quality aggregate
  const aiDim = findDim(dimension_scores, 'AI judgment');
  const ai_usage_quality = {
    score: aiDim ? aiDim.score : 'none',
    rationale: aiDim ? aiDim.rationale : 'No AI usage evidence.',
    evidence: aiDim ? aiDim.evidence.slice() : [],
  };

  const follow_through = {
    fulfilled: fulfilled.map((c) => ({ id: c.id, type: c.type, phrase: c.phrase })),
    missed: missed.map((c) => ({ id: c.id, type: c.type, phrase: c.phrase })),
    open: open.map((c) => ({ id: c.id, type: c.type, phrase: c.phrase })),
  };

  const memoLen = String(session.finalMemo || '').trim().length;
  const resources = resourceCount(session);
  const riskCount = (session.risks || []).length;
  const events = listEvents(session);
  const eventCount = events.length;

  const finDim = findDim(dimension_scores, 'Analytical|Financial');
  const riskDim = findDim(dimension_scores, 'Risk detection');

  let executive_recommendation = 'Hold';
  if (
    session.integrityConcern ||
    memoLen < 300 ||
    riskCount < 1 ||
    resources < 2
  ) {
    executive_recommendation = 'Reject';
  } else if (
    finDim && isObservedOrStrong(finDim.score) &&
    riskDim && isObservedOrStrong(riskDim.score) &&
    !session.integrityConcern &&
    memoLen >= 300 &&
    errors_caught.length >= 1
  ) {
    executive_recommendation = 'Advance';
  }

  let confidence = 'Low';
  if (eventCount >= 12 && resources >= 3 && memoLen >= 300) confidence = 'High';
  else if (eventCount >= 6) confidence = 'Medium';

  const hard_skill_evidence = [];
  if (modelViewed(session)) hard_skill_evidence.push({ type: 'model_viewed', evidence: ['model interaction recorded'] });
  if ((session.assumptions || []).length) {
    hard_skill_evidence.push({
      type: 'assumptions',
      evidence: (session.assumptions || []).slice(0, 5).map((a) => asText(a).slice(0, 120)),
    });
  }
  if (riskCount) {
    hard_skill_evidence.push({
      type: 'risks',
      evidence: (session.risks || []).slice(0, 5).map((r) => asText(r).slice(0, 120)),
    });
  }
  if (errors_caught.length) {
    hard_skill_evidence.push({ type: 'planted_errors_caught', evidence: errors_caught.slice() });
  }
  if (session.selectedScenario === 'downside' || (session.fin && session.fin.scenario === 'downside')) {
    hard_skill_evidence.push({ type: 'downside_case', evidence: ['downside scenario selected'] });
  }

  const behavioral_evidence = [];
  if (curveballViewed(session)) behavioral_evidence.push({ type: 'curveball_viewed', evidence: ['management update / curveball viewed'] });
  if (commitments.length) {
    behavioral_evidence.push({
      type: 'commitments',
      evidence: commitments.map((c) => `${c.status}:${c.type}:${c.phrase || ''}`),
    });
  }
  if (session.integrityStrong) behavioral_evidence.push({ type: 'integrity_strong', evidence: ['integrityStrong:true'] });
  if (session.integrityConcern) behavioral_evidence.push({ type: 'integrity_concern', evidence: ['integrityConcern:true'] });
  for (const a of ambiguity_handling) {
    behavioral_evidence.push({
      type: 'ambiguity',
      evidence: [`${a.ambiguity_point_id}:${a.response_quality}`, ...(a.evidence || []).slice(0, 2)],
    });
  }

  const strengths = [];
  const watch_areas = [];
  for (const d of dimension_scores) {
    if (d.score === 'strong' || d.score === 'observed') {
      strengths.push(`${d.dimension}: ${d.rationale}`);
    }
    if (d.score === 'limited' || d.score === 'none') {
      watch_areas.push(`${d.dimension}: ${d.rationale}`);
    }
    for (const c of d.concerns || []) watch_areas.push(c);
  }
  if (errors_missed.length) {
    watch_areas.push(`Planted errors missed: ${errors_missed.join(', ')}`);
  }
  if (missed.length) {
    watch_areas.push(`Follow-through missed: ${missed.map((c) => c.type).join(', ')}`);
  }

  const interview_questions = [];
  for (const d of dimension_scores) {
    for (const q of d.interviewFollowUps || []) {
      if (q && !interview_questions.includes(q)) interview_questions.push(q);
    }
  }
  if (errors_missed.includes('err_top10_retention')) {
    interview_questions.push('Did you notice anything unusual in top-10 cohort retention versus the headline rate?');
  }
  if (errors_missed.includes('err_exit_multiple')) {
    interview_questions.push('How did management’s exit multiple compare to the precedent range you saw?');
  }
  if (errors_missed.includes('err_synergy_doublecount')) {
    interview_questions.push('How did you test whether synergy claims double-count organic growth?');
  }

  const benchmark = {
    status: 'insufficient_data',
    comparison_text: 'Not enough completed pilot sessions yet to benchmark against past hires.',
  };

  const evidence_timeline = events.map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    type: e.type,
    label: (e.payload && (e.payload.label || e.payload.detail || e.payload.title)) || e.type,
  }));

  // Evidence-based summary — no fake confidence language
  const summaryParts = [];
  summaryParts.push(
    `Session ${session.id} evaluated from ${eventCount} event(s), ${resources} resource(s), memo ${memoLen} chars, ${riskCount} risk(s).`
  );
  summaryParts.push(
    `Planted errors: ${errors_caught.length} caught, ${errors_missed.length} missed` +
      (plantedErrors.length ? ` of ${plantedErrors.length}.` : ' (none defined on scenario).')
  );
  if (finDim) summaryParts.push(`Financial reasoning: ${finDim.label}.`);
  if (riskDim) summaryParts.push(`Risk detection: ${riskDim.label}.`);
  if (session.integrityConcern) {
    summaryParts.push('Integrity concern flag is set — recommendation constrained.');
  } else if (session.integrityStrong) {
    summaryParts.push('Integrity strong flag is set from pressure response.');
  }
  if (confidence === 'Low') {
    summaryParts.push('Overall confidence is Low because the evidence trail is thin.');
  } else if (confidence === 'Medium') {
    summaryParts.push('Overall confidence is Medium based on partial activity volume.');
  } else {
    summaryParts.push('Overall confidence is High based on event volume, resources, and memo length.');
  }
  const overall_summary = summaryParts.join(' ');

  const memoLines = [];
  memoLines.push(`Recommendation: ${executive_recommendation} (confidence: ${confidence}).`);
  memoLines.push(overall_summary);
  if (strengths.length) memoLines.push(`Strengths: ${strengths.slice(0, 3).join(' | ')}`);
  if (watch_areas.length) memoLines.push(`Watch areas: ${watch_areas.slice(0, 4).join(' | ')}`);
  memoLines.push(benchmark.comparison_text);
  const final_memo = memoLines.join('\n\n');

  return {
    session_id: session.id,
    scenario_id: session.scenarioId || (scenario && scenario.id) || null,
    evaluated_at: new Date().toISOString(),
    dimension_scores,
    errors_caught,
    errors_missed,
    planted_error_detail: plantedEvidence,
    ambiguity_handling,
    ai_usage_quality,
    follow_through,
    overall_summary,
    executive_recommendation,
    confidence,
    hard_skill_evidence,
    behavioral_evidence,
    strengths,
    watch_areas,
    interview_questions,
    benchmark,
    final_memo,
    evidence_timeline,
    meta: {
      event_count: eventCount,
      resource_count: resources,
      memo_length: memoLen,
      risk_count: riskCount,
      options: options && typeof options === 'object' ? { ...options, scenario: undefined } : {},
    },
  };
}

/**
 * Shape an EvaluationResult into UI-friendly report sections.
 * @param {Object} evaluation
 * @returns {Object}
 */
export function formatEvaluationForReport(evaluation) {
  if (!evaluation || typeof evaluation !== 'object') {
    return {
      header: { title: 'Evidence report', recommendation: null, confidence: 'Low' },
      sections: [],
      benchmark: {
        status: 'insufficient_data',
        comparison_text: 'Not enough completed pilot sessions yet to benchmark against past hires.',
      },
    };
  }

  const dims = evaluation.dimension_scores || [];
  return {
    header: {
      title: 'Evidence report',
      session_id: evaluation.session_id,
      recommendation: evaluation.executive_recommendation,
      confidence: evaluation.confidence,
      summary: evaluation.overall_summary,
    },
    recommendation_banner: {
      decision: evaluation.executive_recommendation,
      confidence: evaluation.confidence,
      rationale: evaluation.overall_summary,
    },
    dimensions: dims.map((d) => ({
      name: d.dimension,
      score: d.score,
      label: d.label,
      confidence: d.confidence,
      rationale: d.rationale,
      evidence: d.evidence || [],
      concerns: d.concerns || [],
      interview_follow_ups: d.interviewFollowUps || [],
    })),
    planted_errors: {
      caught: evaluation.errors_caught || [],
      missed: evaluation.errors_missed || [],
    },
    ambiguity: evaluation.ambiguity_handling || [],
    ai_usage: evaluation.ai_usage_quality || null,
    follow_through: evaluation.follow_through || { fulfilled: [], missed: [], open: [] },
    hard_skills: evaluation.hard_skill_evidence || [],
    behavioral: evaluation.behavioral_evidence || [],
    strengths: evaluation.strengths || [],
    watch_areas: evaluation.watch_areas || [],
    interview_questions: evaluation.interview_questions || [],
    timeline: evaluation.evidence_timeline || [],
    benchmark: evaluation.benchmark || {
      status: 'insufficient_data',
      comparison_text: 'Not enough completed pilot sessions yet to benchmark against past hires.',
    },
    final_memo: evaluation.final_memo || '',
    sections: [
      {
        id: 'summary',
        title: 'Executive summary',
        body: evaluation.overall_summary,
      },
      {
        id: 'dimensions',
        title: 'Dimension scores',
        items: dims.map((d) => ({
          title: d.dimension,
          subtitle: d.label,
          body: d.rationale,
          evidence: d.evidence,
        })),
      },
      {
        id: 'errors',
        title: 'Planted errors',
        body: `Caught: ${(evaluation.errors_caught || []).join(', ') || 'none'}. Missed: ${(evaluation.errors_missed || []).join(', ') || 'none'}.`,
      },
      {
        id: 'follow_through',
        title: 'Follow-through',
        body: `Fulfilled ${(evaluation.follow_through && evaluation.follow_through.fulfilled || []).length}, missed ${(evaluation.follow_through && evaluation.follow_through.missed || []).length}, open ${(evaluation.follow_through && evaluation.follow_through.open || []).length}.`,
      },
      {
        id: 'interview',
        title: 'Interview follow-ups',
        items: (evaluation.interview_questions || []).map((q) => ({ title: q })),
      },
      {
        id: 'benchmark',
        title: 'Benchmark',
        body: (evaluation.benchmark && evaluation.benchmark.comparison_text) ||
          'Not enough completed pilot sessions yet to benchmark against past hires.',
      },
      {
        id: 'memo',
        title: 'Final memo',
        body: evaluation.final_memo,
      },
    ],
  };
}
