import type {
  ChatMessage,
  Diagnostics,
  InboxInvitation,
  PassportView,
  ProvisionStepId,
  StakeholderView,
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

/* ---------------- invitation inbox ----------------
   Expiry wording stays factual: whole days/hours remaining, never a fake
   countdown to the second (the server is authoritative on expiry). */

export function invitationExpiryLabel(expiresAt: string, nowMs: number = Date.now()): string {
  const ms = new Date(expiresAt).getTime() - nowMs;
  if (!Number.isFinite(ms) || ms <= 0) return "Expired";
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "Expires within the hour";
  if (hours < 24) return `Expires in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Expires tomorrow";
  if (days < 30) return `Expires in ${days} days`;
  return `Expires ${new Date(expiresAt).toLocaleDateString()}`;
}

export function invitationUrgency(expiresAt: string, nowMs: number = Date.now()): "soon" | "normal" {
  const ms = new Date(expiresAt).getTime() - nowMs;
  return Number.isFinite(ms) && ms > 0 && ms < 48 * 3_600_000 ? "soon" : "normal";
}

/* ---------------- passport profile completeness ----------------
   Honest data-completeness meter: what share of the profile's evidence
   inputs exist. Never a quality score — a thin profile says nothing about
   ability (the empty-passport rule from the platform). */

export interface CompletenessStep {
  id: string;
  label: string;
  done: boolean;
  hint: string;
}

export function profileCompleteness(p: PassportView | null): {
  percent: number;
  steps: CompletenessStep[];
} {
  const steps: CompletenessStep[] = [
    {
      id: "identity",
      label: "Name your profile",
      done: p != null && p.displayName.trim().length > 0,
      hint: "Add how you'd like employers to see you",
    },
    {
      id: "project",
      label: "Add a repository",
      done: (p?.projects.length ?? 0) > 0,
      hint: "Connect a GitHub repo — Fydell extracts evidence from real work",
    },
    {
      id: "contribution",
      label: "Describe your contribution",
      done: (p?.projects ?? []).some(
        (pr) => (pr.contributionStatement ?? "").trim().length > 0
      ),
      hint: "One honest paragraph about what you actually did",
    },
    {
      id: "capabilities",
      label: "Earn capability evidence",
      done: (p?.capabilities.length ?? 0) > 0,
      hint: "Capabilities appear as Fydell analyzes your projects",
    },
  ];
  const done = steps.filter((s) => s.done).length;
  return { percent: Math.round((done / steps.length) * 100), steps };
}

/** Next incomplete step, for the dashboard nudge. Null when complete. */
export function nextCompletenessStep(p: PassportView | null): CompletenessStep | null {
  return profileCompleteness(p).steps.find((s) => !s.done) ?? null;
}

/** Stable key for an invitation row. */
export function invitationKey(inv: InboxInvitation): string {
  return inv.id;
}

/* ---------------- chat merge + display ----------------
   The Rust backend merges on refresh too; the frontend merge keeps the
   polling view stable between refreshes (dedup by id, chronological). */

export function mergeChatMessagesView(
  prev: ChatMessage[],
  incoming: ChatMessage[]
): ChatMessage[] {
  const seen = new Set(prev.map((m) => m.id));
  const next = [...prev];
  for (const m of incoming) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      next.push(m);
    }
  }
  next.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return next;
}

export function chatSenderName(
  m: ChatMessage,
  stakeholders: StakeholderView[]
): string {
  if (m.sender === "candidate") return "You";
  if (m.stakeholderId) {
    const s = stakeholders.find((st) => st.id === m.stakeholderId);
    if (s) return s.name;
  }
  return "Team";
}

export function formatChatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/* ---------------- DESK-12/13: test run wording ----------------
   Where the tests ran, what the result means, and whether it still reflects
   the files on disk. Infrastructure problems are never worded as results
   about the candidate's code. */

export function testRunIntro(mode: "remote" | "local"): string {
  return mode === "remote"
    ? "Runs the provided tests, plus any test files you add under tests/, on Fydell's isolated test runner against your saved files. Nothing runs on this computer."
    : "Runs the provided tests on this computer.";
}

export interface TestRunHeadline {
  tone: "ok" | "fail" | "neutral";
  text: string;
}

export function testRunHeadline(r: {
  mode: "remote" | "local";
  status: string;
  passed: number | null;
  failed: number | null;
  errors: number | null;
  status_reason: string | null;
}): TestRunHeadline {
  if (r.mode === "remote") {
    if (r.status === "infrastructure_error" || r.status === "not_configured") {
      return { tone: "neutral", text: r.status_reason ?? "The test runner is unavailable. Your work is saved; this is not a result about your code." };
    }
    if (r.status === "indeterminate") {
      return { tone: "fail", text: r.status_reason ?? "The tests could not produce a result. Check the output." };
    }
  } else if (r.status !== "completed") {
    const reason: Record<string, string> = {
      timeout: "The run hit the time limit.",
      output_limit: "The run produced too much output and was stopped.",
      runtime_error: "The test runner could not run.",
    };
    return { tone: "fail", text: reason[r.status] ?? `Run ended: ${r.status}` };
  }
  const failed = (r.failed ?? 0) + (r.errors ?? 0);
  const passed = r.passed ?? 0;
  if (failed === 0 && passed === 0) return { tone: "neutral", text: "No tests ran." };
  return failed === 0
    ? { tone: "ok", text: `All ${passed} passed` }
    : { tone: "fail", text: `${failed} failing, ${passed} passed` };
}

/** DESK-12: the label shown once the workspace has changed since the run. */
export const STALE_RESULTS_LABEL =
  "Results from an earlier version. Run the tests again to check your latest saved changes.";

export function isStaleResult(runFingerprint: string | null, currentFingerprint: string | null): boolean {
  return Boolean(runFingerprint && currentFingerprint && runFingerprint !== currentFingerprint);
}
