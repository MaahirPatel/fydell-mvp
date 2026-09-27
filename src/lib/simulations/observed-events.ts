/**
 * Disclosed observed-event taxonomy (SIM-08).
 *
 * The simulation captures ONLY the event types listed here. Capture is
 * limited to in-app, candidate-visible actions: saves, test runs, issue
 * (requirement-change) exposure, messages, and submitted artifacts.
 *
 * Explicitly NOT captured (and never inferred from):
 *  - file focus / open duration (does not prove reading or root-cause discovery)
 *  - pauses / idle time (does not prove confusion)
 *  - anything outside the app (external editors, browsers, AI tools) except
 *    what the candidate self-reports via the disclosure control
 *
 * The candidate-reportable allowlist lives here so the events route and the
 * tests share one source of truth.
 */

export interface EventTaxonomyEntry {
  type: string;
  /** Who may emit it. */
  actor: "candidate" | "system" | "stakeholder";
  /** Plain-language description of what is captured. Shown in disclosures. */
  captures: string;
}

export const DISCLOSED_EVENT_TAXONOMY: EventTaxonomyEntry[] = [
  { type: "session_started", actor: "system", captures: "Server timestamp when the timed assessment began." },
  { type: "resource_opened", actor: "candidate", captures: "Which workspace resource was opened." },
  { type: "resource_downloaded", actor: "candidate", captures: "Which resource was downloaded." },
  { type: "task_completed", actor: "candidate", captures: "Which task step was marked complete." },
  { type: "task_reopened", actor: "candidate", captures: "Which task step was reopened." },
  { type: "notes_edited", actor: "candidate", captures: "That notes were edited (content stays in the attempt)." },
  { type: "deliverable_field_edited", actor: "candidate", captures: "Which deliverable field was edited." },
  { type: "workspace_action", actor: "candidate", captures: "A workspace tool action (sort, filter, flag, calculate)." },
  { type: "curveball_acknowledged", actor: "candidate", captures: "The candidate acknowledged the requirement update." },
  { type: "table_sorted", actor: "candidate", captures: "A table was sorted in the workbench." },
  { type: "table_filtered", actor: "candidate", captures: "A table was filtered in the workbench." },
  { type: "row_flagged", actor: "candidate", captures: "A row was flagged in the workbench." },
  { type: "ticket_selected", actor: "candidate", captures: "A ticket was selected." },
  { type: "step_toggled", actor: "candidate", captures: "A checklist step was toggled." },
  { type: "rule_reviewed", actor: "candidate", captures: "A rule was reviewed." },
  { type: "decision_selected", actor: "candidate", captures: "A structured decision was chosen." },
  { type: "evidence_selected", actor: "candidate", captures: "A piece of evidence was selected." },
  { type: "deliverable_revised", actor: "candidate", captures: "The deliverable was revised." },
  { type: "message_sent", actor: "candidate", captures: "A message the candidate sent (content retained)." },
  { type: "message_received", actor: "stakeholder", captures: "A teammate reply delivered to the candidate." },
  { type: "proactive_message_delivered", actor: "stakeholder", captures: "A scripted teammate message delivered." },
  { type: "curveball_presented", actor: "system", captures: "Server timestamp when the requirement update was shown." },
  { type: "submission_confirmed", actor: "system", captures: "Server timestamp of the confirmed submission." },
  { type: "connectivity_interrupted", actor: "candidate", captures: "Client-reported loss of connectivity (server-timestamped)." },
  { type: "connectivity_restored", actor: "candidate", captures: "Client-reported connectivity recovery (server-timestamped)." },
  { type: "hint_exposed", actor: "system", captures: "Which authored hint/fact was shown to the candidate." },
  { type: "teammate_service_degraded", actor: "system", captures: "The teammate reply service failed over to scripted replies." },
  { type: "teammate_service_outage", actor: "system", captures: "Sustained teammate-service outage; attempt paused/extended per policy." },
  { type: "teammate_service_recovered", actor: "system", captures: "Teammate service recovered; pause lifted." },
  { type: "deadline_extended", actor: "system", captures: "Server timestamped deadline extension with the recorded reason (fair response window, outage pause, or accommodation)." },
];

/**
 * Event types the candidate client is allowed to report. Everything else is
 * server- or stakeholder-emitted. This is the single allowlist the events
 * route enforces.
 */
export const ALLOWED_CANDIDATE_EVENTS: ReadonlySet<string> = new Set([
  "resource_opened",
  "resource_downloaded",
  "task_completed",
  "task_reopened",
  "notes_edited",
  "deliverable_field_edited",
  "workspace_action",
  "curveball_acknowledged",
  "connectivity_interrupted",
  "connectivity_restored",
  // v2 workbench semantic events
  "table_sorted",
  "table_filtered",
  "row_flagged",
  "ticket_selected",
  "step_toggled",
  "rule_reviewed",
  "decision_selected",
  "evidence_selected",
  "deliverable_revised",
]);

/**
 * Things we explicitly do NOT capture. If any of these ever appears in a
 * capture path, it is a bug. Tests assert the allowlist never includes them.
 */
export const NEVER_CAPTURED: ReadonlySet<string> = new Set([
  "file_focus_duration",
  "file_read_proof",
  "idle_time",
  "pause_means_confusion",
  "external_editor_usage",
  "external_browser_usage",
  "external_ai_tool_usage",
  "keystroke_biometrics",
  "window_focus_tracking",
]);

/**
 * Guards the capture boundary: the candidate allowlist must be a subset of
 * the disclosed taxonomy, and must not contain anything from NEVER_CAPTURED.
 */
export function validateCaptureBoundary(
  allowed: ReadonlySet<string> | Set<string> = ALLOWED_CANDIDATE_EVENTS
): string[] {
  const errors: string[] = [];
  const disclosed = new Set(DISCLOSED_EVENT_TAXONOMY.map((e) => e.type));
  for (const t of allowed) {
    if (!disclosed.has(t)) errors.push(`Captured event "${t}" is not in the disclosed taxonomy`);
    if (NEVER_CAPTURED.has(t)) errors.push(`Banned capture "${t}" is in the allowlist`);
  }
  return errors;
}

/** Candidate-facing disclosure copy: what is and is not observed. */
export const TELEMETRY_DISCLOSURE: string =
  "During the assessment we record: when you start and submit (server time), " +
  "which workspace resources you open, your workspace actions (sorts, filters, flags), " +
  "your messages to teammates and their replies, when requirement updates are shown and " +
  "acknowledged, and connectivity interruptions. We do not record how long you look at " +
  "a file, idle time, or anything you do outside this app. A pause never counts as " +
  "confusion, and opening a file never counts as understanding it.";
