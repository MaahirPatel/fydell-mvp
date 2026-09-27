import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createSandboxRun, loadOwnedSandbox } from '../src/lib/sim-engine/proof/sandbox/lifecycle';
import { applySandboxAction, buildSandboxView, type SandboxActionInput } from '../src/lib/sim-engine/proof/sandbox/service';
import { deleteSandboxGraph } from '../src/lib/sim-engine/proof/sandbox/cleanup';
import { APPLIED_AI_WORKFLOW_FIXTURE } from '../src/lib/sim-engine/proof/sandbox/fixture';
import { sandboxAdmin } from '../src/lib/sim-engine/proof/sandbox/client';

async function main() {
  if (process.env.FYDELL_DEV_PROJECT_REF !== 'btbmvrvynnrhapjdkunz') throw new Error('Staging only');
  const created = await createSandboxRun(`engineering-check-${randomUUID()}`);
  let run = created.run;
  try {
    const act = async (action: SandboxActionInput) => { run = await applySandboxAction(run, { ...action, idempotencyKey: randomUUID() }); };
    await assert.rejects(() => loadOwnedSandbox(run.id, 'wrong-owner'));
    await act({ type: 'start' });
    await act({ type: 'save_code', source: 'def handle_events(events):\n    return []\n' });
    run = await loadOwnedSandbox(run.id, created.capabilitySecret);
    assert.match(run.worldState.workspace.codeSource, /return \[\]/);
    assert.equal(run.worldState.workspace.codeExecution, null);
    const { data: versions, error } = await sandboxAdmin().from('proof_artifact_versions').select('content').eq('run_id', run.id);
    assert.equal(error, null);
    assert.ok(versions.some(v => v.content.workspace?.codeSource?.includes('return []')));
    console.log('PASS: owner isolation, code save, immutable snapshot, reload');
    const trace = APPLIED_AI_WORKFLOW_FIXTURE.resources.find(r => r.kind === 'trace')!;
    await act({ type: 'open_trace', resourceId: trace.id });
    await act({ type: 'run_eval' });
    await act({ type: 'edit_config', config: { ...run.worldState.workspace.config, semanticValidation: true } });
    await act({ type: 'upsert_eval_case', evalCase: { id: 'regression-test', title: 'Reject unauthorized plans', slice: 'critical_authorization', enabled: true } });
    await act({ type: 'commit_architecture', architectureDecision: 'Validate authorization before a write and keep one stable idempotency key per accepted request.' });
    await act({ type: 'edit_config', config: { ...run.worldState.workspace.config, routing: 'deterministic', model: 'fast', modelCalls: 1, idempotencyKey: true } });
    await act({ type: 'run_eval' });
    await act({ type: 'write_recommendation', recommendation: 'Use deterministic routing for known requests, validate authorization and test duplicate retries before any production rollout.' });
    await act({ type: 'submit_episode' });
    assert.equal(run.worldState.currentStep, 'defense_ready');
    await assert.rejects(() => applySandboxAction(run, { type: 'save_code', source: 'changed' }));
    console.log('PASS: synthetic episode, submission, post-submission code lock');
    await act({ type: 'submit_defense', answer: 'The deterministic route reduces model latency. Authorization and idempotency are checked before side effects. The synthetic metrics still need independent production validation.' });
    assert.equal(run.worldState.currentStep, 'review_pending');
    await act({ type: 'review', decision: 'approve' });
    const view = await buildSandboxView(run);
    assert.ok(view.brief);
    assert.ok(view.receipt);
    assert.equal(run.worldState.currentStep, 'finalized');
    console.log('PASS: written follow-up, review, report and receipt persistence');
  } finally {
    await deleteSandboxGraph(run.id, run.organizationId);
    console.log('Removed only this test run and its temporary organization.');
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Staging check failed'); process.exitCode = 1; });
