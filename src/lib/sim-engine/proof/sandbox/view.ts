export type SandboxSessionView = {
  runId: string;
  step: string;
  revision: number;
  expiresAt: string;
  constraintDelivered: boolean;
  reviewKind: "none" | "scripted" | "sandbox_visitor";
  reviewDecision: "approve" | "limit" | "follow_up" | "reject" | null;
  receiptPublicId: string | null;
  receiptIntegrityHash: string | null;
  fixture: {
    organization: { name: string; customer: string };
    role: { title: string };
    candidate: { label: string; displayName: string };
    resources: Array<{ id: string; title: string; body: string }>;
    changedFact: { id: string; title: string; body: string };
    defenseQuestion: { prompt: string };
    competencies: readonly string[];
  };
  artifact: {
    diagnosis: string;
    recommendation: string;
    customer_message: string;
    internal_note: string;
    assumptions: string;
    limitations: string;
  } | null;
  events: Array<{ id: string; sequence: number; eventType: string; stream: string | null }>;
  claims: Array<{
    id: string;
    pass: string;
    claim: string;
    competency: string;
    direction: string;
    confidence: string;
  }>;
  brief: {
    recommendation: string;
    why: string;
    strengths: string[];
    concerns: string[];
    probes: string[];
    published: boolean;
  } | null;
  defense: { id: string; prompt: string; answer: string } | null;
  labels: { banner: string; review: string | null; receipt: string };
};
