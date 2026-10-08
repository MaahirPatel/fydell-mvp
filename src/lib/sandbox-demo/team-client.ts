import type { DemoScenario } from "./catalog-types";
import { diffFiles, toHunks } from "./diff";
import { runtimeFor } from "./runtime";
import type { ScenarioProgress, TeamMessage } from "./state";
import {
  CHECKIN_TRIGGERS,
  HISTORY_LIMIT,
  HUNK_CHAR_LIMIT,
  type CheckinInput,
  type CheckinTrigger,
  type RunSummary,
  type WorkspaceContext,
} from "./team";
import type { RunRecord } from "./types";

/**
 * Client-side helpers around the team contract: building requests from a
 * scenario's progress, narrowing responses, and folding replies into the
 * thread. Pure, so the script tests can cover them.
 */

export const TEAM_ENDPOINT = "/api/sandbox-demo/team";

const UNAVAILABLE_REASONS = ["not_configured", "provider_error", "rate_limited", "rejected"] as const;

/** A history turn. Teammate ids are the scenario's own, so they are plain strings here. */
export type TeamTurn = { from: string; to: string | null; text: string };

export type TeamReply = {
  clientMsgId: string;
  teammateId: string;
  kind: "reply" | "checkin";
  trigger: CheckinTrigger | null;
  text: string;
  factIds: string[];
};

export type TeamResponse =
  | { status: "answered"; reply: TeamReply }
  | { status: "unavailable"; reason: (typeof UNAVAILABLE_REASONS)[number]; retryAfterSeconds: number | null; message: string };

/** The request body. `scenarioKey` tells the server whose teammates and facts to use. */
export type TeamRequest =
  | { kind: "message"; scenarioKey: string; clientMsgId: string; teammateId: string; text: string; history: TeamTurn[]; workspace: WorkspaceContext }
  | { kind: "checkin"; scenarioKey: string; clientMsgId: string; trigger: CheckinTrigger; history: TeamTurn[]; workspace: WorkspaceContext };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function memberOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

function parseReply(value: unknown, teammateIds: readonly string[]): TeamReply | null {
  if (!isRecord(value)) return null;
  const { clientMsgId, teammateId, kind, trigger, text, factIds } = value;
  if (typeof clientMsgId !== "string" || clientMsgId.length === 0) return null;
  if (!memberOf(teammateIds, teammateId)) return null;
  if (kind !== "reply" && kind !== "checkin") return null;
  if (typeof text !== "string" || text.trim().length === 0) return null;
  const parsedTrigger = trigger === null || trigger === undefined ? null : memberOf(CHECKIN_TRIGGERS, trigger) ? trigger : undefined;
  if (parsedTrigger === undefined) return null;
  if (kind === "checkin" && parsedTrigger === null) return null;
  return {
    clientMsgId,
    teammateId,
    kind,
    trigger: parsedTrigger,
    text: text.trim(),
    factIds: Array.isArray(factIds) ? factIds.filter((f): f is string => typeof f === "string") : [],
  };
}

/** Narrows a response body against the scenario's teammates. Anything that does not match the contract is null. */
export function parseTeamResponse(value: unknown, teammateIds: readonly string[]): TeamResponse | null {
  if (!isRecord(value)) return null;
  if (value.status === "answered") {
    const reply = parseReply(value.reply, teammateIds);
    return reply ? { status: "answered", reply } : null;
  }
  if (value.status === "unavailable") {
    const { reason, retryAfterSeconds, message } = value;
    if (!memberOf(UNAVAILABLE_REASONS, reason) || typeof message !== "string") return null;
    const retry = typeof retryAfterSeconds === "number" && Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0 ? retryAfterSeconds : null;
    return { status: "unavailable", reason, retryAfterSeconds: retry, message };
  }
  return null;
}

export type TeamCallResult = { kind: "answered"; reply: TeamReply } | { kind: "unavailable"; message: string; retryAfterSeconds: number | null };

/** The outcome of a POST, in words the panel can show as is. Never invents a reply. */
export function interpretTeamCall(status: number, body: unknown, teammateIds: readonly string[]): TeamCallResult {
  const parsed = parseTeamResponse(body, teammateIds);
  if (parsed?.status === "answered") return { kind: "answered", reply: parsed.reply };
  if (parsed?.status === "unavailable") return { kind: "unavailable", message: parsed.message, retryAfterSeconds: parsed.retryAfterSeconds };
  if (status === 0) return { kind: "unavailable", message: "Not sent. Check your connection, then retry.", retryAfterSeconds: null };
  if (status === 404) return { kind: "unavailable", message: "The teammate service is not available on this server yet.", retryAfterSeconds: null };
  if (status === 400) return { kind: "unavailable", message: "The server could not accept this message.", retryAfterSeconds: null };
  if (status === 429) return { kind: "unavailable", message: "Too many messages in a short time. Wait a moment, then retry.", retryAfterSeconds: null };
  return { kind: "unavailable", message: "The teammate service did not answer. Retry in a moment.", retryAfterSeconds: null };
}

/** 32 hex characters, inside the 8 to 64 [A-Za-z0-9_-] the server accepts. */
export function newMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID().replace(/-/g, "");
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function checkinClientId(trigger: CheckinTrigger): string {
  return `checkin_${trigger}`;
}

