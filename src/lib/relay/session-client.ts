"use client";

/** Thin browser-side fetch wrappers shared by the /s/[token]/* relay session pages. */

export async function resolveSessionByToken(token: string): Promise<{ sessionId: string; status: string }> {
  const res = await fetch(`/api/fde/sessions/by-token/${token}`, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not resolve session");
  return data;
}

export async function fetchSession(sessionId: string) {
  const res = await fetch(`/api/fde/sessions/${sessionId}`, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not load session");
  return data;
}

export async function patchSession<T = Record<string, unknown>>(
  sessionId: string,
  action: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch(`/api/fde/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Action "${action}" failed`);
  return data as T;
}

/** Route a session status to the page in the /s/[token]/ flow that owns it. */
export function stageForStatus(status: string): "consent" | "preflight" | "workspace" | "submitted" | null {
  if (status === "accepted") return "consent";
  if (status === "preflight" || status === "ready") return "preflight";
  if (status === "active" || status === "recovering") return "workspace";
  if (["submitted", "processing", "receipt_ready", "technical_failure", "withdrawn"].includes(status)) {
    return "submitted";
  }
  return null;
}
