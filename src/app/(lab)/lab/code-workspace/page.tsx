import { notFound } from 'next/navigation';
import { isPreviewMode } from '@/lib/dev/preview';
import { WorkspacePreview } from '@/components/sandbox/WorkspacePreview';
import { createAppliedAiWorkspace } from '@/lib/sim-engine/proof/sandbox/applied-ai-workspace';
import { APPLIED_AI_WORKFLOW_FIXTURE as fixture } from '@/lib/sim-engine/proof/sandbox/fixture';
import type { SandboxSessionView } from '@/lib/sim-engine/proof/sandbox/view';

export const dynamic = 'force-dynamic';
export default function Page() {
  if (process.env.NODE_ENV === 'production' || !isPreviewMode()) notFound();
  const initial: SandboxSessionView = {
    runId: 'development-code-preview', revision: 0, step: 'active', expiresAt: '2099-01-01T00:00:00.000Z',
    constraintDelivered: false, episodeStage: 'BASELINE_RUN', reviewKind: 'none', reviewDecision: null,
    receiptPublicId: null, receiptIntegrityHash: null, interviewFinding: null, hiringOutcome: null,
    fixture: { organization: fixture.organization, simulationTitle: fixture.simulationVersion.title,
      role: fixture.role, candidate: fixture.candidate, candidates: fixture.candidates,
      resources: fixture.resources, changedFact: fixture.changedFact, defenseQuestion: fixture.defenseQuestion,
      competencies: [], requirements: fixture.requirements },
    workspace: createAppliedAiWorkspace(), executionAvailable: false, latestEval: null, baselineEval: null,
    progress: { resourceOpened: true, traceOpened: true, baselineRun: true, configEdited: false, evalCaseEdited: false,
      architectureCommitted: false, factReleased: false, postFactRevision: false, postFactEvalRun: false,
      recommendationWritten: false, submissionCompleted: false },
    artifact: null, events: [], claims: [], brief: null, defense: null, interviewPlan: null, receipt: null,
    labels: { banner: 'Development preview', review: null, receipt: 'No receipt' },
  };
  return <WorkspacePreview initial={initial} />;
}
