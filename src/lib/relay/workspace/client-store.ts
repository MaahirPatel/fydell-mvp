"use client";

import type { DispatchResult, WorkspaceCommandType, WorkspaceEngineState } from "./types";
import { fileMapFromState } from "./reducer";

export type SaveUiState = "saving" | "saved" | "failed" | "offline" | "idle";

export async function fetchEngine(sessionId: string): Promise<{
  state: WorkspaceEngineState;
  acknowledgedHeadVersion: number;
  candidateFacts: string[];
}> {
  const res = await fetch(`/api/fde/sessions/${sessionId}/workspace`, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not load workspace");
  return {
    state: data.state,
    acknowledgedHeadVersion: data.acknowledgedHeadVersion,
    candidateFacts: data.candidateFacts || [],
  };
}

export async function dispatchCommand(
  sessionId: string,
  type: WorkspaceCommandType,
  expectedHeadVersion: number,
  payload: Record<string, unknown>
): Promise<DispatchResult> {
  const res = await fetch(`/api/fde/sessions/${sessionId}/workspace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commandId: `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      expectedHeadVersion,
      actor: "candidate",
      payload,
    }),
  });
  const data = (await res.json()) as DispatchResult | { error?: string; ok?: boolean };
  if (!("ok" in data) || data.ok === undefined) {
    return {
      ok: false,
      error: ("error" in data && data.error) || "Dispatch failed",
      code: "VALIDATION",
    };
  }
  return data as DispatchResult;
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
