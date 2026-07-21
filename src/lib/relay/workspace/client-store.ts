"use client";

import type { DispatchResult, WorkspaceCommandType, WorkspaceEngineState } from "./types";
import { fileMapFromState } from "./reducer";
import { ackCommand, enqueueCommand, failCommand, listPending } from "./outbox";

export { listPending };

export type SaveUiState = "saving" | "saved" | "failed" | "offline" | "idle";

export async function fetchEngine(sessionId: string): Promise<{
  state: WorkspaceEngineState;
  acknowledgedHeadVersion: number;
  candidateFacts: string[];
  curveballText?: string | null;
}> {
  const res = await fetch(`/api/fde/sessions/${sessionId}/workspace`, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not load workspace");
  return {
    state: data.state,
    acknowledgedHeadVersion: data.acknowledgedHeadVersion,
    candidateFacts: data.candidateFacts || [],
    curveballText: data.curveballText,
  };
}

export async function dispatchCommand(
  sessionId: string,
  type: WorkspaceCommandType,
  expectedHeadVersion: number,
  payload: Record<string, unknown>
): Promise<DispatchResult> {
  const commandId = `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    await enqueueCommand({
      commandId,
      sessionId,
      type,
      expectedHeadVersion,
      payload,
      actor: "candidate",
      enqueuedAt: Date.now(),
      status: "pending",
    });
  } catch {
    // IndexedDB optional in locked-down browsers — continue with network
  }

  const res = await fetch(`/api/fde/sessions/${sessionId}/workspace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commandId,
      type,
      expectedHeadVersion,
      actor: "candidate",
      payload,
    }),
  });
  const data = (await res.json()) as DispatchResult | { error?: string; ok?: boolean };
  if (!("ok" in data) || data.ok === undefined) {
    try {
      await failCommand(commandId);
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      error: ("error" in data && data.error) || "Dispatch failed",
      code: "VALIDATION",
    };
  }
  if (data.ok) {
    try {
      await ackCommand(commandId);
    } catch {
      /* ignore */
    }
  } else {
    try {
      await failCommand(commandId);
    } catch {
      /* ignore */
    }
  }
  return data as DispatchResult;
}

/** Replay pending outbox commands in order after reconnect. */
export async function replayOutbox(sessionId: string): Promise<DispatchResult | null> {
  let pending: Awaited<ReturnType<typeof listPending>> = [];
  try {
    pending = await listPending(sessionId);
  } catch {
    return null;
  }
  let last: DispatchResult | null = null;
  for (const cmd of pending) {
    last = await dispatchCommand(
      sessionId,
      cmd.type as WorkspaceCommandType,
      cmd.expectedHeadVersion,
      cmd.payload
    );
    if (!last.ok && "code" in last && last.code === "VERSION_CONFLICT") break;
  }
  return last;
}

export async function reportRuntimeResult(
  sessionId: string,
  result: {
    command: string;
    ok: boolean;
    exitCode: number;
    stdout: string;
    stderr: string;
    workspaceVersion: number;
  }
): Promise<DispatchResult> {
  const res = await fetch(`/api/fde/sessions/${sessionId}/workspace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "runtime_result", ...result }),
  });
  return (await res.json()) as DispatchResult;
}

export async function adaptiveTick(
  sessionId: string,
  elapsedRatio: number,
  remainingMinutes: number
): Promise<{ text?: string; state?: WorkspaceEngineState }> {
  const res = await fetch(`/api/fde/sessions/${sessionId}/workspace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "adaptive_tick", elapsedRatio, remainingMinutes }),
  });
  const data = await res.json();
  return {
    text: data.adaptive?.text,
    state: data.state,
  };
}

export function filesForRuntime(state: WorkspaceEngineState): Record<string, string> {
  return fileMapFromState(state);
}

export function saveLabel(
  localHead: number,
  ackHead: number,
  failed: boolean,
  offline: boolean
): { state: SaveUiState; label: string } {
  if (offline) return { state: "offline", label: "Offline · changes queued" };
  if (failed) return { state: "failed", label: "Save failed · Retry" };
  if (localHead > ackHead) return { state: "saving", label: "Saving…" };
  if (ackHead > 0) return { state: "saved", label: "Saved just now" };
  return { state: "idle", label: "Ready" };
}
