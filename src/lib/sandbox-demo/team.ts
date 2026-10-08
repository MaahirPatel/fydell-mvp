import { diffFiles, toHunks } from "./diff";
import { EDITABLE_PATHS, STARTER_FILES, testMeta } from "./scenario";
import type { RunRecord } from "./types";

/**
 * Contract between the demo workspace and /api/sandbox-demo/team, plus the
 * deterministic rules for when a teammate checks in. Client-safe: no
 * scenario facts beyond what the candidate can already see.
 */

export const DEMO_TEAMMATE_IDS = ["dana", "theo"] as const;
export type DemoTeammateId = (typeof DEMO_TEAMMATE_IDS)[number];

/**
 * Published check-in triggers. Each fires at most once per attempt; the model
 * only chooses the wording, inside the same facts a reply could use.
 */
export const CHECKIN_TRIGGERS = ["kickoff", "support_context", "first_run", "stalled", "public_green"] as const;
export type CheckinTrigger = (typeof CHECKIN_TRIGGERS)[number];

export const CHECKIN_SENDER: Record<CheckinTrigger, DemoTeammateId> = {
  kickoff: "dana",
  support_context: "theo",
  first_run: "dana",
  stalled: "dana",
  public_green: "dana",
};

/** Plain-language trigger rules, shown to the candidate so check-ins are never a surprise. */
export const CHECKIN_RULES: Record<CheckinTrigger, string> = {
  kickoff: "When you open the task",
  support_context: "About four minutes in, unless you already asked support",
  first_run: "After your first test run",
  stalled: "If three runs in a row fail the same way, or fifteen minutes pass without passing tests and you have been quiet for six",
  public_green: "The first time every public test passes",
};

export type TeamTurn = {
  from: "you" | DemoTeammateId;
  /** For the candidate's turns, the teammate they addressed. */
  to: DemoTeammateId | null;
  text: string;
};

export type RunSummary = {
  at: string;
  outcome: RunRecord["outcome"];
  passed: number;
  total: number;
  /** Names of public tests that failed or did not run. */
  failing: string[];
};

export type WorkspaceContext = {
  elapsedMinutes: number;
  runCount: number;
  lastRun: RunSummary | null;
  /** Unified hunks of the candidate's own edits, bounded. */
  changes: { path: string; added: number; removed: number; hunks: string }[];
};

export type TeamRequest =
  | { kind: "message"; clientMsgId: string; teammateId: DemoTeammateId; text: string; history: TeamTurn[]; workspace: WorkspaceContext }
  | { kind: "checkin"; clientMsgId: string; trigger: CheckinTrigger; history: TeamTurn[]; workspace: WorkspaceContext };

export type TeamReply = {
  clientMsgId: string;
  teammateId: DemoTeammateId;
  kind: "reply" | "checkin";
  trigger: CheckinTrigger | null;
  text: string;
  /** Stable ids of the scenario facts the reply drew on. Empty when it only reflected the workspace or asked a question. */
  factIds: string[];
};

export type TeamResponse =
  | { status: "answered"; reply: TeamReply }
  | { status: "unavailable"; reason: "not_configured" | "provider_error" | "rate_limited" | "rejected"; retryAfterSeconds: number | null; message: string };

export const HISTORY_LIMIT = 14;
export const HUNK_CHAR_LIMIT = 3_500;
export const MESSAGE_CHAR_LIMIT = 1_200;

export function summarizeRun(run: RunRecord): RunSummary {
  const publicResults = run.results.filter((r) => testMeta(r.id)?.visibility === "public");
  return {
    at: run.at,
    outcome: run.outcome,
    passed: publicResults.filter((r) => r.status === "pass").length,
    total: publicResults.length,
    failing: publicResults.filter((r) => r.status !== "pass").map((r) => testMeta(r.id)?.name ?? r.id),
  };
}

/** The candidate's edits as bounded unified hunks, the same diff the Changes view shows. */
export function workspaceChanges(files: Record<string, string>): WorkspaceContext["changes"] {
  let budget = HUNK_CHAR_LIMIT;
  return diffFiles(STARTER_FILES, files, EDITABLE_PATHS).map((d) => {
    const text = toHunks(d.ops, 2)
      .map((h) => [h.header, ...h.ops.map((o) => `${o.kind === "add" ? "+" : o.kind === "del" ? "-" : " "}${o.text}`)].join("\n"))
      .join("\n");
    const hunks = text.length <= budget ? text : `${text.slice(0, Math.max(0, budget))}\n[diff truncated]`;
    budget = Math.max(0, budget - hunks.length);
    return { path: d.path, added: d.added, removed: d.removed, hunks };
  });
}

export type CheckinInput = {
  delivered: ReadonlySet<CheckinTrigger>;
  elapsedMinutes: number;
  /** Minutes since the candidate last edited, ran tests or sent a message. */
  idleMinutes: number;
  runs: RunSummary[];
  askedTheo: boolean;
};

/**
 * The next check-in that is due, or null. At most one at a time, in a fixed
 * priority, so two teammates never talk over each other.
 */
export function dueCheckin(input: CheckinInput): CheckinTrigger | null {
  const { delivered, elapsedMinutes, idleMinutes, runs, askedTheo } = input;
  const last = runs[runs.length - 1] ?? null;
  const green = last !== null && last.outcome === "completed" && last.total > 0 && last.passed === last.total;
  if (!delivered.has("kickoff")) return "kickoff";
  if (green && !delivered.has("public_green")) return "public_green";
  if (last && !delivered.has("first_run") && !green) return "first_run";
  if (!delivered.has("stalled") && !green && !runs.some((r) => r.outcome === "completed" && r.total > 0 && r.passed === r.total)) {
    const recent = runs.slice(-3);
    const sameFailures = recent.length === 3 && recent.every((r) => r.failing.length > 0 && r.failing.join("|") === recent[0].failing.join("|"));
    if (sameFailures || (elapsedMinutes >= 15 && idleMinutes >= 6)) return "stalled";
  }
  if (!delivered.has("support_context") && !askedTheo && elapsedMinutes >= 4) return "support_context";
  return null;
}
