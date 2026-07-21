/** Event-sourced Project Relay workspace — canonical types. */

export type ArtifactKind = "code" | "data" | "markdown" | "json" | "other" | "output";

export type ArtifactStatus = "current" | "modified" | "stale";

export type TestRunStatus = "PASS" | "FAIL" | "ERROR" | "NOT_RUN" | "STALE";

export type RequirementStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SATISFIED"
  | "REGRESSED"
  | "BLOCKED";

export type ActorType = "candidate" | "system" | "customer_simulator" | "ai_assistant" | "operator";

export type WorkspaceCommandType =
  | "INIT_WORKSPACE"
  | "OPEN_ARTIFACT"
  | "EDIT_FILE"
  | "EDIT_DATASET_CELL"
  | "SEND_STAKEHOLDER_MESSAGE"
  | "ACCEPT_AI_PATCH"
  | "REJECT_AI_PATCH"
  | "RUN_COMMAND"
  | "ACKNOWLEDGE_CURVEBALL"
  | "ADD_REASONING_NOTE"
  | "SAVE_HANDOFF"
  | "SUBMIT_SESSION"
  | "APPLY_RUNTIME_RESULT";

export type WorkspaceEventType =
  | "workspace.initialized"
  | "artifact.opened"
  | "file.patch_applied"
  | "dataset.cell_updated"
  | "message.sent"
  | "message.received"
  | "ai.patch_accepted"
  | "ai.patch_rejected"
  | "runtime.started"
  | "runtime.completed"
  | "runtime.failed"
  | "tests.completed"
  | "preview.invalidated"
  | "preview.generated"
  | "requirement.satisfied"
  | "requirement.regressed"
  | "curveball.triggered"
  | "curveball.acknowledged"
  | "handoff.saved"
  | "session.submitted"
  | "deps.invalidated";

export type ArtifactRecord = {
  path: string;
  kind: ArtifactKind;
  version: number;
  content: string;
  contentHash: string;
  status: ArtifactStatus;
  updatedAt: string;
};

export type RequirementState = {
  id: string;
  description: string;
  blocking: boolean;
  status: RequirementStatus;
  evidenceTestIds: string[];
  lastVerifiedAtWorkspaceVersion: number | null;
};

export type TestState = {
  id: string;
  label: string;
  status: TestRunStatus;
  workspaceVersion: number | null;
  detail: string | null;
};

export type MessageRecord = {
  id: string;
  actor: ActorType;
  authorName: string;
  authorRole: string;
  text: string;
  at: string;
  status: "sent" | "pending" | "failed";
};

export type PreviewState = {
  content: string | null;
  workspaceVersion: number | null;
  status: ArtifactStatus | "empty";
  lastRunAt: string | null;
};

export type HandoffDraft = {
  whatChanged: string;
  evidence: string;
  limitations: string;
  clientMessage: string;
  version: number;
};

export type WorkspaceEngineState = {
  schemaVersion: 1;
  sessionId: string;
  headVersion: number;
  headHash: string;
  companyName: string;
  artifacts: Record<string, ArtifactRecord>;
  /** path → dependent paths */
  dependents: Record<string, string[]>;
  requirements: RequirementState[];
  tests: TestState[];
  preview: PreviewState;
  messages: MessageRecord[];
  handoff: HandoffDraft;
  curveballText: string | null;
  curveballAcked: boolean;
  openTabs: string[];
  activePath: string | null;
  lastRuntime: {
    command: string;
    workspaceVersion: number;
    exitCode: number;
    ok: boolean;
    at: string;
    stdout: string;
    stderr: string;
  } | null;
  submitted: boolean;
  submissionHeadHash: string | null;
};

export type WorkspaceCommand = {
  commandId: string;
  type: WorkspaceCommandType;
  expectedHeadVersion: number;
  actor: ActorType;
  payload: Record<string, unknown>;
};

export type WorkspaceDomainEvent = {
  eventId: string;
  sessionId: string;
  sequenceNumber: number;
  eventType: WorkspaceEventType;
  actorType: ActorType;
  occurredAt: string;
  causationId: string;
  workspaceVersionBefore: number;
  workspaceVersionAfter: number;
  payload: Record<string, unknown>;
  payloadHash: string;
  schemaVersion: 1;
};

export type VersionConflictPayload = {
  path: string;
  base: string;
  local: string;
  remote: string;
};

export type DispatchResult =
  | {
      ok: true;
      state: WorkspaceEngineState;
      events: WorkspaceDomainEvent[];
      acknowledgedHeadVersion: number;
    }
  | {
      ok: false;
      error: string;
      code: "VERSION_CONFLICT" | "VALIDATION" | "FORBIDDEN" | "SUBMITTED" | "RUNTIME";
      state?: WorkspaceEngineState;
      conflict?: VersionConflictPayload;
    };

export const EVALUATOR_ONLY_PATHS = new Set([
  "canonical.json",
  "docs/data-integrity.md",
  ".fydell/scenario.json",
]);

export const CANDIDATE_SAFE_FACT_PREFIXES = [
  "The ops manager (Dana Whitfield)",
  "Dana and Priya want different deliverables",
  "Carrier-reported on-time rates",
];
