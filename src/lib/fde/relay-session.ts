import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { audit, hashInviteToken } from "@/lib/fde/lifecycle";
import { enqueueAction } from "@/lib/fde/action-inbox";
import type { FileMap } from "@/lib/relay/execution-provider";
import {
  analyzeSession,
  POLICY_VERSION,
  FORMULA_VERSION,
  type SessionAnalysis,
} from "@/lib/fde/evidence";
import { resolveScenarioForSession } from "@/lib/relay/variants/resolve";
import {
  applyBlueprintOverlay,
  extractBlueprintFromCustomerContext,
} from "@/lib/fde/generator";
import canonicalRaw from "../../../scenarios/project-relay/canonical.json";

type AdminClient = ReturnType<typeof createAdminSupabaseClient>;

export type RelayActor = "candidate" | "system" | "customer_simulator" | "ai_assistant" | "operator";

export type RelayEventRow = {
  id: string;
  session_id: string;
  sequence_number: number;
  actor: RelayActor;
  event_type: string;
  source_surface: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type RelaySessionRow = {
  id: string;
  mission_id: string;
  invitation_id: string | null;
  fde_user_id: string;
  variant_key: string;
  status: string;
  started_at: string | null;
  ends_at: string | null;
  submitted_at: string | null;
  last_heartbeat_at: string | null;
  technical_interruption_seconds: number;
  workspace_state: Record<string, unknown> | null;
  submission_snapshot: Record<string, unknown> | null;
  curveball_key: string | null;
  failure_code: string | null;
  failure_detail: string | null;
  billable: boolean;
  /** scored = production; preview/demonstration excluded from hiring analytics */
  attempt_kind?: "scored" | "preview" | "demonstration";
  created_at: string;
  updated_at: string;
};

export type ChecklistItem = { id: string; label: string; done: boolean };

export type WorkspaceNotes = {
  knowledge: string;
  unknowns: string;
  risks: string;
  checklist: ChecklistItem[];
};

export type WorkspaceState = {
  files: FileMap;
  plan: Record<string, string>;
  handoff: Record<string, string>;
  /** Candidate-maintained working notes — "what I know" / "what I still
   * don't know" / "open risks" — plus a short self-tracked ship checklist. */
  notes: WorkspaceNotes;
  savedAt?: string;
  /** Which Relay scenario release seeded this session's files — always
   * `"project-relay@known-good"` unless RELAY_ACTIVE_VARIANT_ID names an
   * ops-approved, validated variant (see src/lib/relay/variants/resolve.ts). */
  scenarioReleaseId?: string;
  /** Employer-generated blueprint overlays applied at session start. */
  blueprintId?: string;
  templateLabel?: string;
  curveballNarrative?: string;
  companyName?: string;
  /** Belt-and-suspenders when DB column is unavailable; mirrors attempt_kind. */
  attemptKind?: "scored" | "preview" | "demonstration";
};

export const EMPTY_WORKSPACE_NOTES: WorkspaceNotes = {
  knowledge: "",
  unknowns: "",
  risks: "",
  checklist: [],
};

type ScenarioCanonical = {
  templateId: string;
  version: string;
  label: string;
  durationMinutes: number;
  curveballs: string[];
  canonicalFacts: string[];
  /** Candidate-safe facts for Brief UI — never answer-key spoilers. */
  candidateVisibleFacts?: string[];
};

const ACTIVE_STATES = ["active", "recovering"];
const OPEN_STATES = ["preflight", "ready", "active", "recovering"];
const HEARTBEAT_GAP_MS = 90_000;

const CURVEBALL_COPY: Record<string, string> = {
  board_meeting_thursday:
    "The board meeting just got pulled forward to Thursday. Leadership wants your delay numbers a day earlier than planned — re-prioritize your remaining time.",
  vp_wants_root_cause:
    "The VP of Operations just jumped into the thread asking for a root-cause report, not just a dashboard. She and the ops manager now want different deliverables and haven't reconciled that themselves — you need to.",
  carrier_data_unreliable:
    "One of the carriers' self-reported on-time rates doesn't match what the shipment data actually shows. Carrier-provided metrics may not be reliable — verify before you cite them in anything.",
};

export function getScenarioCanonical(): ScenarioCanonical {
  return canonicalRaw as ScenarioCanonical;
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-testable, no I/O)
// ---------------------------------------------------------------------------

export function computeEndsAt(startedAt: Date, durationMinutes: number): Date {
  return new Date(startedAt.getTime() + durationMinutes * 60_000);
}

export function pickCurveball(curveballs: string[], seed: string): string {
  if (curveballs.length === 0) return "";
  let hash = 0;
  for (const ch of seed) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return curveballs[hash % curveballs.length];
}

export function curveballCopy(key: string): string {
  return CURVEBALL_COPY[key] || key;
}

/**
 * Pure idempotency decision for submit. Given the session's current status and
 * any already-frozen snapshot, decide whether a new snapshot should be frozen
 * or whether the existing frozen snapshot should be returned unchanged.
 */
export function decideSubmission(
  status: string,
  existingSnapshot: Record<string, unknown> | null,
  candidateSnapshot: Record<string, unknown>
): { shouldFreeze: boolean; snapshot: Record<string, unknown> } {
  const alreadyFrozen = ["submitted", "processing", "receipt_ready"].includes(status);
  if (alreadyFrozen && existingSnapshot) {
    return { shouldFreeze: false, snapshot: existingSnapshot };
  }
  return { shouldFreeze: true, snapshot: candidateSnapshot };
}

export function computeHeartbeatGapSeconds(
  lastHeartbeatAt: string | null,
  now: Date,
  status: string
): number {
  if (!lastHeartbeatAt || status !== "active") return 0;
  const gapMs = now.getTime() - new Date(lastHeartbeatAt).getTime();
  if (gapMs <= HEARTBEAT_GAP_MS) return 0;
  return Math.round(gapMs / 1000);
}

/**
 * Bounded customer-chat reply generator for the Northbeam Logistics
 * scenario — never invents facts beyond canonical.json's `canonicalFacts`.
 * Vague by default (mirrors the client's underspecified ask); only reveals
 * the stakeholder conflict, the ID-format data-quality hint, or the carrier
 * data-reliability hint when the candidate's message actually probes for it.
 */
export function draftCustomerReply(candidateMessage: string, facts: string[]): string {
  const text = candidateMessage.toLowerCase();
  const fallback =
    facts.find((f) => /ops manager|dana/i.test(f)) ||
    facts[0] ||
    "We just need better visibility into shipment delays — use your judgment.";

  if (/stakeholder|priorit|dashboard|root.?cause|root cause|priya|\bvp\b|conflict|which one|what should i build|dana.*priya|priya.*dana/.test(text)) {
    const dashboardFact = facts.find((f) => /dashboard|dana/i.test(f));
    const rootCauseFact = facts.find((f) => /root-cause|root cause|priya/i.test(f));
    return (
      "Honestly, we haven't sorted that out between us. " +
      `${dashboardFact || "Dana wants an operational dashboard she can check every morning."} ` +
      `${rootCauseFact || "Priya wants a defensible root-cause report for the board."} ` +
      "Pick something and tell us why — we'll adjust if it's wrong."
    );
  }

  if (/id format|leading zero|shipment.?id|manual (sheet|tracking)|data quality|mismatch|silently drop|join/.test(text)) {
    return (
      facts.find((f) => /id format|leading zero|manual/i.test(f)) ||
      "The manual tracking sheet was hand-kept by ops and never checked against the TMS export — I wouldn't assume the IDs line up cleanly."
    );
  }

  if (/carrier|on.?time rate|reliable|self.?report/.test(text)) {
    return (
      facts.find((f) => /carrier/i.test(f)) ||
      "Take the carriers' own on-time numbers with a grain of salt — we've never actually checked them against our delivery data."
    );
  }

  if (/board|thursday|deadline|earlier|timeline/.test(text)) {
    return (
      facts.find((f) => /board|thursday/i.test(f)) ||
      "Just a heads up, the board meeting is Thursday now — a day earlier than we'd said."
    );
  }

  return fallback;
}

export type NewFinding = {
  dimension: string;
  observation: string;
  interpretation: string;
  confidence: "low" | "medium" | "high";
  limitation: string;
  event_ids: string[];
  artifact_ids: string[];
};

/** Simple rule-based evidence generation from the recorded event timeline. */
export function buildFindingsFromEvents(
  events: RelayEventRow[],
  session: Pick<RelaySessionRow, "curveball_key" | "technical_interruption_seconds">
): NewFinding[] {
  const findings: NewFinding[] = [];

  const commandEvents = events.filter((e) => e.event_type === "command_run");
  const testRuns = commandEvents.filter((e) => {
    const cmd = String((e.payload as { command?: string })?.command || "");
    return cmd === "test" || cmd === "pytest";
  });
  const lastTestPassed = testRuns.length > 0 && Boolean((testRuns[testRuns.length - 1].payload as { ok?: boolean })?.ok);

  const chatEvents = events.filter((e) => e.event_type === "customer_chat_message" && e.actor === "candidate");
  const editEvents = events.filter((e) => e.event_type === "file_saved");
  const curveballEvents = events.filter((e) => e.event_type === "curveball_revealed");
  const postCurveballActivity =
    curveballEvents.length > 0
      ? events.filter((e) => e.sequence_number > curveballEvents[0].sequence_number).length - 1
      : 0;

  findings.push({
    dimension: "technical_execution",
    observation:
      testRuns.length > 0
        ? `Ran the test command ${testRuns.length} time(s); the most recent run ${lastTestPassed ? "passed" : "did not pass"}.`
        : "Never ran the test command before submitting.",
    interpretation:
      testRuns.length > 0
        ? lastTestPassed
          ? "Validated work before submission."
          : "Attempted validation but did not reach a passing state before submitting."
        : "No evidence of self-verification prior to submission.",
    confidence: testRuns.length > 0 ? "medium" : "low",
    limitation: "Derived only from recorded command_run events; does not assess code quality directly.",
    event_ids: testRuns.map((e) => e.id),
    artifact_ids: [],
  });

  findings.push({
    dimension: "iteration_and_editing",
    observation: `Saved file edits ${editEvents.length} time(s) across the session.`,
    interpretation:
      editEvents.length > 3
        ? "Iterated on the solution across multiple saves rather than submitting a first draft."
        : "Limited visible iteration in the tracked workspace.",
    confidence: "low",
    limitation: "Counts recorded save events only; cannot see edits made outside the tracked workspace.",
    event_ids: editEvents.map((e) => e.id),
    artifact_ids: [],
  });

  findings.push({
    dimension: "customer_communication",
    observation:
      chatEvents.length > 0
        ? `Sent ${chatEvents.length} message(s) in the customer chat channel.`
        : "Did not use the customer chat channel.",
    interpretation:
      chatEvents.length > 0
        ? "Engaged the customer contact during the mission."
        : "Worked without checking in with the customer contact.",
    confidence: "medium",
    limitation: "Message content quality is not scored here — only presence and count.",
    event_ids: chatEvents.map((e) => e.id),
    artifact_ids: [],
  });

  if (session.curveball_key) {
    findings.push({
      dimension: "handling_ambiguity",
      observation:
        curveballEvents.length > 0
          ? `Curveball "${session.curveball_key}" was revealed and ${Math.max(postCurveballActivity, 0)} further action(s) followed.`
          : `Curveball "${session.curveball_key}" was assigned but never revealed in this session.`,
      interpretation:
        curveballEvents.length > 0 && postCurveballActivity > 0
          ? "Continued working and adjusted after the mid-session change."
          : "Limited observable response to the mid-session change.",
      confidence: "low",
      limitation: "Heuristic based on event counts after the curveball marker, not on content review.",
      event_ids: curveballEvents.map((e) => e.id),
      artifact_ids: [],
    });
  }

  findings.push({
    dimension: "session_integrity",
    observation:
      session.technical_interruption_seconds > 0
        ? `${session.technical_interruption_seconds}s of heartbeat gaps were recorded during the session.`
        : "No heartbeat gaps were recorded during the session.",
    interpretation:
      session.technical_interruption_seconds > 90
        ? "The session had a notable interruption — weigh timing evidence accordingly."
        : "The session ran without significant technical interruption.",
    confidence: "high",
    limitation: "Heartbeat gaps can reflect network issues rather than candidate behavior.",
    event_ids: [],
    artifact_ids: [],
  });

  return findings;
}

// ---------------------------------------------------------------------------
// I/O-bound session operations
// ---------------------------------------------------------------------------

async function loadOwnedSession(
  admin: AdminClient,
  sessionId: string,
  userId: string
): Promise<RelaySessionRow> {
  const { data: session } = await admin
    .from("relay_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) throw new Error("Session not found.");
  if (session.fde_user_id !== userId) throw new Error("Forbidden.");
  return session as RelaySessionRow;
}

async function insertEvent(
  admin: AdminClient,
  sessionId: string,
  actor: RelayActor,
  eventType: string,
  sourceSurface: string | null,
  payload: Record<string, unknown>
): Promise<RelayEventRow> {
  const { data: seqRow } = await admin
    .from("relay_execution_events")
    .select("sequence_number")
    .eq("session_id", sessionId)
    .order("sequence_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSeq = (seqRow?.sequence_number || 0) + 1;

  const { data: event, error } = await admin
    .from("relay_execution_events")
    .insert({
      session_id: sessionId,
      sequence_number: nextSeq,
      actor,
      event_type: eventType,
      source_surface: sourceSurface,
      payload,
    })
    .select("*")
    .single();
  if (error || !event) throw new Error(error?.message || "Could not record event.");
  return event as RelayEventRow;
}

const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve a relay session from its invitation accept token, for the signed-in FDE.
 * Invite tokens are only ever stored as a hash (never retrievable), so a signed-in FDE
 * who has lost their original invite email can also resume via their own session id —
 * ownership is still enforced below, so this never exposes another FDE's session.
 */
export async function getSessionByInviteToken(token: string, userId: string) {
  const admin = createAdminSupabaseClient();

  if (SESSION_ID_RE.test(token)) {
    const { data: ownSession } = await admin
      .from("relay_sessions")
      .select("*")
      .eq("id", token)
      .maybeSingle();
    if (ownSession) {
      if (ownSession.fde_user_id !== userId) throw new Error("Forbidden.");
      return ownSession as RelaySessionRow;
    }
  }

  const tokenHash = hashInviteToken(token);
  const { data: invitation } = await admin
    .from("fde_invitations")
    .select("id, fde_user_id, mission_id")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!invitation) throw new Error("Invitation not found.");

  const { data: session } = await admin
    .from("relay_sessions")
    .select("*")
    .eq("invitation_id", invitation.id)
    .maybeSingle();
  if (!session) throw new Error("No session has started for this invitation yet.");
  if (session.fde_user_id !== userId) throw new Error("Forbidden.");

  return session as RelaySessionRow;
}

export async function getSessionForOwner(sessionId: string, userId: string) {
  const admin = createAdminSupabaseClient();
  const session = await loadOwnedSession(admin, sessionId, userId);

  const { data: mission } = await admin
    .from("fde_missions")
    .select(
      "title, objective, customer_context, expected_outcome, systems_context, technical_environment, constraints, security_considerations, success_measures"
    )
    .eq("id", session.mission_id)
    .maybeSingle();

  const { data: events } = await admin
    .from("relay_execution_events")
    .select("*")
    .eq("session_id", sessionId)
    .order("sequence_number", { ascending: true });

  const canonical = getScenarioCanonical();
  const state = (session.workspace_state || {}) as Partial<WorkspaceState> & {
    files?: FileMap;
  };
  let overlayFacts = canonical.canonicalFacts;
  let overlayDuration = canonical.durationMinutes;
  try {
    const raw = state.files?.["canonical.json"];
    if (raw) {
      const parsed = JSON.parse(raw) as {
        canonicalFacts?: string[];
        durationMinutes?: number;
      };
      if (Array.isArray(parsed.canonicalFacts) && parsed.canonicalFacts.length) {
        overlayFacts = parsed.canonicalFacts;
      }
      if (typeof parsed.durationMinutes === "number" && parsed.durationMinutes > 0) {
        overlayDuration = parsed.durationMinutes;
      }
    }
  } catch {
    // keep known-good canonical
  }

  const narrative =
    typeof state.curveballNarrative === "string" ? state.curveballNarrative : null;

  const { candidateVisibleFacts } = await import("@/lib/relay/workspace/seed");
  return {
    session,
    mission,
    events: (events || []) as RelayEventRow[],
    /** Full facts for server-side chat simulation only — do not render in Brief. */
    canonicalFacts: overlayFacts,
    /** Safe for candidate Brief / constraints UI. */
    candidateFacts: candidateVisibleFacts(overlayFacts, canonical.candidateVisibleFacts),
    durationMinutes: overlayDuration,
    curveballText: narrative || (session.curveball_key ? curveballCopy(session.curveball_key) : null),
  };
}

export async function startPreflight(sessionId: string, userId: string) {
  const admin = createAdminSupabaseClient();
  const session = await loadOwnedSession(admin, sessionId, userId);
  if (["preflight", "ready", ...ACTIVE_STATES].includes(session.status)) {
    return session;
  }
  if (session.status !== "accepted") {
    throw new Error("Session is not ready for preflight.");
  }

  const { data: updated, error } = await admin
    .from("relay_sessions")
    .update({ status: "preflight" })
    .eq("id", sessionId)
    .eq("status", "accepted")
    .select("*")
    .single();
  if (error || !updated) throw new Error(error?.message || "Could not start preflight.");

  await insertEvent(admin, sessionId, "system", "preflight_started", "preflight", {});
  return updated as RelaySessionRow;
}

export async function beginSession(sessionId: string, userId: string) {
  const admin = createAdminSupabaseClient();
  const session = await loadOwnedSession(admin, sessionId, userId);

  if (ACTIVE_STATES.includes(session.status)) {
    return { session, seedFiles: null as FileMap | null };
  }
  if (!["preflight", "ready"].includes(session.status)) {
    throw new Error("Session must complete preflight before starting.");
  }

  const canonical = getScenarioCanonical();
  // Safest-for-demo default: only serve an ops-approved, validated variant
  // when explicitly named via env; otherwise always the known-good baseline.
  // See src/lib/relay/variants/resolve.ts — never serves draft/unapproved.
  const release = resolveScenarioForSession({
    preferVariantId: process.env.RELAY_ACTIVE_VARIANT_ID || null,
  });

  // Overlay employer-generated blueprint (any company) onto the validated runtime.
  const { data: mission } = await admin
    .from("fde_missions")
    .select("customer_context, title")
    .eq("id", session.mission_id)
    .maybeSingle();
  const blueprint = mission?.customer_context
    ? extractBlueprintFromCustomerContext(String(mission.customer_context))
    : null;
  const overlay = applyBlueprintOverlay(release.files, blueprint);

  // Prefer blueprint curveball when present; keep Relay key for trigger compatibility.
  const curveballKey =
    session.curveball_key ||
    overlay.curveballKey ||
    pickCurveball(canonical.curveballs, sessionId);

  const startedAt = new Date();
  const durationMinutes = overlay.durationMinutes || canonical.durationMinutes || 55;
  const endsAt = computeEndsAt(startedAt, durationMinutes);

  const existingState = (session.workspace_state as Partial<WorkspaceState>) || {};
  // Candidate FS must never include evaluator answer keys (canonical.json, spoiler docs).
  const { toCandidateFileMap } = await import("@/lib/relay/workspace/seed");
  const seededFiles = toCandidateFileMap(
    existingState.files && Object.keys(existingState.files).length
      ? existingState.files
      : overlay.files
  );

  const attemptKind =
    session.attempt_kind === "preview" || session.attempt_kind === "demonstration"
      ? session.attempt_kind
      : existingState.attemptKind === "preview" || existingState.attemptKind === "demonstration"
        ? existingState.attemptKind
        : "scored";

  const workspaceState: WorkspaceState = {
    files: seededFiles,
    plan: existingState.plan || {},
    handoff: existingState.handoff || {},
    notes: { ...EMPTY_WORKSPACE_NOTES, ...(existingState.notes || {}) },
    scenarioReleaseId: existingState.scenarioReleaseId || release.releaseId,
    blueprintId: overlay.blueprintId,
    templateLabel: overlay.templateLabel,
    curveballNarrative: overlay.curveballNarrative || undefined,
    companyName: overlay.companyName,
    attemptKind,
  };

  const { data: updated, error } = await admin
    .from("relay_sessions")
    .update({
      status: "active",
      started_at: startedAt.toISOString(),
      ends_at: endsAt.toISOString(),
      last_heartbeat_at: startedAt.toISOString(),
      curveball_key: curveballKey || null,
      workspace_state: workspaceState,
      attempt_kind: attemptKind,
      billable: attemptKind === "scored",
    })
    .eq("id", sessionId)
    .in("status", ["preflight", "ready"])
    .select("*")
    .single();
  if (error || !updated) throw new Error(error?.message || "Could not start the session.");

  await insertEvent(admin, sessionId, "system", "session_started", "workspace", {
    endsAt: endsAt.toISOString(),
    scenarioReleaseId: workspaceState.scenarioReleaseId,
    blueprintId: workspaceState.blueprintId,
    templateLabel: workspaceState.templateLabel,
    durationMinutes,
  });
  await audit(userId, "relay_session.started", "relay_session", sessionId, {
    scenarioReleaseId: workspaceState.scenarioReleaseId,
    blueprintId: workspaceState.blueprintId,
  });

  return { session: updated as RelaySessionRow, seedFiles: seededFiles };
}

export async function heartbeat(sessionId: string, userId: string) {
  const admin = createAdminSupabaseClient();
  const session = await loadOwnedSession(admin, sessionId, userId);
  const now = new Date();

  const gapSeconds = computeHeartbeatGapSeconds(session.last_heartbeat_at, now, session.status);
  const patch: Record<string, unknown> = { last_heartbeat_at: now.toISOString() };
  if (gapSeconds > 0) {
    patch.technical_interruption_seconds = (session.technical_interruption_seconds || 0) + gapSeconds;
    patch.status = "recovering";
  } else if (session.status === "recovering") {
    patch.status = "active";
  }

  const { data: updated, error } = await admin
    .from("relay_sessions")
    .update(patch)
    .eq("id", sessionId)
    .select("*")
    .single();
  if (error || !updated) throw new Error(error?.message || "Could not record heartbeat.");

  const expired = updated.ends_at ? now.getTime() > new Date(updated.ends_at).getTime() : false;
  return { session: updated as RelaySessionRow, expired, now: now.toISOString() };
}

export async function saveWorkspaceState(
  sessionId: string,
  userId: string,
  patch: {
    files?: FileMap;
    plan?: Record<string, string>;
    handoff?: Record<string, string>;
    notes?: Partial<WorkspaceNotes>;
  }
) {
  const admin = createAdminSupabaseClient();
  const session = await loadOwnedSession(admin, sessionId, userId);
  if (!OPEN_STATES.includes(session.status)) {
    throw new Error("Session is not accepting saves.");
  }

  const current = (session.workspace_state as Partial<WorkspaceState>) || {};
  const next: WorkspaceState = {
    files: patch.files ?? current.files ?? {},
    plan: { ...(current.plan || {}), ...(patch.plan || {}) },
    handoff: { ...(current.handoff || {}), ...(patch.handoff || {}) },
    notes: {
      ...EMPTY_WORKSPACE_NOTES,
      ...(current.notes || {}),
      ...(patch.notes || {}),
      checklist: patch.notes?.checklist ?? current.notes?.checklist ?? [],
    },
    savedAt: new Date().toISOString(),
  };

  const { data: updated, error } = await admin
    .from("relay_sessions")
    .update({ workspace_state: next })
    .eq("id", sessionId)
    .select("*")
    .single();
  if (error || !updated) throw new Error(error?.message || "Could not save workspace state.");

  if (patch.files) {
    const changed = Object.keys(patch.files);
    if (changed.length > 0) {
      await insertEvent(admin, sessionId, "candidate", "file_saved", "workspace", {
        paths: changed.slice(0, 20),
      });
    }
  }

  return updated as RelaySessionRow;
}

export async function appendEvent(
  sessionId: string,
  userId: string,
  input: { actor?: RelayActor; eventType: string; sourceSurface?: string; payload?: Record<string, unknown> }
) {
  const admin = createAdminSupabaseClient();
  const session = await loadOwnedSession(admin, sessionId, userId);
  if (!OPEN_STATES.includes(session.status)) {
    throw new Error("Session is not accepting new events.");
  }

  const actor: RelayActor = input.actor || "candidate";
  const event = await insertEvent(
    admin,
    sessionId,
    actor,
    input.eventType,
    input.sourceSurface || null,
    input.payload || {}
  );

  let reply: RelayEventRow | null = null;
  if (input.eventType === "customer_chat_message" && actor === "candidate") {
    const canonical = getScenarioCanonical();
    const replyText = draftCustomerReply(String(input.payload?.text || ""), canonical.canonicalFacts);
    reply = await insertEvent(admin, sessionId, "customer_simulator", "customer_chat_message", "customer_chat", {
      text: replyText,
    });
  }

  return { event, reply };
}

export async function revealCurveball(sessionId: string, userId: string) {
  const admin = createAdminSupabaseClient();
  const session = await loadOwnedSession(admin, sessionId, userId);
  if (!ACTIVE_STATES.includes(session.status)) {
    throw new Error("Session is not active.");
  }

  const canonical = getScenarioCanonical();
  const key = session.curveball_key || pickCurveball(canonical.curveballs, sessionId);
  if (!session.curveball_key && key) {
    await admin.from("relay_sessions").update({ curveball_key: key }).eq("id", sessionId);
  }

  const state = (session.workspace_state || {}) as Partial<WorkspaceState>;
  const text = state.curveballNarrative || curveballCopy(key);

  const { data: existing } = await admin
    .from("relay_execution_events")
    .select("*")
    .eq("session_id", sessionId)
    .eq("event_type", "curveball_revealed")
    .maybeSingle();

  const event =
    existing ||
    (await insertEvent(admin, sessionId, "system", "curveball_revealed", "workspace", {
      key,
      curveballText: text,
    }));

  return { curveballKey: key, curveballText: text, event: event as RelayEventRow };
}

export async function submitSession(
  sessionId: string,
  userId: string,
  finalState: {
    files?: FileMap;
    plan?: Record<string, string>;
    handoff?: Record<string, string>;
    notes?: Partial<WorkspaceNotes>;
  }
) {
  const admin = createAdminSupabaseClient();
  const session = await loadOwnedSession(admin, sessionId, userId);

  if (["submitted", "processing", "receipt_ready"].includes(session.status)) {
    return { session, alreadySubmitted: true };
  }
  if (!ACTIVE_STATES.includes(session.status)) {
    throw new Error("Session is not active — nothing to submit.");
  }

  const current = (session.workspace_state as Partial<WorkspaceState>) || {};
  const candidateSnapshot: Record<string, unknown> = {
    files: finalState.files ?? current.files ?? {},
    plan: { ...(current.plan || {}), ...(finalState.plan || {}) },
    handoff: { ...(current.handoff || {}), ...(finalState.handoff || {}) },
    notes: {
      ...EMPTY_WORKSPACE_NOTES,
      ...(current.notes || {}),
      ...(finalState.notes || {}),
      checklist: finalState.notes?.checklist ?? current.notes?.checklist ?? [],
    },
    curveballKey: session.curveball_key,
    submittedAt: new Date().toISOString(),
  };

  const decision = decideSubmission(session.status, session.submission_snapshot, candidateSnapshot);
  if (!decision.shouldFreeze) {
    return { session, alreadySubmitted: true };
  }

  const { data: updated, error } = await admin
    .from("relay_sessions")
    .update({
      workspace_state: {
        files: decision.snapshot.files,
        plan: decision.snapshot.plan,
        handoff: decision.snapshot.handoff,
        notes: decision.snapshot.notes,
      },
      submission_snapshot: decision.snapshot,
      status: "submitted",
      submitted_at: decision.snapshot.submittedAt as string,
    })
    .eq("id", sessionId)
    .in("status", ACTIVE_STATES)
    .select("*")
    .single();
  if (error || !updated) throw new Error(error?.message || "Could not submit session.");

  await insertEvent(admin, sessionId, "candidate", "session_submitted", "workspace", {});
  await audit(userId, "relay_session.submitted", "relay_session", sessionId, {});

  return { session: updated as RelaySessionRow, alreadySubmitted: false };
}

export async function markProcessing(sessionId: string) {
  const admin = createAdminSupabaseClient();
  const { data: session } = await admin.from("relay_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!session) throw new Error("Session not found.");
  if (session.status !== "submitted") return session as RelaySessionRow;

  const { data: updated, error } = await admin
    .from("relay_sessions")
    .update({ status: "processing" })
    .eq("id", sessionId)
    .eq("status", "submitted")
    .select("*")
    .single();
  if (error || !updated) throw new Error(error?.message || "Could not mark session processing.");
  return updated as RelaySessionRow;
}

function planTextFromWorkspace(workspace: Record<string, unknown> | null | undefined): string {
  // Working notes' "open risks" field supersedes the earlier deployment-notes
  // panel as the primary scoping/prioritization signal; legacy plan fields
  // are still honored for sessions started before notes existed.
  const notes = (workspace?.notes || {}) as Partial<WorkspaceNotes>;
  const legacyPlan = (workspace?.plan || {}) as Record<string, string>;
  return [notes.risks, legacyPlan.approach, legacyPlan.risks, legacyPlan.testStrategy].filter(Boolean).join("\n");
}

function handoffTextFromWorkspace(workspace: Record<string, unknown> | null | undefined): string {
  const handoff = (workspace?.handoff || {}) as Record<string, string>;
  return [handoff.whatBuilt, handoff.verification, handoff.limitations, handoff.summary, handoff.recommendation, handoff.followUps]
    .filter(Boolean)
    .join("\n");
}

/** "What I know" working notes — feeds the elicitation trait's enrichment. */
function knownsTextFromWorkspace(workspace: Record<string, unknown> | null | undefined): string {
  const notes = (workspace?.notes || {}) as Partial<WorkspaceNotes>;
  return notes.knowledge || "";
}

/** "What I still don't know" working notes — feeds the limitation_honesty trait's enrichment. */
function unknownsTextFromWorkspace(workspace: Record<string, unknown> | null | undefined): string {
  const notes = (workspace?.notes || {}) as Partial<WorkspaceNotes>;
  return notes.unknowns || "";
}

/** Persist atoms + scored metrics. Never throws — must not block findings. */
async function persistAnalysisArtifacts(
  admin: AdminClient,
  sessionId: string,
  analysis: SessionAnalysis
): Promise<void> {
  try {
    if (analysis.atoms.length > 0) {
      const rows = analysis.atoms.map((a) => ({
        session_id: a.sessionId,
        event_id: a.eventId ?? null,
        artifact_id: a.artifactId ?? null,
        dimension_id: a.dimensionId,
        direction: a.direction,
        magnitude: a.magnitude,
        relevance: a.relevance,
        reliability: a.reliability,
        independence_group: a.independenceGroup,
        source_kind: a.sourceKind,
        summary: a.summary,
        event_refs: a.eventRefs,
        artifact_refs: a.artifactRefs,
      }));
      const { error } = await admin.from("evidence_atoms").insert(rows);
      if (error) console.error("persistAnalysisArtifacts: atom insert failed", error.message);
    }

    await admin.from("evaluation_runs").insert({
      session_id: sessionId,
      policy_version: analysis.policyVersion || POLICY_VERSION,
      formula_version: analysis.formulaVersion || FORMULA_VERSION,
      metrics: {
        atomCount: analysis.atoms.length,
        composite: analysis.composite,
        prediction: analysis.prediction,
        validationMaturity: analysis.validationMaturity,
      },
      status: "completed",
    });
  } catch (err) {
    console.error(
      "persistAnalysisArtifacts: skipped (schema likely not migrated yet)",
      err instanceof Error ? err.message : err
    );
  }
}

export async function generateEvidenceFindings(sessionId: string) {
  const admin = createAdminSupabaseClient();
  const { data: session } = await admin.from("relay_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!session) throw new Error("Session not found.");

  if (session.status === "receipt_ready") {
    const { data: existing } = await admin
      .from("fde_evidence_findings")
      .select("*")
      .eq("session_id", sessionId);
    return existing || [];
  }
  if (session.status !== "processing") {
    throw new Error("Session must be processing before evidence can be generated.");
  }

  const { data: events } = await admin
    .from("relay_execution_events")
    .select("*")
    .eq("session_id", sessionId)
    .order("sequence_number", { ascending: true });

  const workspace = (session.workspace_state || {}) as Record<string, unknown>;
  const analysis = analyzeSession((events || []) as RelayEventRow[], {
    sessionId,
    planText: planTextFromWorkspace(workspace),
    handoffText: handoffTextFromWorkspace(workspace),
    knownsText: knownsTextFromWorkspace(workspace),
    unknownsText: unknownsTextFromWorkspace(workspace),
  });

  const findings =
    analysis.findings.length > 0
      ? analysis.findings.map((f) => ({
          dimension: f.dimension,
          observation: f.observation,
          interpretation: f.interpretation,
          confidence: f.confidence,
          limitation: f.limitation,
          event_ids: f.event_ids || [],
          artifact_ids: f.artifact_ids || [],
        }))
      : buildFindingsFromEvents((events || []) as RelayEventRow[], session as RelaySessionRow);

  const rows = findings.map((f) => ({
    session_id: sessionId,
    ...f,
    event_ids: f.event_ids || [],
    artifact_ids: f.artifact_ids || [],
  }));

  const { data: inserted, error } = await admin.from("fde_evidence_findings").insert(rows).select("*");
  if (error) throw new Error(error.message);

  await persistAnalysisArtifacts(admin, sessionId, analysis);

  await admin.from("relay_sessions").update({ status: "receipt_ready" }).eq("id", sessionId).eq("status", "processing");
  await audit(session.fde_user_id, "relay_session.evidence_generated", "relay_session", sessionId, {
    count: inserted?.length || 0,
    fitScore100: analysis.composite.fitScore100,
    observedTraitCount: analysis.composite.observedTraitCount,
    hireProbabilityPct: analysis.prediction.hireProbabilityPct,
    recommendation: analysis.prediction.recommendation,
  });

  const { data: missionForNotice } = await admin
    .from("fde_missions")
    .select("title, organization_id")
    .eq("id", session.mission_id)
    .maybeSingle();

  await enqueueAction({
    userId: session.fde_user_id,
    type: "evidence_ready",
    title: "Your evidence is ready",
    body: missionForNotice?.title
      ? `Scored findings and a predictive fit estimate from your "${missionForNotice.title}" session are ready.`
      : "Scored findings and a predictive fit estimate from your submitted session are ready.",
    actionUrl: "/app/fde/receipts",
    organizationId: missionForNotice?.organization_id || null,
    missionId: session.mission_id,
    sessionId,
  });

  return inserted || [];
}

/** Recompute analysis for Evidence Room / audit export. */
export async function loadSessionAnalysis(sessionId: string): Promise<SessionAnalysis | null> {
  const admin = createAdminSupabaseClient();
  const { data: session } = await admin.from("relay_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!session) return null;

  const { data: events } = await admin
    .from("relay_execution_events")
    .select("*")
    .eq("session_id", sessionId)
    .order("sequence_number", { ascending: true });

  const workspace = (session.workspace_state || {}) as Record<string, unknown>;
  return analyzeSession((events || []) as RelayEventRow[], {
    sessionId,
    planText: planTextFromWorkspace(workspace),
    handoffText: handoffTextFromWorkspace(workspace),
    knownsText: knownsTextFromWorkspace(workspace),
    unknownsText: unknownsTextFromWorkspace(workspace),
  });
}
