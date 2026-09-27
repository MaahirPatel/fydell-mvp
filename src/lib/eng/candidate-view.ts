import "server-only";
import type { Admin } from "./context";
import { getDrafts, listMessages, releaseUpdateIfDue } from "./attempts";
import { scenarioForVersionId } from "./scenario-versions";
import type { ScenarioDefinition } from "./scenarios/types";
import { effectiveDueAt, submissionWindow } from "./state";
import { getReceipt, type Receipt } from "./submissions";
import type { AttemptRow, InvitationRow, MessageRow, RoleSnapshot, UploadRow } from "./types";
import { listUploads } from "./uploads";

export interface CandidateView {
  serverNow: string;
  attempt: {
    id: string;
    status: AttemptRow["status"];
    consentedAt: string | null;
    preflightPassedAt: string | null;
    preflightRuntime: string | null;
    startedAt: string | null;
    dueAt: string | null;
    extensionMinutes: number;
    allowedMinutes: number;
    submittedAt: string | null;
    updateReleasedAt: string | null;
    updateAcknowledgedAt: string | null;
    window: "open" | "late" | "closed";
  };
  role: RoleSnapshot;
  scenario: {
    title: string;
    summary: string;
    candidateBrief: string[];
    initialRequirements: string[];
    resources: ScenarioDefinition["resources"];
    testCommands: ScenarioDefinition["testCommands"];
    setupCommands: ScenarioDefinition["setupCommands"];
    updateAfterMinutes: number;
    stack: string[];
    targetMinutes: number;
    submissionGraceMinutes: number;
    prerequisites: string[];
    supportedEnvironments: ScenarioDefinition["supportedEnvironments"];
    aiPolicy: string[];
    packaging: string[];
    accommodations: string[];
    knownIssues: string[];
    teammates: ScenarioDefinition["teammates"];
    handoffPrompts: ScenarioDefinition["handoffPrompts"];
    starterRoot: string;
  };
  update: { title: string; body: string; from: string } | null;
  messages: Pick<MessageRow, "id" | "seq" | "sender" | "teammate_id" | "body" | "client_msg_id" | "created_at">[];
  drafts: Record<string, { body: string; revision: number }>;
  uploads: Pick<UploadRow, "id" | "status" | "original_filename" | "byte_size" | "sha256" | "file_list" | "rejection_code" | "rejection_detail" | "created_at">[];
  receipt: Receipt | null;
}

export async function loadCandidateContext(db: Admin, attempt: AttemptRow): Promise<{ attempt: AttemptRow; scenario: ScenarioDefinition }> {
  const { definition } = await scenarioForVersionId(db, attempt.scenario_version_id);
  const current = await releaseUpdateIfDue(db, attempt, definition);
  return { attempt: current, scenario: definition };
}

export async function buildCandidateView(db: Admin, attemptRow: AttemptRow): Promise<CandidateView> {
  const { attempt, scenario } = await loadCandidateContext(db, attemptRow);
  const { data: inv } = await db.from("eng_invitations").select("role_snapshot").eq("id", attempt.invitation_id).single();
  const opened = attempt.status === "in_progress" || attempt.status === "submitted";
  const [messages, drafts, uploads, receipt] = await Promise.all([
    opened ? listMessages(db, attempt.id) : Promise.resolve([] as MessageRow[]),
    opened ? getDrafts(db, attempt.id) : Promise.resolve({}),
    opened ? listUploads(db, attempt.id) : Promise.resolve([] as UploadRow[]),
    attempt.status === "submitted" ? getReceipt(db, attempt.id) : Promise.resolve(null),
  ]);
  const due = effectiveDueAt(attempt);
  return {
    serverNow: new Date().toISOString(),
    attempt: {
      id: attempt.id,
      status: attempt.status,
      consentedAt: attempt.consented_at,
      preflightPassedAt: attempt.preflight_passed_at,
      preflightRuntime: attempt.preflight_runtime,
      startedAt: attempt.started_at,
      dueAt: due ? due.toISOString() : null,
      extensionMinutes: attempt.extension_minutes,
      allowedMinutes: attempt.allowed_minutes,
      submittedAt: attempt.submitted_at,
      updateReleasedAt: attempt.update_released_at,
      updateAcknowledgedAt: attempt.update_acknowledged_at,
      window: submissionWindow(attempt, scenario.submissionGraceMinutes),
    },
    role: (inv as Pick<InvitationRow, "role_snapshot">).role_snapshot,
    scenario: {
      title: scenario.title,
      summary: scenario.summary,
      candidateBrief: scenario.candidateBrief,
      initialRequirements: scenario.initialRequirements,
      resources: scenario.resources,
      testCommands: scenario.testCommands,
      setupCommands: scenario.setupCommands,
      updateAfterMinutes: scenario.requirementUpdate.releaseAfterMinutes,
      stack: scenario.stack,
      targetMinutes: scenario.targetMinutes,
      submissionGraceMinutes: scenario.submissionGraceMinutes,
      prerequisites: scenario.prerequisites,
      supportedEnvironments: scenario.supportedEnvironments,
      aiPolicy: scenario.aiPolicy,
      packaging: scenario.packaging,
      accommodations: scenario.accommodations,
      knownIssues: scenario.knownIssues,
      teammates: scenario.teammates,
      handoffPrompts: scenario.handoffPrompts,
      starterRoot: scenario.starterRoot,
    },
    update: attempt.update_released_at
      ? {
          title: scenario.requirementUpdate.title,
          body: scenario.requirementUpdate.body,
          from: scenario.teammates.find((t) => t.id === scenario.requirementUpdate.teammateId)?.name ?? "The team",
        }
      : null,
    messages: messages.map((m) => ({
      id: m.id,
      seq: m.seq,
      sender: m.sender,
      teammate_id: m.teammate_id,
      body: m.body,
      client_msg_id: m.client_msg_id,
      created_at: m.created_at,
    })),
    drafts,
    uploads: uploads.map((u) => ({
      id: u.id,
      status: u.status,
      original_filename: u.original_filename,
      byte_size: u.byte_size,
      sha256: u.sha256,
      file_list: u.file_list,
      rejection_code: u.rejection_code,
      rejection_detail: u.rejection_detail,
      created_at: u.created_at,
    })),
    receipt,
  };
}
