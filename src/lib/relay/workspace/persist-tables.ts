/**
 * Persist engine state into dedicated Supabase tables (017).
 * Service-role only — called from server dispatch.
 */
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { WorkspaceDomainEvent, WorkspaceEngineState } from "./types";
import { chainHash } from "./hash";

export async function upsertWorkspaceHead(state: WorkspaceEngineState) {
  const admin = createAdminSupabaseClient();
  await admin.from("workspace_heads").upsert({
    session_id: state.sessionId,
    head_version: state.headVersion,
    head_hash: state.headHash,
    company_name: state.companyName,
    submitted: state.submitted,
    submission_head_hash: state.submissionHeadHash,
    updated_at: new Date().toISOString(),
  });
}

export async function insertArtifactVersions(
  state: WorkspaceEngineState,
  changedPaths: string[],
  actorType: string
) {
  if (!changedPaths.length) return;
  const admin = createAdminSupabaseClient();
  const rows = changedPaths
    .map((path) => {
      const art = state.artifacts[path];
      if (!art) return null;
      return {
        session_id: state.sessionId,
        artifact_path: path,
        version: art.version,
        content: art.content,
        content_hash: art.contentHash,
        kind: art.kind,
        actor_type: actorType,
        chain_hash: chainHash(
          state.headHash,
          path,
          art.version,
          art.content,
          actorType,
          art.updatedAt
        ),
      };
    })
    .filter(Boolean);
  if (!rows.length) return;
  await admin.from("artifact_versions").upsert(rows, {
    onConflict: "session_id,artifact_path,version",
    ignoreDuplicates: true,
  });
}

export async function upsertRequirementStates(state: WorkspaceEngineState) {
  const admin = createAdminSupabaseClient();
  const rows = state.requirements.map((r) => ({
    session_id: state.sessionId,
    requirement_id: r.id,
    description: r.description,
    blocking: r.blocking,
    status: r.status,
    last_verified_at_workspace_version: r.lastVerifiedAtWorkspaceVersion,
    updated_at: new Date().toISOString(),
  }));
  await admin.from("requirement_states").upsert(rows);
}

export async function insertRuntimeRun(input: {
  sessionId: string;
  runKind: "command" | "tests" | "preview";
  command: string;
  workspaceVersion: number;
  exitCode: number;
  ok: boolean;
  stdout: string;
  stderr: string;
}): Promise<string | null> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("runtime_runs")
    .insert({
      session_id: input.sessionId,
      run_kind: input.runKind,
      command: input.command,
      workspace_version: input.workspaceVersion,
      exit_code: input.exitCode,
      ok: input.ok,
      stdout: input.stdout.slice(0, 200_000),
      stderr: input.stderr.slice(0, 50_000),
    })
    .select("id")
    .maybeSingle();
  return data?.id || null;
}

export async function ackCommandOutbox(sessionId: string, commandId: string, type: string, payload: Record<string, unknown>) {
  const admin = createAdminSupabaseClient();
  await admin.from("command_outbox").upsert({
    session_id: sessionId,
    command_id: commandId,
    command_type: type,
    payload,
    status: "acked",
    acked_at: new Date().toISOString(),
  });
}

export async function insertScenarioEvent(input: {
  sessionId: string;
  eventKey: string;
  utilityScore: number;
  candidateVisibleText: string;
  evaluatorOnly: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();
  await admin.from("scenario_events").upsert(
    {
      session_id: input.sessionId,
      event_key: input.eventKey,
      utility_score: input.utilityScore,
      candidate_visible_text: input.candidateVisibleText,
      evaluator_only: input.evaluatorOnly,
    },
    { onConflict: "session_id,event_key", ignoreDuplicates: true }
  );
}

export async function freezeSubmissionSnapshot(state: WorkspaceEngineState, evidenceSequenceEnd: number) {
  const admin = createAdminSupabaseClient();
  const artifactVersionMap: Record<string, number> = {};
  for (const [path, art] of Object.entries(state.artifacts)) {
    artifactVersionMap[path] = art.version;
  }
  await admin.from("submission_snapshots").upsert(
    {
      session_id: state.sessionId,
      submission_version: 1,
      workspace_head_hash: state.headHash,
      artifact_version_map: artifactVersionMap,
      message_sequence_end: state.messages.length,
      requirement_state: state.requirements,
      handoff_version: state.handoff.version,
      evidence_sequence_end: evidenceSequenceEnd,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "session_id,submission_version", ignoreDuplicates: true }
  );
  await admin
    .from("workspace_heads")
    .update({
      submitted: true,
      submission_head_hash: state.headHash,
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", state.sessionId);
}

export function changedPathsFromEvents(events: WorkspaceDomainEvent[]): string[] {
  const paths = new Set<string>();
  for (const e of events) {
    const p = e.payload.path;
    if (typeof p === "string") paths.add(p);
  }
  return [...paths];
}
