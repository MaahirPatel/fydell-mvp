import "server-only";
import type { Admin } from "./context";
import { recordEngEvent } from "./events";
import { verifySetupCode } from "./scenarios";
import type { ScenarioDefinition } from "./scenarios/types";
import { selectReply } from "./teammate";
import type { AttemptRow, MessageRow } from "./types";

export class AttemptError extends Error {
  constructor(message: string, readonly status: number = 400) {
    super(message);
  }
}

/** Same error for "missing" and "not yours" so ids cannot be probed. */
export async function getAttemptForCandidate(db: Admin, attemptId: string, userId: string): Promise<AttemptRow> {
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) throw new AttemptError("Attempt not found.", 404);
  const { data } = await db.from("eng_attempts").select("*").eq("id", attemptId).maybeSingle();
  if (!data || data.candidate_user_id !== userId) throw new AttemptError("Attempt not found.", 404);
  return data as AttemptRow;
}

export async function getAttemptForOrg(db: Admin, attemptId: string, organizationId: string): Promise<AttemptRow> {
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) throw new AttemptError("Attempt not found.", 404);
  const { data } = await db.from("eng_attempts").select("*").eq("id", attemptId).maybeSingle();
  if (!data || data.organization_id !== organizationId) throw new AttemptError("Attempt not found.", 404);
  return data as AttemptRow;
}

function requireOpen(attempt: AttemptRow) {
  if (attempt.status === "withdrawn") throw new AttemptError("The employer withdrew this invitation.", 409);
  if (attempt.status === "expired") throw new AttemptError("This attempt has expired.", 409);
}

export function updateDueAt(attempt: Pick<AttemptRow, "started_at">, scenario: ScenarioDefinition): Date | null {
  if (!attempt.started_at) return null;
  return new Date(new Date(attempt.started_at).getTime() + scenario.requirementUpdate.releaseAfterMinutes * 60000);
}

/**
 * The requirement update is released by the server once the attempt has been
 * running for the authored number of minutes, exactly once, whichever request
 * notices first. The client cannot bring it forward.
 */
export async function releaseUpdateIfDue(
  db: Admin,
  attempt: AttemptRow,
  scenario: ScenarioDefinition,
  now = new Date()
): Promise<AttemptRow> {
  if (attempt.status !== "in_progress" || attempt.update_released_at) return attempt;
  const dueAt = updateDueAt(attempt, scenario);
  if (!dueAt || now.getTime() < dueAt.getTime()) return attempt;
  return releaseUpdate(db, attempt, scenario, dueAt, "schedule");
}

/**
 * A candidate who tries to submit before the scheduled update gets it at that
 * moment instead, so every submission is made with the full requirements in
 * hand. Returns true when this call released it.
 */
export async function releaseUpdateBeforeSubmission(db: Admin, attempt: AttemptRow, scenario: ScenarioDefinition): Promise<boolean> {
  if (attempt.status !== "in_progress" || attempt.update_released_at) return false;
  const released = await releaseUpdate(db, attempt, scenario, new Date(), "early_submission");
  return released.update_released_at !== null;
}

async function releaseUpdate(
  db: Admin,
  attempt: AttemptRow,
  scenario: ScenarioDefinition,
  at: Date,
  reason: "schedule" | "early_submission"
): Promise<AttemptRow> {
  const releasedAt = at.toISOString();
  const { data } = await db
    .from("eng_attempts")
    .update({ update_released_at: releasedAt })
    .eq("id", attempt.id)
    .is("update_released_at", null)
    .select("*")
    .maybeSingle();
  if (!data) {
    const { data: current } = await db.from("eng_attempts").select("*").eq("id", attempt.id).single();
    return current as AttemptRow;
  }
  const update = scenario.requirementUpdate;
  await db.from("eng_messages").insert({
    attempt_id: attempt.id,
    sender: "teammate",
    teammate_id: update.teammateId,
    body: `${update.title}\n\n${update.body}`,
    client_msg_id: `update_${update.id}`,
    rule_id: `update:${update.id}`,
  });
  await recordEngEvent(db, attempt.id, {
    type: "requirement_update_released",
    actor: "system",
    payload: { updateId: update.id, releasedAt, reason },
    clientEventId: `update_released_${update.id}`,
  });
  return data as AttemptRow;
}

