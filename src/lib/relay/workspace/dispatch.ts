import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { appendEvent, draftCustomerReply, getSessionForOwner } from "@/lib/fde/relay-session";
import { applyCommand, fileMapFromState, initFromFiles } from "./reducer";
import { toCandidateFileMap } from "./seed";
import type { DispatchResult, WorkspaceCommand, WorkspaceEngineState } from "./types";

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
  events: { eventType: string; payload: Record<string, unknown> }[]
) {
  const admin = createAdminSupabaseClient();
  const { data: row } = await admin
    .from("relay_sessions")
    .select("workspace_state, fde_user_id, status")
    .eq("id", sessionId)
    .maybeSingle();
  if (!row || row.fde_user_id !== userId) throw new Error("Forbidden");
  if (["submitted", "processing", "receipt_ready"].includes(row.status)) {
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
    let state = await loadOrInitEngine(sessionId, userId);

    // Enrich chat with server-side reply (no hidden facts beyond draftCustomerReply policy)
    if (command.type === "SEND_STAKEHOLDER_MESSAGE") {
      const text = String(command.payload.text || "");
      const session = await getSessionForOwner(sessionId, userId);
      const replyText = draftCustomerReply(text, session.canonicalFacts || []);
      command = {
        ...command,
        payload: {
          ...command.payload,
          replyText,
          replyAuthorName: "Dana Whitfield",
          replyAuthorRole: "Operations Manager",
        },
      };
    }

    if (command.type === "ACKNOWLEDGE_CURVEBALL" && !state.curveballText) {
      // allow ack only when text exists; set from payload if provided
      if (command.payload.text) {
        state = { ...state, curveballText: String(command.payload.text) };
      }
    }

    const { state: next, events } = applyCommand(state, command);
    await persistEngine(
      sessionId,
      userId,
      next,
      events.map((e) => ({ eventType: e.eventType, payload: { ...e.payload, engineEventId: e.eventId } }))
    );

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
      return { ok: false, error: "Version conflict — reload and retry.", code: "VERSION_CONFLICT", state };
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
