import "server-only";
/**
 * Proactive stakeholder messages: the scenario's teammates speak first at
 * sensible session triggers (welcome, nudges, reactions to progress).
 *
 * Delivery is idempotent: each def delivers at most once per session via a
 * deterministic client_msg_id, and `proactive_message_delivered` events track
 * what fired. Every proactive message is tagged as simulation content in the
 * UI — these never claim real-world events or false authorship.
 */
import type {
  ProactiveMessageDef,
  ProactiveTrigger,
  SimulationContent,
  SimulationStakeholder,
} from "./types";
import { interpolateReply } from "./stakeholder";
import type { SessionChatContext } from "./chat-context";

function unlessBlocked(def: ProactiveMessageDef, ctx: SessionChatContext): boolean {
  const u = def.unless;
  if (!u) return false;
  if (u.openedResource && ctx.openedResourceIds.includes(u.openedResource)) return true;
  if (u.answeredQuestion && ctx.answeredQuestionIds.includes(u.answeredQuestion)) return true;
  if (u.minCandidateEvents !== undefined && ctx.candidateEventCount >= u.minCandidateEvents)
    return true;
  return false;
}

export function isProactiveDue(def: ProactiveMessageDef, ctx: SessionChatContext): boolean {
  if (unlessBlocked(def, ctx)) return false;
  const t: ProactiveTrigger = def.trigger;
  switch (t.kind) {
    case "session_start":
      return ctx.elapsedMinutes >= 0;
    case "elapsed_minutes":
      return ctx.elapsedMinutes >= t.minutes;
    case "curveball_elapsed_minutes":
      return ctx.minutesSinceCurveball !== null && ctx.minutesSinceCurveball >= t.minutes;
    case "candidate_events":
      return ctx.candidateEventCount >= t.count;
    case "answered_question":
      return ctx.answeredQuestionIds.includes(t.questionId);
    case "task_completed":
      return ctx.completedTaskIds.includes(t.taskId);
    case "curveball_presented":
      return ctx.curveballPresented;
  }
}

export interface DueProactive {
  stakeholder: SimulationStakeholder;
  def: ProactiveMessageDef;
  body: string;
}

/**
 * Pure evaluation: which proactive defs are due right now.
 * `usedIds` comes from `proactive_message_delivered` events.
 */
export function evaluateProactiveMessages(
  content: SimulationContent,
  ctx: SessionChatContext,
  usedIds: string[]
): DueProactive[] {
  const used = new Set(usedIds);
  const due: DueProactive[] = [];
  for (const stakeholder of content.stakeholders || []) {
    for (const def of stakeholder.proactiveMessages || []) {
      if (def.onceOnly !== false && used.has(def.id)) continue;
      if (!isProactiveDue(def, ctx)) continue;
      due.push({ stakeholder, def, body: interpolateReply(def.body, ctx) });
      if (def.onceOnly !== false) used.add(def.id);
    }
  }
  return due;
}

export interface ProactiveDeliveryDeps {
  sessionId: string;
  content: SimulationContent;
  ctx: SessionChatContext;
  insertMessage: (input: {
    sessionId: string;
    thread: "stakeholder";
    stakeholderId: string;
    sender: "stakeholder";
    body: string;
    clientMsgId: string;
  }) => Promise<{ duplicate: boolean }>;
  recordEvent: (input: {
    eventType: string;
    actor: "stakeholder";
    payload: Record<string, unknown>;
    clientEventId: string;
  }) => Promise<unknown>;
}

/**
 * Inserts every due proactive message and records delivery. Safe to call from
 * multiple routes — deterministic ids make re-delivery a no-op.
 * Returns the number of newly delivered messages.
 */
export async function deliverDueProactiveMessages(deps: ProactiveDeliveryDeps): Promise<number> {
  const due = evaluateProactiveMessages(deps.content, deps.ctx, deps.ctx.usedProactiveIds);
  let delivered = 0;
  for (const { stakeholder, def, body } of due) {
    try {
      const { duplicate } = await deps.insertMessage({
        sessionId: deps.sessionId,
        thread: "stakeholder",
        stakeholderId: stakeholder.id,
        sender: "stakeholder",
        body,
        clientMsgId: `proactive_${def.id}`,
      });
      await deps.recordEvent({
        eventType: "proactive_message_delivered",
        actor: "stakeholder",
        payload: { stakeholderId: stakeholder.id, proactiveId: def.id },
        clientEventId: `proactive_evt_${def.id}`,
      });
      if (!duplicate) delivered++;
    } catch {
      // Best-effort: a failed proactive message must never break the session.
    }
  }
  return delivered;
}