export async function recordConsent(db: Admin, attempt: AttemptRow, userId: string): Promise<AttemptRow> {
  requireOpen(attempt);
  if (attempt.consented_at) return attempt;
  const { data } = await db
    .from("eng_attempts")
    .update({ consented_at: new Date().toISOString() })
    .eq("id", attempt.id)
    .is("consented_at", null)
    .select("*")
    .maybeSingle();
  await recordEngEvent(db, attempt.id, { type: "consent_recorded", actor: "candidate", actorUserId: userId, clientEventId: "consent" });
  return (data as AttemptRow) ?? attempt;
}

export async function submitSetupCode(
  db: Admin,
  attempt: AttemptRow,
  scenario: ScenarioDefinition,
  code: string,
  userId: string
): Promise<AttemptRow> {
  requireOpen(attempt);
  if (!attempt.consented_at) throw new AttemptError("Review and accept the task terms first.", 409);
  if (attempt.status !== "accepted") return attempt;
  const runtime = verifySetupCode(scenario, code);
  if (!runtime) {
    await recordEngEvent(db, attempt.id, { type: "preflight_code_rejected", actor: "candidate", actorUserId: userId });
    throw new AttemptError(
      "That code does not match this task. Run the setup check from inside the harbor-webhooks folder and paste the line that starts with \"Setup code:\". If the check says your Python version is not supported, install Python 3.11, 3.12 or 3.13 and run it again.",
      422
    );
  }
  const { data } = await db
    .from("eng_attempts")
    .update({ status: "preflight_passed", preflight_passed_at: new Date().toISOString(), preflight_runtime: `python ${runtime}` })
    .eq("id", attempt.id)
    .eq("status", "accepted")
    .select("*")
    .maybeSingle();
  await recordEngEvent(db, attempt.id, {
    type: "preflight_passed",
    actor: "candidate",
    actorUserId: userId,
    payload: { runtime },
    clientEventId: "preflight_passed",
  });
  return (data as AttemptRow) ?? attempt;
}

export async function startAttempt(db: Admin, attempt: AttemptRow, userId: string): Promise<AttemptRow> {
  requireOpen(attempt);
  if (attempt.status === "in_progress" || attempt.status === "submitted") return attempt;
  if (attempt.status !== "preflight_passed") throw new AttemptError("Finish the setup check before starting.", 409);
  const startedAt = new Date();
  const dueAt = new Date(startedAt.getTime() + attempt.allowed_minutes * 60000);
  const { data } = await db
    .from("eng_attempts")
    .update({ status: "in_progress", started_at: startedAt.toISOString(), due_at: dueAt.toISOString() })
    .eq("id", attempt.id)
    .eq("status", "preflight_passed")
    .select("*")
    .maybeSingle();
  if (!data) {
    const { data: current } = await db.from("eng_attempts").select("*").eq("id", attempt.id).single();
    return current as AttemptRow;
  }
  await recordEngEvent(db, attempt.id, {
    type: "attempt_started",
    actor: "candidate",
    actorUserId: userId,
    payload: { dueAt: dueAt.toISOString() },
    clientEventId: "attempt_started",
  });
  return data as AttemptRow;
}

export async function acknowledgeUpdate(db: Admin, attempt: AttemptRow, userId: string): Promise<AttemptRow> {
  if (!attempt.update_released_at) throw new AttemptError("There is no update to acknowledge yet.", 409);
  if (attempt.update_acknowledged_at) return attempt;
  const { data } = await db
    .from("eng_attempts")
    .update({ update_acknowledged_at: new Date().toISOString() })
    .eq("id", attempt.id)
    .is("update_acknowledged_at", null)
    .select("*")
    .maybeSingle();
  await recordEngEvent(db, attempt.id, { type: "requirement_update_acknowledged", actor: "candidate", actorUserId: userId, clientEventId: "update_ack" });
  return (data as AttemptRow) ?? attempt;
}

export async function extendAttempt(
  db: Admin,
  attempt: AttemptRow,
  minutes: number,
  reason: string,
  actor: { userId: string; email: string }
): Promise<AttemptRow> {
  if (!["accepted", "preflight_passed", "in_progress"].includes(attempt.status)) {
    throw new AttemptError("Only attempts that have not been submitted can be extended.", 409);
  }
  if (!Number.isInteger(minutes) || minutes < 15 || minutes > 240) throw new AttemptError("Extend by 15 to 240 minutes.");
  const total = attempt.extension_minutes + minutes;
  if (total > 1440) throw new AttemptError("Total extensions cannot exceed 24 hours.");
  const { data, error } = await db
    .from("eng_attempts")
    .update({ extension_minutes: total })
    .eq("id", attempt.id)
    .eq("extension_minutes", attempt.extension_minutes)
    .select("*")
    .maybeSingle();
  if (error || !data) throw new AttemptError("The attempt changed. Reload and try again.", 409);
  await recordEngEvent(db, attempt.id, {
    type: "deadline_extended",
    actor: "employer",
    actorUserId: actor.userId,
    actorEmail: actor.email,
    payload: { minutes, totalExtensionMinutes: total, reason: reason.slice(0, 500) },
  });
  return data as AttemptRow;
}

