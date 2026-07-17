import "server-only";
import { resolve } from "path";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { audit, hashInviteToken } from "@/lib/fde/lifecycle";
import { loadScenarioSeedFiles } from "@/lib/relay/node-test-provider";
import type { FileMap } from "@/lib/relay/execution-provider";
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
  created_at: string;
  updated_at: string;
};

export type WorkspaceState = {
  files: FileMap;
  plan: Record<string, string>;
  handoff: Record<string, string>;
  savedAt?: string;
};

type ScenarioCanonical = {
  templateId: string;
  version: string;
  label: string;
  durationMinutes: number;
  curveballs: string[];
  canonicalFacts: string[];
};

const ACTIVE_STATES = ["active", "recovering"];
const OPEN_STATES = ["preflight", "ready", "active", "recovering"];
const HEARTBEAT_GAP_MS = 90_000;

const CURVEBALL_COPY: Record<string, string> = {
  model_rate_limit:
    "The AI/model API you were using just started rate-limiting requests. Plan around reduced automation for a while.",
  schema_drift:
    "The customer's data schema drifted from what the brief described. Re-check your assumptions before continuing.",
  automate_without_approval:
    "A teammate asks you to auto-execute the fix without human approval. Remember the approval policy.",
  data_retention:
    "Legal flags a data retention question on this ticket. Consider it before you close anything out.",
  demo_moved_earlier:
    "The customer demo just moved up by an hour. Re-prioritize your remaining time.",
  unsafe_eval_failure:
    "One of your eval cases is failing in an unsafe way. Investigate before you submit.",
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

/** Bounded customer-chat reply generator — never invents facts beyond canonical.json. */
export function draftCustomerReply(candidateMessage: string, facts: string[]): string {
  const text = candidateMessage.toLowerCase();
  const fallback = facts[0] || "Understood — keep me posted.";
  if (/refund|lock|legal|escalat/.test(text)) {
    return `Before we go further: ${facts.find((f) => /approval/i.test(f)) || fallback}`;
  }
  if (/p0|outage|down|incident/.test(text)) {
    return `Yes — treat it as urgent. ${facts.find((f) => /p0|queue/i.test(f)) || fallback}`;
  }
  if (/security|unauthorized|breach|credential/.test(text)) {
    return `Good instinct to check. ${facts.find((f) => /security|destructive/i.test(f)) || fallback}`;
  }
  if (/confiden|unsure|not sure|abstain/.test(text)) {
    return `That's fine — ${facts.find((f) => /abstain|confidence/i.test(f)) || fallback}`;
  }
  return "Thanks for the update — keep going and flag anything that needs my sign-off.";
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

/** Resolve a relay session from its invitation accept token, for the signed-in FDE. */
export async function getSessionByInviteToken(token: string, userId: string) {
  const admin = createAdminSupabaseClient();
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
    .select("title, objective, customer_context, expected_outcome")
    .eq("id", session.mission_id)
    .maybeSingle();

  const { data: events } = await admin
    .from("relay_execution_events")
    .select("*")
    .eq("session_id", sessionId)
    .order("sequence_number", { ascending: true });

  const canonical = getScenarioCanonical();

  return {
    session,
    mission,
    events: (events || []) as RelayEventRow[],
    canonicalFacts: canonical.canonicalFacts,
    durationMinutes: canonical.durationMinutes,
    curveballText: session.curveball_key ? curveballCopy(session.curveball_key) : null,
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
  const scenarioRoot = resolve(process.cwd(), "scenarios/project-relay");
  const seed = loadScenarioSeedFiles(scenarioRoot);

  const startedAt = new Date();
  const endsAt = computeEndsAt(startedAt, canonical.durationMinutes || 50);
  const curveballKey = session.curveball_key || pickCurveball(canonical.curveballs, sessionId);

  const existingState = (session.workspace_state as Partial<WorkspaceState>) || {};
  const workspaceState: WorkspaceState = {
    files: existingState.files && Object.keys(existingState.files).length ? existingState.files : seed,
    plan: existingState.plan || {},
    handoff: existingState.handoff || {},
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
    })
    .eq("id", sessionId)
    .in("status", ["preflight", "ready"])
    .select("*")
    .single();
  if (error || !updated) throw new Error(error?.message || "Could not start the session.");

  await insertEvent(admin, sessionId, "system", "session_started", "workspace", {
    endsAt: endsAt.toISOString(),
  });
  await audit(userId, "relay_session.started", "relay_session", sessionId, {});

  return { session: updated as RelaySessionRow, seedFiles: seed };
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
  patch: { files?: FileMap; plan?: Record<string, string>; handoff?: Record<string, string> }
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

  const { data: existing } = await admin
    .from("relay_execution_events")
    .select("*")
    .eq("session_id", sessionId)
    .eq("event_type", "curveball_revealed")
    .maybeSingle();

  const event = existing || (await insertEvent(admin, sessionId, "system", "curveball_revealed", "workspace", { key }));

  return { curveballKey: key, curveballText: curveballCopy(key), event: event as RelayEventRow };
}

export async function submitSession(
  sessionId: string,
  userId: string,
  finalState: { files?: FileMap; plan?: Record<string, string>; handoff?: Record<string, string> }
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

  const findings = buildFindingsFromEvents((events || []) as RelayEventRow[], session as RelaySessionRow);
  const rows = findings.map((f) => ({ session_id: sessionId, ...f }));

  const { data: inserted, error } = await admin.from("fde_evidence_findings").insert(rows).select("*");
  if (error) throw new Error(error.message);

  await admin.from("relay_sessions").update({ status: "receipt_ready" }).eq("id", sessionId).eq("status", "processing");
  await audit(session.fde_user_id, "relay_session.evidence_generated", "relay_session", sessionId, {
    count: inserted?.length || 0,
  });

  return inserted || [];
}
