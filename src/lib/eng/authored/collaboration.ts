import "server-only";
import { getProviderConfig, postChatCompletion } from "@/lib/ai/provider";
import type { Admin } from "../context";
import { AttemptError } from "../attempts";
import { recordEngEvent } from "../events";
import { effectiveDueAt, submissionWindow } from "../state";
import type { MessageRow } from "../types";
import type { Coworker, PackageFile, ProtectedMaterials, ScenarioPackage } from "../authoring/package";
import { buildCommunicationEvidence, summarizeAssistantUse, type AssistantUseSummary, type CommunicationItem } from "./collaboration-evidence";
import { sha256Hex } from "./archive";
import { validateCandidateFiles } from "./evaluate";
import { AUTHORED_GRACE_MINUTES, getWorkspace, type AuthoredAttempt } from "./runtime";
import {
  ASSISTANT_LIMIT,
  ASSISTANT_SCHEMA,
  ASSISTANT_STALE_SECONDS,
  TEAMMATE_REPLY_SCHEMA,
  assistantContext,
  assistantEnabled,
  assistantPrompt,
  checkAssistantOutput,
  checkTeammateDraft,
  eventDisclosure,
  eventKeyOf,
  finalHandoffMessage,
  initialContextMessage,
  messageView,
  reviewQuestionDue,
  scenarioNotesReply,
  teammatePrompt,
  validReviewQuestion,
  type Fact,
  type Turn,
} from "./collaboration-core";
import type {
  AssistantInteractionView,
  AssistantPatchFile,
  AssistantStatus,
  CollaborationView,
  ScenarioEventKey,
} from "./collaboration-types";

const MSG_ID = /^[A-Za-z0-9_-]{8,64}$/;

type AssistantRow = {
  id: string;
  attempt_id: string;
  seq: number;
  client_msg_id: string;
  prompt: string;
  context_paths: string[];
  status: AssistantStatus;
  answer: string;
  patch: AssistantPatchFile[] | null;
  decision: AssistantInteractionView["decision"];
  decided_at: string | null;
  applied_revision: number | null;
  created_at: string;
};

async function loadProtected(db: Admin, versionId: string): Promise<ProtectedMaterials> {
  const { data } = await db.from("eng_scenario_version_protected").select("content").eq("version_id", versionId).maybeSingle();
  if (!data) throw new AttemptError("This task's teammate notes are missing.", 500);
  return data.content as ProtectedMaterials;
}

function factsFor(prot: ProtectedMaterials, coworkerId: string): Fact[] {
  return prot.coworkerFacts[coworkerId] ?? [];
}

function canCollaborate(authored: AuthoredAttempt): boolean {
  const { attempt } = authored;
  return attempt.status === "in_progress" && submissionWindow(attempt, AUTHORED_GRACE_MINUTES) !== "closed";
}

function requireCollaborating(authored: AuthoredAttempt) {
  if (!canCollaborate(authored)) throw new AttemptError("The team thread is open while you work on the task.", 409);
}

async function listRows(db: Admin, attemptId: string): Promise<MessageRow[]> {
  const { data } = await db.from("eng_messages").select("*").eq("attempt_id", attemptId).order("seq");
  return (data as MessageRow[]) ?? [];
}

function turns(rows: MessageRow[]): Turn[] {
  return rows.map((m) => ({ sender: m.sender, teammateId: m.teammate_id, body: m.body, eventKey: eventKeyOf(m.rule_id) }));
}

/* ------------------------------------------------------------------ */
/* Scenario events                                                     */
/* ------------------------------------------------------------------ */

async function releaseEvent(db: Admin, attemptId: string, key: ScenarioEventKey, coworker: Coworker, body: string): Promise<void> {
  const { error } = await db.from("eng_messages").insert({
    attempt_id: attemptId,
    sender: "teammate",
    teammate_id: coworker.id,
    body,
    client_msg_id: `event_${key}`,
    rule_id: `event:${key}`,
  });
  if (error && error.code !== "23505") throw new AttemptError("Could not update the team thread.", 500);
  if (!error) {
    await recordEngEvent(db, attemptId, {
      type: "scenario_event_released",
      actor: "system",
      payload: { key, teammateId: coworker.id },
      clientEventId: `scenario_${key}`,
    });
  }
}

/**
 * Releases whichever planned events are due. Each event has a fixed message
 * id, so reconnects and parallel requests can never post it twice.
 */
