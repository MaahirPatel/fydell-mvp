import type {
  Diagnostics,
  ProvisionStepId,
  SyncPhase,
  VersionGate,
} from "./tauri";

/* ============================================================================
   Pure presentation logic for save/sync, provisioning, version gate, and
   diagnostics. No DOM, no Tauri runtime — unit-tested with node:test
   (see pure.test.ts).
   ========================================================================== */

/* ---------------- DESK-09: sync wording ----------------
   The checklist requires these states to be displayed accurately and never
   to say "Saved" ambiguously before persistence. */

export function syncPhaseLabel(phase: SyncPhase): string {
  switch (phase) {
    case "saved_local":
      return "Saved on this device";
    case "syncing":
      return "Syncing…";
    case "synced":
      return "Saved remotely";
    case "sync_failed":
      return "Sync failed";
    case "conflict":
      return "Sync conflict — review";
  }
}

/** One-line summary for the topbar, combining local + remote state. */
export function syncSummary(
  phase: SyncPhase,
  dirtyCount: number,
  lastError: string | null
): string {
  const label = syncPhaseLabel(phase);
  if (phase === "saved_local" && dirtyCount > 0) {
    return `${label} · ${dirtyCount} file${dirtyCount === 1 ? "" : "s"} not yet synced`;
  }
  if (phase === "sync_failed" && lastError) {
    return `${label} — ${lastError}`;
  }
  return label;
}

/* ---------------- DESK-06: provisioning steps ---------------- */

export const PROVISION_STEPS: Array<{ id: ProvisionStepId; label: string }> = [
  { id: "version", label: "Checking app version" },
  { id: "preflight", label: "Checking this device" },
  { id: "fetch", label: "Downloading assignment" },
  { id: "runtime", label: "Checking test runner" },
  { id: "start", label: "Starting your timer" },
  { id: "materialize", label: "Preparing workspace" },
];

export function provisionStepLabel(id: ProvisionStepId): string {
  return PROVISION_STEPS.find((s) => s.id === id)?.label ?? id;
}

/* ---------------- DESK-19: version gate ---------------- */

export function versionGateMessage(gate: VersionGate): string | null {
  if (gate.kind === "blocked") {
    return (
      `This app (v${gate.current}) is below the minimum version the platform ` +
      `supports (v${gate.minimum}). Update Fydell to start your assessment — ` +
      `your invite and progress are unaffected.`
    );
  }
  if (gate.kind === "current" && gate.update_available) {
    return `A newer Fydell version${gate.latest ? ` (v${gate.latest})` : ""} is available. ` +
      `You can finish this assessment first — updating never restarts it without your consent.`;
  }
  return null;
}

/* ---------------- DESK-20: diagnostics formatting ---------------- */

export function formatDiagnostics(d: Diagnostics): string {
  const lines = [
    `Fydell diagnostics`,
    `app_version: ${d.app_version}`,
    `os: ${d.os} arch: ${d.arch}`,
    `platform_host: ${d.platform_host}`,
    `session_status: ${d.session.status}`,
    `has_platform_session: ${d.session.has_platform_session}`,
    `server_revision: ${d.session.server_revision}`,
    `sync_phase: ${d.session.sync_phase}`,
    `unsynced_files: ${d.session.unsynced_files}`,
    `file_count: ${d.file_count}`,
    `event_count: ${d.event_count}`,
    `recent_errors:`,
  ];
  if (d.recent_errors.length === 0) {
    lines.push(`  (none)`);
  } else {
    for (const e of d.recent_errors) {
      lines.push(`  [${e.ts}] ${e.ref} (${e.code}): ${e.message}`);
    }
  }
  lines.push(
    `note: diagnostics never include your code, tokens, or message bodies`
  );
  return lines.join("\n");
}