export function replyMessageId(clientMsgId: string): string {
  return `reply_${clientMsgId}`;
}

/** Teammate turns and answered candidate turns, oldest first, bounded. */
export function toHistory(team: TeamMessage[], excludeId: string | null = null): TeamTurn[] {
  return team
    .flatMap((m): TeamTurn[] => {
      if (m.id === excludeId || m.kind === "notice" || m.from === "system") return [];
      if (m.from === "you") return m.status === "sent" && m.to ? [{ from: "you", to: m.to, text: m.text }] : [];
      return [{ from: m.from, to: null, text: m.text }];
    })
    .slice(-HISTORY_LIMIT);
}

export function minutesBetween(fromIso: string | null, now: number): number {
  if (!fromIso) return 0;
  const start = Date.parse(fromIso);
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((now - start) / 60_000));
}

/** A run as the teammates see it: public tests only, named as the candidate sees them. */
export function summarizeRun(scenario: DemoScenario, run: RunRecord): RunSummary {
  const rt = runtimeFor(scenario);
  const publicResults = run.results.filter((r) => rt.testMeta(r.id)?.visibility === "public");
  return {
    at: run.at,
    outcome: run.outcome,
    passed: publicResults.filter((r) => r.status === "pass").length,
    total: publicResults.length,
    failing: publicResults.filter((r) => r.status !== "pass").map((r) => rt.testMeta(r.id)?.name ?? r.id),
  };
}

/** The candidate's edits as bounded unified hunks, the same diff the Changes view shows. */
export function workspaceChanges(scenario: DemoScenario, files: Record<string, string>): WorkspaceContext["changes"] {
  const rt = runtimeFor(scenario);
  let budget = HUNK_CHAR_LIMIT;
  return diffFiles(rt.starterFiles, { ...rt.starterFiles, ...files }, rt.editablePaths).map((d) => {
    const text = toHunks(d.ops, 2)
      .map((h) => [h.header, ...h.ops.map((o) => `${o.kind === "add" ? "+" : o.kind === "del" ? "-" : " "}${o.text}`)].join("\n"))
      .join("\n");
    const hunks = text.length <= budget ? text : `${text.slice(0, Math.max(0, budget))}\n[diff truncated]`;
    budget = Math.max(0, budget - hunks.length);
    return { path: d.path, added: d.added, removed: d.removed, hunks };
  });
}

export function buildWorkspace(scenario: DemoScenario, progress: ScenarioProgress, now: number): WorkspaceContext {
  return {
    elapsedMinutes: minutesBetween(progress.startedAt, now),
    runCount: progress.runCount,
    lastRun: progress.lastRun ? summarizeRun(scenario, progress.lastRun) : null,
    changes: workspaceChanges(scenario, progress.files),
  };
}

export function askedTeammate(team: TeamMessage[], id: string): boolean {
  return team.some((m) => m.from === "you" && m.to === id);
}

/**
 * Who sends a check-in in this scenario: the first teammate owns the work,
 * the second (when there is one) brings the outside context.
 */
export function checkinSenderId(scenario: DemoScenario, trigger: CheckinTrigger): string {
  const [owner, context] = scenario.teammates;
  if (trigger === "support_context" && context) return context.id;
  return owner?.id ?? "";
}

export function checkinInput(scenario: DemoScenario, progress: ScenarioProgress, now: number): CheckinInput {
  return {
    delivered: new Set(progress.delivered),
    elapsedMinutes: minutesBetween(progress.startedAt, now),
    idleMinutes: minutesBetween(progress.lastActivityAt ?? progress.startedAt, now),
    runs: progress.runs,
    askedTheo: askedTeammate(progress.team, checkinSenderId(scenario, "support_context")),
  };
}

/** Adds a teammate's answer once, whatever the number of retries that produced it. */
export function appendReply(team: TeamMessage[], reply: TeamReply, at: string): TeamMessage[] {
  const id = replyMessageId(reply.clientMsgId);
  if (team.some((m) => m.id === id)) return team;
  const message: TeamMessage = {
    id,
    from: reply.teammateId,
    to: null,
    text: reply.text,
    kind: reply.kind === "checkin" ? "checkin" : "message",
    trigger: reply.trigger,
    factIds: reply.factIds,
    at,
    status: "sent",
    notice: null,
  };
  return [...team, message];
}

export function setMessageStatus(team: TeamMessage[], id: string, status: TeamMessage["status"], notice: string | null): TeamMessage[] {
  return team.map((m) => (m.id === id ? { ...m, status, notice } : m));
}

export function checkinFailureText(scenario: DemoScenario, trigger: CheckinTrigger): string {
  const sender = scenario.teammates.find((m) => m.id === checkinSenderId(scenario, trigger));
  const first = sender ? sender.name.split(" ")[0] : "Your teammate";
  return `${first}'s check-in could not be written: the model is unavailable.`;
}

/** Backoff before the next try of a failed check-in: 20s, then 60s. */
export function checkinBackoffMs(failures: number): number {
  return failures <= 1 ? 20_000 : 60_000;
}

export const CHECKIN_MAX_TRIES = 3;