export async function listMessages(db: Admin, attemptId: string): Promise<MessageRow[]> {
  const { data } = await db.from("eng_messages").select("*").eq("attempt_id", attemptId).order("seq");
  return (data as MessageRow[]) ?? [];
}

/**
 * Stores the candidate's message and the authored reply. Both are idempotent on
 * the client's message id, so a network retry can neither duplicate nor lose
 * the exchange.
 */
export async function sendMessage(
  db: Admin,
  attempt: AttemptRow,
  scenario: ScenarioDefinition,
  input: { body: string; clientMsgId: string }
): Promise<MessageRow[]> {
  requireOpen(attempt);
  if (attempt.status !== "in_progress") throw new AttemptError("The team thread opens when you start the task.", 409);
  const body = input.body.trim();
  if (!body || body.length > 4000) throw new AttemptError("Messages must be between 1 and 4,000 characters.");
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(input.clientMsgId)) throw new AttemptError("Invalid message id.");

  let candidateMessage: MessageRow | null = null;
  const { data, error } = await db
    .from("eng_messages")
    .insert({ attempt_id: attempt.id, sender: "candidate", body, client_msg_id: input.clientMsgId })
    .select("*")
    .single();
  if (error) {
    if (error.code !== "23505") throw new AttemptError("Could not send the message. Try again.", 500);
    const { data: existing } = await db
      .from("eng_messages")
      .select("*")
      .eq("attempt_id", attempt.id)
      .eq("client_msg_id", input.clientMsgId)
      .single();
    candidateMessage = existing as MessageRow;
  } else {
    candidateMessage = data as MessageRow;
  }

  const reply = selectReply(scenario, candidateMessage.body, { updateReleased: Boolean(attempt.update_released_at) });
  const { error: replyError } = await db.from("eng_messages").insert({
    attempt_id: attempt.id,
    sender: "teammate",
    teammate_id: reply.teammateId,
    body: reply.body,
    client_msg_id: `reply_${input.clientMsgId}`,
    reply_to: candidateMessage.id,
    rule_id: reply.ruleId,
  });
  if (replyError && replyError.code !== "23505") throw new AttemptError("Your message was saved, but the reply failed. Refresh to retry.", 500);
  return listMessages(db, attempt.id);
}

export const DRAFT_FIELDS = ["what_changed", "testing", "risks", "next_steps", "ai_use", "message"] as const;
export type DraftField = (typeof DRAFT_FIELDS)[number];

export async function getDrafts(db: Admin, attemptId: string): Promise<Record<string, { body: string; revision: number }>> {
  const { data } = await db.from("eng_drafts").select("field, body, revision").eq("attempt_id", attemptId);
  const out: Record<string, { body: string; revision: number }> = {};
  for (const row of data ?? []) out[row.field as string] = { body: row.body as string, revision: row.revision as number };
  return out;
}

export async function saveDraft(
  db: Admin,
  attempt: AttemptRow,
  field: DraftField,
  body: string,
  baseRevision: number
): Promise<{ ok: true; revision: number } | { ok: false; current: { body: string; revision: number } }> {
  requireOpen(attempt);
  if (attempt.status === "submitted") throw new AttemptError("This attempt was already submitted.", 409);
  if (body.length > 8000) throw new AttemptError("Keep each field under 8,000 characters.");
  if (baseRevision === 0) {
    const { error } = await db.from("eng_drafts").insert({ attempt_id: attempt.id, field, body, revision: 1 });
    if (!error) return { ok: true, revision: 1 };
    if (error.code !== "23505") throw new AttemptError("Could not save the draft.", 500);
  } else {
    const { data } = await db
      .from("eng_drafts")
      .update({ body, revision: baseRevision + 1, updated_at: new Date().toISOString() })
      .eq("attempt_id", attempt.id)
      .eq("field", field)
      .eq("revision", baseRevision)
      .select("revision")
      .maybeSingle();
    if (data) return { ok: true, revision: data.revision as number };
  }
  const { data: current } = await db
    .from("eng_drafts")
    .select("body, revision")
    .eq("attempt_id", attempt.id)
    .eq("field", field)
    .single();
  return { ok: false, current: { body: current?.body as string, revision: current?.revision as number } };
}
