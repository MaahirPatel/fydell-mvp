#!/usr/bin/env node
/**
 * usage: node scripts/eval-session.js [path-to-session.json]
 * If no path, builds a synthetic strong session via FydellSim and evaluates it.
 */
const fs = require('fs');
const path = require('path');

const eng = require(path.join(__dirname, '..', 'sim-engine.cjs'));
const F = eng.FydellSim || eng.default || eng;

/**
 * Build a synthetic "strong" Meridian session with enough evidence to Advance.
 * @param {object} FydellSim
 * @returns {Promise<object>}
 */
async function buildSyntheticStrongSession(FydellSim) {
  const scenario = await FydellSim.instantiateMeridian('eval-strong-seed');
  const session = FydellSim.createSession({
    scenarioId: 'meridian',
    inviteToken: 'eval_tok',
    candidateName: 'Eval Strong',
    candidateEmail: 'eval@fydell.test',
    variantSeed: 'eval-strong-seed',
    scenario,
  });

  FydellSim.logEvent(session, 'simulation_started', { label: 'Started' });
  FydellSim.logEvent(session, 'brief_viewed', { label: 'Brief' });
  session._briefViewed = true;
  session.viewedTabs = ['brief', 'model', 'resources'];

  session.openedResources = ['exec_brief', 'retention_csv', 'market_memo'];
  FydellSim.logEvent(session, 'resource_opened', { resourceId: 'exec_brief', label: 'Exec brief' });
  FydellSim.logEvent(session, 'resource_opened', { resourceId: 'retention_csv', label: 'Retention CSV' });
  FydellSim.logEvent(session, 'resource_opened', { resourceId: 'market_memo', label: 'Market memo' });
  FydellSim.logEvent(session, 'retention_csv_opened', { resourceId: 'retention_csv' });

  session._modelViewed = true;
  FydellSim.logEvent(session, 'financial_model_viewed', { label: 'Model' });
  FydellSim.logEvent(session, 'model_opened', { label: 'Model opened' });

  session.assumptions = [
    {
      id: 'a1',
      name: 'Exit multiple',
      value: '9.0x',
      rationale: 'Aligned to precedent range rather than management 11x exit multiple',
    },
    {
      id: 'a2',
      name: 'Top-10 retention',
      value: 'weaker than headline',
      rationale: 'Incomplete mid-market cohort data; retention gap needs diligence',
    },
  ];
  FydellSim.logEvent(session, 'assumption_added', { label: 'Exit multiple assumption', assumptionId: 'a1' });
  FydellSim.logEvent(session, 'assumption_added', { label: 'Retention assumption', assumptionId: 'a2' });

  session.risks = [
    {
      id: 'r1',
      name: 'Top-10 retention / concentration',
      severity: 'high',
      evidence: 'retention_csv — headline retention masks weaker top-10 cohort churn',
    },
    {
      id: 'r2',
      name: 'Exit multiple above precedent',
      severity: 'high',
      evidence: 'market_memo — management valuation multiple vs 8.5-10x precedent',
    },
    {
      id: 'r3',
      name: 'Synergy double-count vs organic',
      severity: 'medium',
      evidence: 'Synergy claim may double-count expansion already in organic plan',
    },
  ];
  FydellSim.logEvent(session, 'risk_added', { label: 'Retention risk', riskId: 'r1' });
  FydellSim.logEvent(session, 'risk_added', { label: 'Multiple risk', riskId: 'r2' });
  FydellSim.logEvent(session, 'risk_added', { label: 'Synergy risk', riskId: 'r3' });

  session.chatMessages = [
    {
      id: 'c1',
      senderType: 'candidate',
      content:
        'I will run a downside case and review retention. The cohort data looks incomplete for mid-market — I need more diligence before sizing the gap precisely.',
    },
    {
      id: 'c2',
      senderType: 'candidate',
      content:
        'I will not hide retention risk. We must disclose the top-10 concentration issue in the memo rather than keep retention flat for a cleaner recommendation.',
    },
  ];
  FydellSim.detectCommitments(session.chatMessages[0].content, session);
  FydellSim.detectCommitments(session.chatMessages[1].content, session);
  FydellSim.logEvent(session, 'chat_message_sent', { label: 'Replied on retention' });
  FydellSim.logEvent(session, 'stakeholder_replied', { label: 'Integrity reply' });
  session._requiredChatReplied = true;
  session.integrityStrong = true;
  session.integrityConcern = false;

  session._curveballSeen = true;
  session._curveballViewed = true;
  FydellSim.logEvent(session, 'manager_update_viewed', { label: 'Curveball' });

  session.selectedScenario = 'downside';
  if (!session.fin) session.fin = {};
  session.fin.scenario = 'downside';
  FydellSim.logEvent(session, 'scenario_changed', { label: 'Downside', scenario: 'downside' });
  FydellSim.logEvent(session, 'assumption_added', { label: 'Post-curveball assumption tweak' });
  FydellSim.logEvent(session, 'risk_updated', { label: 'Post-curveball risk update', riskId: 'r1' });

  session.selectedRecommendation = 'conditional';
  FydellSim.logEvent(session, 'recommendation_selected', { label: 'Conditional Proceed', value: 'conditional' });
  FydellSim.logEvent(session, 'recommendation_revised', { label: 'Revised after curveball' });

  session.ai_usage_log = [
    { id: 'ai1', timestamp: new Date().toISOString(), action: 'ask', prompt: 'Draft risk language' },
    { id: 'ai2', timestamp: new Date().toISOString(), action: 'edit', prompt: 'Softened tone', postAction: 'edited' },
    { id: 'ai3', timestamp: new Date().toISOString(), action: 'caught_error', prompt: 'Synergy double-count', postAction: 'flagged' },
    { id: 'ai4', timestamp: new Date().toISOString(), action: 'reject', prompt: 'Overconfident retention impact' },
  ];

  session.finalMemo = [
    'Recommendation: Conditional Proceed at a renegotiated valuation.',
    'Financial reasoning: management’s exit multiple sits above the 8.5-10x precedent range, so the valuation bridge is aggressive on an LTM revenue / EBITDA basis.',
    'Risks: (1) top-10 retention and concentration — retention_csv shows headline retention masking weaker cohort churn; (2) synergy claims may double-count expansion already in the organic plan per market_memo; (3) incomplete mid-market cohort data is a diligence gap I will not invent a precise impact for.',
    'I ran the downside case in the model. Next diligence: top-10 renewals, noteholder consent on change-of-control debt, and clarifying the incomplete cohort tables before IC.',
    'Sources cited: exec_brief, retention_csv, market_memo, and the interactive financial model.',
  ].join(' ');

  FydellSim.evaluateCommitments(session);
  FydellSim.markSubmitted(session);
  return session;
}