export async function releaseDueEvents(db: Admin, authored: AuthoredAttempt, opts: { reviewOpened?: boolean } = {}): Promise<void> {
  const { attempt, pkg } = authored;
  const rows = await listRows(db, attempt.id);
  const released = new Set(rows.map((r) => eventKeyOf(r.rule_id)).filter((k): k is ScenarioEventKey => k !== null));
  const started = attempt.status === "in_progress" || attempt.status === "submitted";

  if (started && !released.has("initial_context")) {
    const msg = initialContextMessage(pkg);
    if (msg) await releaseEvent(db, attempt.id, "initial_context", msg.coworker, msg.body);
  }
  if (canCollaborate(authored) && !released.has("review_question")) {
    const review = validReviewQuestion(pkg);
    if (review && (opts.reviewOpened || reviewQuestionDue(attempt.started_at, effectiveDueAt(attempt)))) {
      await releaseEvent(db, attempt.id, "review_question", review.coworker, review.text);
    }
  }
  if (attempt.status === "submitted" && attempt.submitted_at && !released.has("final_handoff")) {
    const msg = finalHandoffMessage(pkg);
    if (msg) await releaseEvent(db, attempt.id, "final_handoff", msg.coworker, msg.body);
  }
}

/* ------------------------------------------------------------------ */
/* Team messages                                                       */
/* ------------------------------------------------------------------ */

async function composeReply(
  pkg: ScenarioPackage,
  prot: ProtectedMaterials,
  self: Coworker,
  thread: Turn[],
  question: string,
): Promise<{ body: string; factIds: string[]; mode: "model" | "scenario_notes"; reason: string | null }> {
  const facts = factsFor(prot, self.id);
  const notes = (reason: string) => ({ ...scenarioNotesReply(self, pkg.coworkers, facts, question, thread), mode: "scenario_notes" as const, reason });
  const config = getProviderConfig();
  if (!config) return notes("no_provider");
  const extraBody = config.provider === "groq" && config.model.includes("gpt-oss") ? { reasoning_effort: "low" } : undefined;
  let lastReason = "invalid";
  for (let i = 0; i < 2; i++) {
    let raw: unknown;
    try {
      const content = await postChatCompletion(config, teammatePrompt(pkg, self, facts, thread, question), {
        schema: TEAMMATE_REPLY_SCHEMA,
        schemaName: "teammate_reply",
        temperature: i === 0 ? 0.5 : 0.8,
        maxTokens: 500,
        extraBody,
      });
      raw = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    } catch (error) {
      if (i === 0 && error instanceof Error && /\b429\b/.test(error.message)) {
        await new Promise((r) => setTimeout(r, 6_000));
        continue;
      }
      return notes(error instanceof SyntaxError ? "invalid_json" : "provider_error");
    }
    const checked = checkTeammateDraft(raw, facts, prot);
    if (checked.ok === false) {
      lastReason = checked.reason;
      continue;
    }
    return { body: checked.body, factIds: checked.factIds, mode: "model", reason: null };
  }
  return notes(lastReason);
}

export async function sendTeamMessage(
  db: Admin,
  authored: AuthoredAttempt,
  userId: string,
  input: { teammateId: unknown; body: unknown; clientMsgId: unknown },
): Promise<void> {
  requireCollaborating(authored);
  const { attempt, pkg, version } = authored;
  const self = pkg.coworkers.find((c) => c.id === input.teammateId);
  if (!self) throw new AttemptError("Choose a teammate to message.");
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (!body || body.length > 4000) throw new AttemptError("Messages must be between 1 and 4,000 characters.");
  if (typeof input.clientMsgId !== "string" || !MSG_ID.test(input.clientMsgId)) throw new AttemptError("Invalid message id.");
  const clientMsgId = input.clientMsgId;

  let candidate: MessageRow;
  const { data, error } = await db
    .from("eng_messages")
    .insert({ attempt_id: attempt.id, sender: "candidate", teammate_id: self.id, body, client_msg_id: clientMsgId })
    .select("*")
    .single();
  if (error) {
    if (error.code !== "23505") throw new AttemptError("Could not send the message. Try again.", 500);
    const { data: existing } = await db.from("eng_messages").select("*").eq("attempt_id", attempt.id).eq("client_msg_id", clientMsgId).single();
    candidate = existing as MessageRow;
  } else {
    candidate = data as MessageRow;
    await recordEngEvent(db, attempt.id, {
      type: "team_message_sent",
      actor: "candidate",
      actorUserId: userId,
      payload: { messageId: candidate.id, teammateId: self.id, chars: body.length },
      clientEventId: `team_${clientMsgId}`,
    });
  }

  const rows = await listRows(db, attempt.id);
  const replyId = `reply_${clientMsgId}`;
  if (rows.some((m) => m.client_msg_id === replyId)) return;
  const addressed = pkg.coworkers.find((c) => c.id === candidate.teammate_id) ?? self;
  const prot = await loadProtected(db, version.id);
  const reply = await composeReply(pkg, prot, addressed, turns(rows.filter((m) => m.id !== candidate.id)), candidate.body);
  const { error: replyError } = await db.from("eng_messages").insert({
    attempt_id: attempt.id,
    sender: "teammate",
    teammate_id: addressed.id,
    body: reply.body,
    client_msg_id: replyId,
    reply_to: candidate.id,
    rule_id: `${reply.mode === "model" ? "gen" : "notes"}:${reply.factIds.length ? reply.factIds.join("+") : "none"}`,
  });
  if (replyError && replyError.code !== "23505") throw new AttemptError("Your message was saved, but the reply failed. Send it again to retry.", 500);
  if (!replyError) {
    await recordEngEvent(db, attempt.id, {
      type: "teammate_replied",
      actor: "system",
      payload: { teammateId: addressed.id, mode: reply.mode, factIds: reply.factIds, fallbackReason: reply.reason },
      clientEventId: replyId,
    });
  }
}

