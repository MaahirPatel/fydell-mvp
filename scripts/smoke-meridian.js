#!/usr/bin/env node
/**
 * Smoke test: two Meridian seeds must differ; progress/submit/commitments work.
 */
const path = require('path');
const eng = require(path.join(__dirname, '..', 'sim-engine.cjs'));
const F = eng.FydellSim || eng.default || eng;

async function main() {
  const a = await F.instantiateMeridian('seed-alpha');
  const b = await F.instantiateMeridian('seed-beta');
  const ga = a.financial_model.assumptions.growth_rate;
  const gb = b.financial_model.assumptions.growth_rate;
  const ma = a.financial_model.assumptions.exit_multiple;
  const mb = b.financial_model.assumptions.exit_multiple;
  console.log('seed-alpha growth=', ga, 'multiple=', ma);
  console.log('seed-beta  growth=', gb, 'multiple=', mb);
  if (ga === gb && ma === mb) {
    throw new Error('Adaptive variation failed: identical assumptions across seeds');
  }
  const doc = (a.documents || []).find((d) => d.id === 'exec_brief') || a.documents[0];
  if (doc && /\{\{/.test(doc.body || '')) {
    throw new Error('Placeholders not substituted in exec brief');
  }
  const session = F.createSession({
    scenarioId: 'meridian',
    inviteToken: 'smoke_tok',
    candidateName: 'Smoke Tester',
    candidateEmail: 'smoke@fydell.test',
    variantSeed: 'seed-alpha',
    scenario: a,
  });
  F.logEvent(session, 'simulation_started', { label: 'Started' });
  F.logEvent(session, 'brief_viewed', { label: 'Brief' });
  session._briefViewed = true;
  session.viewedTabs = ['brief'];
  session.openedResources = ['exec_brief', 'retention_csv'];
  F.logEvent(session, 'resource_opened', { resourceId: 'exec_brief' });
  F.logEvent(session, 'resource_opened', { resourceId: 'retention_csv' });
  session._modelViewed = true;
  F.logEvent(session, 'financial_model_viewed', { label: 'Model' });
  session.assumptions = [{ id: 'a1', name: 'Exit multiple', value: '9x', rationale: 'Precedent' }];
  F.logEvent(session, 'assumption_added', { label: 'Assumption' });
  session.risks = [{ id: 'r1', name: 'Top-10 retention', severity: 'high', evidence: 'CSV' }];
  F.logEvent(session, 'risk_added', { label: 'Risk' });
  session.chatMessages = [{ id: 'c1', senderType: 'candidate', content: 'I will run a downside case and review retention.' }];
  F.detectCommitments('I will run a downside case and review retention.', session);
  F.logEvent(session, 'chat_message_sent', { label: 'Replied' });
  session._requiredChatReplied = true;
  session._curveballViewed = true;
  F.logEvent(session, 'manager_update_viewed', { label: 'Curveball' });
  session.selectedScenario = 'downside';
  session.selectedRecommendation = 'conditional';
  session.finalMemo =
    'Conditional Proceed. Retention at top accounts and an above-precedent exit multiple change the downside case enough that we should renegotiate before signing. Next diligence: top-10 renewals and noteholder consent on change-of-control debt. The incomplete mid-market cohort data is a gap I would flag rather than invent a precise impact.';
  let missing = F.getMissingSubmissionRequirements(session);
  console.log('missing before fulfill:', missing);
  // Mark commitment evidence
  session.commitments = session.commitments || [];
  F.evaluateCommitments(session);
  const prog = F.calculateSimulationProgress(session);
  console.log('progress=', prog, 'canSubmit=', F.canSubmit(session));
  if (!F.canSubmit(session)) {
    console.log('still missing:', F.getMissingSubmissionRequirements(session));
  }
  F.markSubmitted(session);
  console.log('after submit progress=', F.calculateSimulationProgress(session));
  console.log('SMOKE OK');
}

main().catch((e) => {
  console.error('SMOKE FAIL', e);
  process.exit(1);
});