function printSummary(evaluation) {
  const dims = (evaluation.dimension_scores || []).map((d) => ({
    dimension: d.dimension,
    score: d.score,
    label: d.label,
    confidence: d.confidence,
  }));

  const summary = {
    session_id: evaluation.session_id,
    executive_recommendation: evaluation.executive_recommendation,
    confidence: evaluation.confidence,
    dimensions: dims,
    errors_caught: evaluation.errors_caught,
    errors_missed: evaluation.errors_missed,
    ambiguity_handling: evaluation.ambiguity_handling,
    follow_through: evaluation.follow_through,
    benchmark: evaluation.benchmark,
    overall_summary: evaluation.overall_summary,
  };

  console.log(JSON.stringify(summary, null, 2));
}

async function main() {
  const argPath = process.argv[2];
  let session;

  if (argPath) {
    const abs = path.resolve(process.cwd(), argPath);
    const raw = fs.readFileSync(abs, 'utf8');
    session = JSON.parse(raw);
  } else {
    if (typeof F.evaluateSession !== 'function') {
      console.error(
        'FydellSim.evaluateSession is missing. Rebuild with: npm run build:sim:node'
      );
      process.exit(1);
    }
    session = await buildSyntheticStrongSession(F);
  }

  if (typeof F.evaluateSession !== 'function') {
    console.error(
      'FydellSim.evaluateSession is missing. Rebuild with: npm run build:sim:node'
    );
    process.exit(1);
  }

  const evaluation = F.evaluateSession(session);
  printSummary(evaluation);
}

main().catch((err) => {
  console.error('EVAL FAIL', err);
  process.exit(1);
});