/* ------------------------------------------------------------------ */
/* Coding assistant                                                    */
/* ------------------------------------------------------------------ */

function interactionView(r: AssistantRow, now = Date.now()): AssistantInteractionView {
  const stale = r.status === "running" && now - new Date(r.created_at).getTime() > ASSISTANT_STALE_SECONDS * 1000;
  return {
    id: r.id,
    seq: r.seq,
    prompt: r.prompt,
    contextPaths: r.context_paths,
    status: stale ? "provider_unavailable" : r.status,
    answer: r.answer,
    patch: r.patch && r.patch.length ? r.patch : null,
    decision: r.decision,
    decidedAt: r.decided_at,
    appliedRevision: r.applied_revision,
    createdAt: r.created_at,
  };
}

async function listInteractions(db: Admin, attemptId: string): Promise<AssistantRow[]> {
  const { data } = await db.from("eng_assistant_interactions").select("*").eq("attempt_id", attemptId).order("seq");
  return (data as AssistantRow[]) ?? [];
}

function usedCount(rows: AssistantRow[]): number {
  return rows.filter((r) => r.status === "answered" || r.status === "invalid_output" || r.status === "running").length;
}

function parseShared(raw: unknown): AssistantPatchFile[] {
  if (!Array.isArray(raw)) return [];
  const out: AssistantPatchFile[] = [];
  for (const f of raw.slice(0, 6)) {
    if (!f || typeof f !== "object") continue;
    const { path, content } = f as Record<string, unknown>;
    if (typeof path === "string" && typeof content === "string" && content.length <= 200_000) out.push({ path, content });
  }
  return out;
}

export async function askAssistant(
  db: Admin,
  authored: AuthoredAttempt,
  userId: string,
  input: { prompt: unknown; clientMsgId: unknown; contextPaths: unknown; files: unknown },
): Promise<{ interaction: AssistantInteractionView; used: number; limit: number }> {
  requireCollaborating(authored);
  const { attempt, pkg } = authored;
  if (!assistantEnabled(pkg.aiPolicy.id)) throw new AttemptError("This task's AI policy does not include the built-in assistant.", 403);
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  if (!prompt || prompt.length > 4000) throw new AttemptError("Requests must be between 1 and 4,000 characters.");
  if (typeof input.clientMsgId !== "string" || !MSG_ID.test(input.clientMsgId)) throw new AttemptError("Invalid request id.");
  const workspace = await getWorkspace(db, attempt.id);
  const known = new Set([...(workspace?.files ?? pkg.starterFiles).map((f) => f.path)]);
  const paths = Array.isArray(input.contextPaths)
    ? [...new Set(input.contextPaths.filter((p): p is string => typeof p === "string"))].slice(0, 6)
    : [];
  if (paths.some((p) => !known.has(p))) throw new AttemptError("Share only files from the task workspace.");
  const sent = parseShared(input.files);
  const shared = paths.map((p) => sent.find((f) => f.path === p) ?? workspace?.files.find((f) => f.path === p)).filter((f): f is AssistantPatchFile => Boolean(f));
  const contextSha = shared.length ? sha256Hex(shared.map((f) => `${f.path}\u0000${f.content}`).join("\u0000")) : null;

  const { data: prior } = await db.from("eng_assistant_interactions").select("*").eq("attempt_id", attempt.id).eq("client_msg_id", input.clientMsgId).maybeSingle();
  if (prior) {
    const all = await listInteractions(db, attempt.id);
    return { interaction: interactionView(prior as AssistantRow), used: usedCount(all), limit: ASSISTANT_LIMIT };
  }

  const { data: claimed, error } = await db.rpc("eng_claim_assistant_interaction", {
    p_attempt_id: attempt.id,
    p_client_msg_id: input.clientMsgId,
    p_prompt: prompt,
    p_context_paths: paths,
    p_context_sha256: contextSha,
    p_limit: ASSISTANT_LIMIT,
    p_stale_seconds: ASSISTANT_STALE_SECONDS,
  });
  const row = (Array.isArray(claimed) ? claimed[0] : claimed) as AssistantRow | undefined;
  if (error || !row) throw new AttemptError("Could not send the request. Try again.", 500);

  let final = row;
  if (row.status === "running") {
    final = await answer(db, pkg, row, prompt, shared);
    await recordEngEvent(db, attempt.id, {
      type: "assistant_interaction",
      actor: "candidate",
      actorUserId: userId,
      payload: { interactionId: final.id, status: final.status, contextPaths: paths, patchPaths: (final.patch ?? []).map((p) => p.path) },
      clientEventId: `assistant_${input.clientMsgId}`,
    });
  }
  const all = await listInteractions(db, attempt.id);
  return { interaction: interactionView(final), used: usedCount(all), limit: ASSISTANT_LIMIT };
}

