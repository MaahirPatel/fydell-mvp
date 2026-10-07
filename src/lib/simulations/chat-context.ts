import "server-only";
/**
 * SessionChatContext: grounded, observable facts about what the candidate has
 * actually done in this session. Built from session state + events - never
 * from answer keys, rubrics, or hidden scenario material.
 *
 * Stakeholder replies use this to stay aware of the session (files opened,
 * questions answered, time elapsed) instead of answering blind. Every field
 * here is something the candidate did, never something the scenario hides.
 */
export interface SessionChatContext {
  /** Whole minutes since the session started (0 when not started). */
  elapsedMinutes: number;
  /** Whole minutes since the curveball was presented (null when not presented). */
  minutesSinceCurveball: number | null;
  /** Question ids with a non-empty recorded answer. */
  answeredQuestionIds: string[];
  /** Task ids marked complete. */
  completedTaskIds: string[];
  /** Resource ids the candidate opened. */
  openedResourceIds: string[];
  /** Total flagged rows across the workspace. */
  flaggedRowCount: number;
  /** Candidate-actor events recorded this session. */
  candidateEventCount: number;
  /** Candidate messages sent in the stakeholder thread. */
  candidateMessageCount: number;
  curveballPresented: boolean;
  /** Authored response-rule ids that already fired (onceOnly semantics). */
  usedRuleIds: string[];
  /** Proactive message def ids already delivered (onceOnly semantics). */
  usedProactiveIds: string[];
}

export interface ChatContextInput {
  startedAt: string | null;
  curveballPresentedAt: string | null;
  deliverable: Record<string, unknown>;
  workspace: Record<string, unknown>;
  completedTaskIds: string[];
  events: Array<{
    event_type: string;
    actor: string;
    resource_id: string | null;
    task_id?: string | null;
    payload: Record<string, unknown>;
  }>;
}

function isNonEmptyAnswer(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return true;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return false;
}

export function buildSessionChatContext(input: ChatContextInput): SessionChatContext {
  const now = Date.now();
  const startedAt = input.startedAt ? new Date(input.startedAt).getTime() : 0;
  const elapsedMinutes = startedAt > 0 ? Math.max(0, Math.floor((now - startedAt) / 60000)) : 0;
  const cbAt = input.curveballPresentedAt ? new Date(input.curveballPresentedAt).getTime() : 0;
  const minutesSinceCurveball = cbAt > 0 ? Math.max(0, Math.floor((now - cbAt) / 60000)) : null;

  const answeredQuestionIds = [
    ...new Set([
      ...Object.entries(input.deliverable || {})
        .filter(([, v]) => isNonEmptyAnswer(v))
        .map(([k]) => k),
      // deliverable_field_edited events may arrive before the state PATCH
      // lands; count the edited field as answered regardless.
      ...input.events
        .filter((e) => e.event_type === "deliverable_field_edited")
        .map((e) => {
          const p = e.payload || {};
          for (const k of ["field", "fieldKey", "key", "questionId", "id"]) {
            const v = p[k];
            if (typeof v === "string" && v) return v;
          }
          return "";
        })
        .filter(Boolean),
    ]),
  ];

  const ws = input.workspace || {};
  const openedFromWorkspace = Array.isArray(ws.openedResources)
    ? (ws.openedResources as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const openedFromEvents = input.events
    .filter((e) => e.event_type === "resource_opened" && e.resource_id)
    .map((e) => e.resource_id as string);
  const openedResourceIds = [...new Set([...openedFromWorkspace, ...openedFromEvents])];

  let flaggedRowCount = 0;
  const flagged = ws.flaggedRows;
  if (flagged && typeof flagged === "object") {
    for (const v of Object.values(flagged)) {
      if (Array.isArray(v)) flaggedRowCount += v.length;
    }
  }

  const completedTaskIds = [
    ...new Set([
      ...(input.completedTaskIds || []),
      // task_completed events may arrive before the state PATCH lands.
      ...input.events
        .filter((e) => e.event_type === "task_completed")
        .map((e) => {
          const p = e.payload || {};
          const fromPayload =
            typeof p.taskId === "string" && p.taskId
              ? p.taskId
              : typeof p.task_id === "string" && p.task_id
                ? p.task_id
                : "";
          const fromField = typeof e.task_id === "string" && e.task_id ? e.task_id : "";
          return fromPayload || fromField;
        })
        .filter(Boolean),
    ]),
  ];
  const candidateEventCount = input.events.filter((e) => e.actor === "candidate").length;
  const candidateMessageCount = input.events.filter(
    (e) => e.event_type === "message_sent" && e.actor === "candidate"
  ).length;

  const usedRuleIds = input.events
    .filter((e) => e.event_type === "message_received")
    .map((e) => (e.payload as { ruleId?: string }).ruleId)
    .filter((r): r is string => Boolean(r));

  const usedProactiveIds = input.events
    .filter((e) => e.event_type === "proactive_message_delivered")
    .map((e) => (e.payload as { proactiveId?: string }).proactiveId)
    .filter((r): r is string => Boolean(r));

  return {
    elapsedMinutes,
    minutesSinceCurveball,
    answeredQuestionIds,
    completedTaskIds,
    openedResourceIds,
    flaggedRowCount,
    candidateEventCount,
    candidateMessageCount,
    curveballPresented: cbAt > 0,
    usedRuleIds,
    usedProactiveIds,
  };
}

/**
 * Human-readable one-liners describing the session, for the AI redraft prompt.
 * Facts only - never answers, rubrics, or hidden content.
 */
export function describeSessionContext(ctx: SessionChatContext): string[] {
  const lines = [
    `${ctx.elapsedMinutes} minute(s) elapsed in the session`,
    `${ctx.answeredQuestionIds.length} question(s) answered${ctx.answeredQuestionIds.length ? ` (${ctx.answeredQuestionIds.join(", ")})` : ""}`,
    `${ctx.candidateMessageCount} message(s) sent by the candidate so far`,
    `${ctx.candidateEventCount} candidate action(s) recorded`,
  ];
  if (ctx.openedResourceIds.length) lines.push(`Resources opened: ${ctx.openedResourceIds.join(", ")}`);
  if (ctx.completedTaskIds.length) lines.push(`Tasks completed: ${ctx.completedTaskIds.join(", ")}`);
  if (ctx.flaggedRowCount) lines.push(`${ctx.flaggedRowCount} row(s) flagged in the workspace`);
  lines.push(`Curveball presented: ${ctx.curveballPresented ? "yes" : "no"}`);
  return lines;
}

/**
 * Adapts raw session events to the ChatContextInput shape.
 */
export function toChatEvents(
  events: Array<{
    event_type: string;
    actor: string;
    resource_id: string | null;
    task_id?: string | null;
    payload: Record<string, unknown>;
  }>
): ChatContextInput["events"] {
  return events.map((e) => ({
    event_type: e.event_type,
    actor: e.actor,
    resource_id: e.resource_id,
    task_id: e.task_id ?? null,
    payload: (e.payload || {}) as Record<string, unknown>,
  }));
}
