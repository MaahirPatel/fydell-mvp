import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { appendEvent, draftCustomerReply, draftPriyaReply, getSessionForOwner } from "@/lib/fde/relay-session";
import { applyCommand, fileMapFromState, initFromFiles } from "./reducer";
import { toCandidateFileMap } from "./seed";
import type { DispatchResult, WorkspaceCommand, WorkspaceEngineState } from "./types";
import {
  ackCommandOutbox,
  changedPathsFromEvents,
  freezeSubmissionSnapshot,
  insertArtifactVersions,
  insertRuntimeRun,
  insertScenarioEvent,
  upsertRequirementStates,
  upsertWorkspaceHead,
} from "./persist-tables";
import { scoreEvent, selectAdaptiveEvent } from "./adaptive";
import { mergeText } from "./merge";

const ENGINE_KEY = "engine";

function readEngine(workspaceState: Record<string, unknown> | null | undefined): WorkspaceEngineState | null {
  const eng = workspaceState?.[ENGINE_KEY];
  if (eng && typeof eng === "object" && (eng as WorkspaceEngineState).schemaVersion === 1) {
    return eng as WorkspaceEngineState;
  }
  return null;
}

export async function loadOrInitEngine(sessionId: string, userId: string): Promise<WorkspaceEngineState> {
  const result = await getSessionForOwner(sessionId, userId);
  const ws = (result.session.workspace_state || {}) as Record<string, unknown>;
  const existing = readEngine(ws);
  if (existing) {
    return { ...existing, sessionId, companyName: existing.companyName || "Northbeam Logistics" };
  }
  const files = toCandidateFileMap((ws.files as Record<string, string>) || {});
  return initFromFiles(sessionId, files, "Northbeam Logistics");
}

