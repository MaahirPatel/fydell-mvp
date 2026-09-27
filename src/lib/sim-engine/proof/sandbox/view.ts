import type { AppliedAiEvalResult, AppliedAiWorkspace } from "./applied-ai-workspace";
import type { SandboxWorldStateV1 } from "./world-state";

export type SandboxSessionView = {
  runId: string;
  step: string;
  revision: number;
  expiresAt: string;
  constraintDelivered: boolean;
  episodeStage: SandboxWorldStateV1["episodeStage"];
  reviewKind: "none" | "scripted" | "sandbox_visitor";
  reviewDecision: "approve" | "limit" | "follow_up" | "reject" | null;
  receiptPublicId: string | null;
  receiptIntegrityHash: string | null;
  interviewFinding: "confirmed" | "contradicted" | "still_unclear" | "not_asked" | null;
  hiringOutcome: "advance" | "hold" | "close" | "hired" | null;
  fixture: {
    organization: { name: string; customer: string };
    simulationTitle: string;
    role: { title: string };
    candidate: { candidateId: string; label: string };
    candidates: Array<{
      candidateId: string;
      label: string;
      status: "ready" | "defense_pending" | "in_progress" | "invited";
    }>;
    resources: Array<{
      id: string;
      title: string;
      body: string;
      kind: "requirement" | "config" | "trace" | "metric" | "contract";
    }>;
    changedFact: { id: string; title: string; body: string };
    defenseQuestion: { prompt: string };
    competencies: readonly string[];
    requirements: ReadonlyArray<{
      id: string;
      title: string;
      coverage: "PROVEN" | "PARTIALLY_PROVEN" | "NOT_PROVEN";
    }>;
  };
  workspace: AppliedAiWorkspace;
  latestEval: AppliedAiEvalResult | null;
  baselineEval: AppliedAiEvalResult | null;
  progress: SandboxWorldStateV1["progress"];
  artifact: {
    diagnosis: string;
    recommendation: string;
    customer_message: string;
    internal_note: string;
    assumptions: string;
    limitations: string;
  } | null;
  events: Array<{ id: string; sequence: number; eventType: string; stream: string | null; payload?: Record<string, unknown> }>;
  claims: Array<{
    id: string;
    pass: string;
    claim: string;
    competency: string;
    direction: string;
    confidence: string;
    reviewStatus: string;
    supportingEventIds: string[];
    counterevidenceEventIds: string[];
    supportingEvents: Array<{ id: string; label: string }>;
    counterevidenceEvents: Array<{ id: string; label: string }>;
  }>;
  brief: {
    recommendation: string;
    why: string;
    strengths: string[];
    concerns: string[];
    probes: string[];
    published: boolean;
  } | null;
  defense: { id: string; prompt: string; answer: string; status: string } | null;
  interviewPlan: {
    confirm: string[];
    investigate: string[];
    challenge: string[];
  } | null;
  receipt: Record<string, unknown> | null;
  labels: { banner: string; review: string | null; receipt: string };
};