async function answer(db: Admin, pkg: ScenarioPackage, row: AssistantRow, prompt: string, shared: AssistantPatchFile[]): Promise<AssistantRow> {
  const finish = async (fields: Partial<AssistantRow> & { status: AssistantStatus }, meta: { provider?: string; model?: string; usage?: Record<string, number> } = {}) => {
    const { data } = await db
      .from("eng_assistant_interactions")
      .update({
        status: fields.status,
        answer: fields.answer ?? "",
        patch: fields.patch && fields.patch.length ? fields.patch : null,
        decision: fields.patch && fields.patch.length ? "pending" : "none",
        provider: meta.provider ?? null,
        model: meta.model ?? null,
        usage: meta.usage ?? null,
        finished_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("status", "running")
      .select("*")
      .maybeSingle();
    return (data as AssistantRow | null) ?? row;
  };

  const config = getProviderConfig();
  if (!config) return finish({ status: "provider_unavailable" });
  const ctx = assistantContext(shared);
  const patchable = shared.filter((f) => !ctx.truncated.includes(f.path));
  const messages = assistantPrompt(pkg, prompt, shared);
  const extraBody = config.provider === "groq" && config.model.includes("gpt-oss") ? { reasoning_effort: "low" } : undefined;
  let content = "";
  for (let i = 0; ; i++) {
    try {
      content = await postChatCompletion(config, messages, { schema: ASSISTANT_SCHEMA, schemaName: "assistant_reply", temperature: 0.2, maxTokens: 2500, extraBody });
      break;
    } catch (error) {
      const rateLimited = error instanceof Error && /\b429\b/.test(error.message);
      if (!rateLimited || i >= 1) return finish({ status: "provider_unavailable" }, { provider: config.provider, model: config.model });
      await new Promise((r) => setTimeout(r, 12_000));
    }
  }
  const usage = { promptChars: messages.reduce((n, m) => n + m.content.length, 0), completionChars: content.length };
  let parsed: unknown;
  try {
    parsed = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return finish({ status: "invalid_output" }, { provider: config.provider, model: config.model, usage });
  }
  const checked = checkAssistantOutput(parsed, patchable);
  if (checked.ok === false) return finish({ status: "invalid_output" }, { provider: config.provider, model: config.model, usage });
  if (checked.patch.length) {
    const valid = validateCandidateFiles(pkg, checked.patch);
    if (valid.ok === false) return finish({ status: "answered", answer: `${checked.answer}\n\n(The proposed edit touched files you cannot change, so it was not attached.)` }, { provider: config.provider, model: config.model, usage });
  }
  return finish({ status: "answered", answer: checked.answer, patch: checked.patch }, { provider: config.provider, model: config.model, usage });
}

export async function decideAssistantPatch(
  db: Admin,
  authored: AuthoredAttempt,
  userId: string,
  interactionId: string,
  input: { decision: unknown; appliedRevision: unknown },
): Promise<AssistantInteractionView> {
  requireCollaborating(authored);
  const { attempt } = authored;
  if (input.decision !== "accepted" && input.decision !== "rejected") throw new AttemptError("Choose accept or reject.");
  const { data } = await db.from("eng_assistant_interactions").select("*").eq("id", interactionId).eq("attempt_id", attempt.id).maybeSingle();
  const row = data as AssistantRow | null;
  if (!row) throw new AttemptError("That assistant response was not found.", 404);
  if (row.decision === input.decision) return interactionView(row);
  if (row.decision !== "pending") throw new AttemptError("You already decided on this change.", 409);
  let appliedRevision: number | null = null;
  if (input.decision === "accepted") {
    const rev = input.appliedRevision;
    if (typeof rev !== "number" || !Number.isInteger(rev) || rev < 1) throw new AttemptError("Save the accepted change before confirming it.");
    const ws = await getWorkspace(db, attempt.id);
    if (!ws || ws.revision < rev) throw new AttemptError("Save the accepted change before confirming it.", 409);
    appliedRevision = rev;
  }
  const { data: updated } = await db
    .from("eng_assistant_interactions")
    .update({ decision: input.decision, decided_at: new Date().toISOString(), applied_revision: appliedRevision })
    .eq("id", row.id)
    .eq("decision", "pending")
    .select("*")
    .maybeSingle();
  const final = (updated as AssistantRow | null) ?? row;
  if (updated) {
    await recordEngEvent(db, attempt.id, {
      type: "assistant_patch_decided",
      actor: "candidate",
      actorUserId: userId,
      payload: {
        interactionId: row.id,
        decision: input.decision,
        appliedRevision,
        paths: (row.patch ?? []).map((p) => p.path),
        patchSha256: sha256Hex(JSON.stringify(row.patch ?? [])),
      },
      clientEventId: `assistant_decision_${row.id}`,
    });
  }
  return interactionView(final);
}

/* ------------------------------------------------------------------ */
/* Employer view                                                       */
/* ------------------------------------------------------------------ */

export interface EmployerCollaboration {
  teammates: CollaborationView["teammates"];
  messages: CollaborationView["messages"];
  communication: CommunicationItem[];
  assistant: AssistantUseSummary & { enabled: boolean; policyText: string };
}

/** Read-only: never releases events. For employers with evidence access only. */
export async function employerCollaboration(
  db: Admin,
  authored: Pick<AuthoredAttempt, "attempt" | "pkg">,
  handoff: Array<{ id: string; label: string; answer: string }> | null,
  submittedFiles: PackageFile[] | null,
): Promise<EmployerCollaboration> {
  const { attempt, pkg } = authored;
  const [rows, interactions, { data: faults }] = await Promise.all([
    listRows(db, attempt.id),
    listInteractions(db, attempt.id),
    db.from("eng_public_test_runs").select("created_at").eq("attempt_id", attempt.id).in("status", ["infrastructure_error", "runner_unavailable"]),
  ]);
  const messages = rows.map(messageView);
  const views = interactions.map((r) => interactionView(r));
  return {
    teammates: pkg.coworkers.map((c) => ({ id: c.id, name: c.name, title: c.title, responsibilities: c.responsibilities, topics: c.topics })),
    messages,
    communication: buildCommunicationEvidence({
      hasTeammates: pkg.coworkers.length > 0,
      messages,
      handoff,
      submitted: attempt.status === "submitted" || Boolean(attempt.submitted_at),
      technicalIssues: (faults ?? []).map((f) => ({ at: f.created_at as string })),
    }),
    assistant: { ...summarizeAssistantUse(views, submittedFiles), enabled: assistantEnabled(pkg.aiPolicy.id), policyText: pkg.aiPolicy.candidateText },
  };
}

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

export async function buildCollaborationView(db: Admin, authored: AuthoredAttempt, opts: { release?: boolean; reviewOpened?: boolean } = {}): Promise<CollaborationView> {
  const { attempt, pkg } = authored;
  if (opts.release !== false) await releaseDueEvents(db, authored, { reviewOpened: opts.reviewOpened });
  const [rows, interactions] = await Promise.all([listRows(db, attempt.id), listInteractions(db, attempt.id)]);
  const messages = rows.map(messageView);
  return {
    teammates: pkg.coworkers.map((c) => ({ id: c.id, name: c.name, title: c.title, responsibilities: c.responsibilities, topics: c.topics })),
    messages,
    assistant: {
      enabled: assistantEnabled(pkg.aiPolicy.id),
      policyText: pkg.aiPolicy.candidateText,
      used: usedCount(interactions),
      limit: ASSISTANT_LIMIT,
      interactions: interactions.map((r) => interactionView(r)),
    },
    events: messages.filter((m) => m.eventKey).map((m) => ({ key: m.eventKey as ScenarioEventKey, releasedAt: m.createdAt })),
    eventDisclosure: eventDisclosure(pkg),
    open: canCollaborate(authored),
  };
}