export async function persistEngine(
  sessionId: string,
  userId: string,
  state: WorkspaceEngineState,
  events: { eventType: string; payload: Record<string, unknown> }[],
  meta?: { commandId?: string; commandType?: string; commandPayload?: Record<string, unknown> }
) {
  const admin = createAdminSupabaseClient();
  const { data: row } = await admin
    .from("relay_sessions")
    .select("workspace_state, fde_user_id, status")
    .eq("id", sessionId)
    .maybeSingle();
  if (!row || row.fde_user_id !== userId) throw new Error("Forbidden");
  if (["submitted", "processing", "receipt_ready"].includes(row.status) && !state.submitted) {
    throw new Error("Session already submitted");
  }

  const prev = (row.workspace_state || {}) as Record<string, unknown>;
  const files = fileMapFromState(state);
  const nextWs = {
    ...prev,
    files,
    savedAt: new Date().toISOString(),
    companyName: state.companyName,
    [ENGINE_KEY]: state,
    handoff: {
      whatBuilt: state.handoff.whatChanged,
      verification: state.handoff.evidence,
      limitations: state.handoff.limitations,
      clientMessage: state.handoff.clientMessage,
    },
  };

  const { error } = await admin
    .from("relay_sessions")
    .update({ workspace_state: nextWs, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);

  // Dedicated tables (017)
  try {
    await upsertWorkspaceHead(state);
    await upsertRequirementStates(state);
    if (meta?.commandId) {
      await ackCommandOutbox(
        sessionId,
        meta.commandId,
        meta.commandType || "UNKNOWN",
        meta.commandPayload || {}
      );
    }
  } catch {
    // Tables may lag in some envs — engine blob remains source of truth.
  }

  for (const ev of events) {
    await appendEvent(sessionId, userId, {
      actor: "candidate",
      eventType: ev.eventType,
      sourceSurface: "workspace_engine",
      payload: ev.payload,
    });
  }
}

export async function dispatchWorkspaceCommand(
  sessionId: string,
  userId: string,
  command: WorkspaceCommand
): Promise<DispatchResult> {
  try {
    // Idempotent replay: identical command_id already acked → return current head
    if (command.commandId) {
      const admin = createAdminSupabaseClient();
      const { data: prior } = await admin
        .from("command_outbox")
        .select("status")
        .eq("session_id", sessionId)
        .eq("command_id", command.commandId)
        .maybeSingle();
      if (prior?.status === "acked") {
        const state = await loadOrInitEngine(sessionId, userId);
        return { ok: true, state, events: [], acknowledgedHeadVersion: state.headVersion };
      }
    }

    let state = await loadOrInitEngine(sessionId, userId);

    if (command.type === "SEND_STAKEHOLDER_MESSAGE") {
      const text = String(command.payload.text || "");
      const recipient = String(command.payload.recipient || "dana");
      const session = await getSessionForOwner(sessionId, userId);
      const facts = session.canonicalFacts || [];
      const isPriya = recipient === "priya";
      const replyText = isPriya ? draftPriyaReply(text, facts) : draftCustomerReply(text, facts);
      command = {
        ...command,
        payload: {
          ...command.payload,
          replyText,
          replyAuthorName: isPriya ? "Priya Anand" : "Dana Whitfield",
          replyAuthorRole: isPriya ? "VP of Operations" : "Operations Manager",
        },
      };
    }

    // CAS conflict: attempt three-way merge for EDIT_FILE
    if (
      (command.type === "EDIT_FILE" || command.type === "ACCEPT_AI_PATCH") &&
      command.expectedHeadVersion !== state.headVersion
    ) {
      const path = String(command.payload.path || "");
      const remote = state.artifacts[path];
      const localContent = String(command.payload.content ?? "");
      const baseVersion = Number(command.payload.baseVersion);
      if (remote && remote.version !== baseVersion) {
        // Fetch prior version as base if possible
        const admin = createAdminSupabaseClient();
        const { data: baseRow } = await admin
          .from("artifact_versions")
          .select("content")
          .eq("session_id", sessionId)
          .eq("artifact_path", path)
          .eq("version", baseVersion)
          .maybeSingle();
        const base = baseRow?.content ?? remote.content;
        const merged = mergeText(base, localContent, remote.content);
        if (merged.ok === false) {
          return {
            ok: false,
            error: merged.reason,
            code: "VERSION_CONFLICT",
            state,
            conflict: {
              path,
              base: merged.base,
              local: merged.local,
              remote: merged.remote,
            },
          };
        }
        command = {
          ...command,
          expectedHeadVersion: state.headVersion,
          payload: {
            ...command.payload,
            content: merged.merged,
            baseVersion: remote.version,
            mergeStrategy: merged.strategy,
          },
        };
      } else {
        command = { ...command, expectedHeadVersion: state.headVersion };
      }
    }

    if (command.type === "ACKNOWLEDGE_CURVEBALL" && command.payload.text) {
      state = { ...state, curveballText: String(command.payload.text) };
    }

    const { state: next, events } = applyCommand(state, command);

    const paths = changedPathsFromEvents(events);
    try {
      await insertArtifactVersions(next, paths, command.actor);
    } catch {
      /* optional */
    }

    if (command.type === "APPLY_RUNTIME_RESULT") {
      const cmd = String(command.payload.command || "");
      const kind = /^(test|pytest|evals)$/i.test(cmd)
        ? "tests"
        : /^preview$/i.test(cmd)
          ? "preview"
          : "command";
      try {
        await insertRuntimeRun({
          sessionId,
          runKind: kind,
          command: cmd,
          workspaceVersion: Number(command.payload.workspaceVersion || next.headVersion),
          exitCode: Number(command.payload.exitCode ?? 1),
          ok: Boolean(command.payload.ok),
          stdout: String(command.payload.stdout || ""),
          stderr: String(command.payload.stderr || ""),
        });
      } catch {
        /* optional */
      }
    }

    if (command.type === "SUBMIT_SESSION") {
      try {
        await freezeSubmissionSnapshot(next, events.length);
      } catch {
        /* optional */
      }
    }

    await persistEngine(sessionId, userId, next, events.map((e) => ({
      eventType: e.eventType,
      payload: { ...e.payload, engineEventId: e.eventId },
    })), {
      commandId: command.commandId,
      commandType: command.type,
      commandPayload: command.payload,
    });

    return {
      ok: true,
      state: next,
      events,
      acknowledgedHeadVersion: next.headVersion,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Dispatch failed";
    if (msg === "VERSION_CONFLICT" || (err as { code?: string }).code === "VERSION_CONFLICT") {
      const state = await loadOrInitEngine(sessionId, userId);
      return { ok: false, error: "Version conflict — resolve merge.", code: "VERSION_CONFLICT", state };
    }
    if (msg === "SESSION_SUBMITTED" || /already submitted/i.test(msg)) {
      return { ok: false, error: msg, code: "SUBMITTED" };
    }
    return { ok: false, error: msg, code: "VALIDATION" };
  }
}

export async function applyRuntimeToEngine(
  sessionId: string,
  userId: string,
  result: {
    command: string;
    ok: boolean;
    exitCode: number;
    stdout: string;
    stderr: string;
    workspaceVersion: number;
  }
): Promise<DispatchResult> {
  const state = await loadOrInitEngine(sessionId, userId);
  const command: WorkspaceCommand = {
    commandId: `runtime_${Date.now()}`,
    type: "APPLY_RUNTIME_RESULT",
    expectedHeadVersion: state.headVersion,
    actor: "system",
    payload: { ...result },
  };
  return dispatchWorkspaceCommand(sessionId, userId, command);
}

/** Adaptive curveball selection — server only; returns candidate-visible text. */
export async function maybeTriggerAdaptiveEvent(
  sessionId: string,
  userId: string,
  ctx: {
    elapsedRatio: number;
    remainingMinutes: number;
  }
): Promise<{ triggered: boolean; text?: string; key?: string }> {
  const state = await loadOrInitEngine(sessionId, userId);
  const admin = createAdminSupabaseClient();
  const { data: prior } = await admin
    .from("scenario_events")
    .select("event_key")
    .eq("session_id", sessionId);
  const already = (prior || []).map((r) => r.event_key as string);
  if (state.curveballText || already.length) {
    return { triggered: false };
  }

  const selected = selectAdaptiveEvent({
    elapsedRatio: ctx.elapsedRatio,
    alreadyTriggered: already,
    remainingMinutes: ctx.remainingMinutes,
    signals: {
      openedData: state.openTabs.some((p) => p.includes(".csv")) || Object.values(state.artifacts).some((a) => a.path.endsWith(".csv") && a.version > 1),
      messagedOrOpenedBrief:
        state.messages.some((m) => m.actor === "candidate") ||
        state.openTabs.some((p) => p.includes("brief") || p.includes("README")),
      editedCode: Object.values(state.artifacts).some((a) => a.path.startsWith("src/") && a.version > 1),
      ranTests: state.tests.some((t) => t.status === "PASS" || t.status === "FAIL"),
    },
  });
  if (!selected) return { triggered: false };

  await insertScenarioEvent({
    sessionId,
    eventKey: selected.key,
    utilityScore: scoreEvent(selected),
    candidateVisibleText: selected.candidateVisibleText,
    evaluatorOnly: selected.evaluatorOnly,
  });

  const next = {
    ...state,
    curveballText: selected.candidateVisibleText,
    curveballAcked: false,
  };
  await persistEngine(sessionId, userId, next, [
    {
      eventType: "curveball.triggered",
      payload: { key: selected.key, text: selected.candidateVisibleText },
    },
  ]);

  return { triggered: true, text: selected.candidateVisibleText, key: selected.key };
}
