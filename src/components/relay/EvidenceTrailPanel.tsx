"use client";

import ExecutionThread, { type ThreadEvent } from "@/components/fde/ui/ExecutionThread";

export type WorkspaceEvent = {
  id: string;
  event_type: string;
  actor: string;
  payload: Record<string, unknown>;
  created_at: string;
};

const LABELS: Record<string, string> = {
  session_started: "Session started",
  file_saved: "Files saved",
  command_run: "Command run",
  customer_chat_message: "Customer chat message",
  curveball_revealed: "Curveball revealed",
  ai_patch_applied: "AI workspace patch applied",
  technical_issue_reported: "Technical issue reported",
  session_submitted: "Session submitted",
};

function describe(event: WorkspaceEvent): ThreadEvent {
  const label = LABELS[event.event_type] || event.event_type.replace(/_/g, " ");
  let detail: string | null = null;
  const payload = event.payload || {};

  if (event.event_type === "command_run") {
    const command = String(payload.command ?? "");
    const ok = payload.ok === true;
    detail = `${event.actor} ran "${command}" — ${ok ? "passed" : "failed"}`;
  } else if (event.event_type === "file_saved") {
    const paths = Array.isArray(payload.paths) ? (payload.paths as string[]) : [];
    detail = paths.length ? paths.join(", ") : null;
  } else if (event.event_type === "customer_chat_message") {
    detail = String(payload.text ?? "");
  } else if (event.event_type === "curveball_revealed") {
    detail = payload.key ? String(payload.key) : null;
  } else if (event.event_type === "ai_patch_applied") {
    detail = `${payload.file ?? ""} — ${payload.source === "report_join_fix" ? "report join fix" : "instruction note"}`;
  } else if (event.event_type === "technical_issue_reported") {
    detail = String(payload.description ?? "");
  }

  return { id: event.id, label: `${label} (${event.actor})`, detail, timestamp: event.created_at };
}

/** Read-only rendering of the actual recorded event timeline — the same
 * data evidence generation reads from. Nothing summarized or invented here. */
export default function EvidenceTrailPanel({ events }: { events: WorkspaceEvent[] }) {
  const threadEvents = events.map(describe).reverse();
  return (
    <div className="h-full min-h-0 overflow-y-auto p-3">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">
        Evidence trail ({events.length})
      </p>
      <ExecutionThread events={threadEvents} />
    </div>
  );
}
