import type { DemoScenario } from "./catalog-types";
import { demoScenario } from "./catalog";
import { runtimeFor, testId } from "./runtime";
import { TESTS as LEGACY_TESTS } from "./scenario";
import { CHECKIN_TRIGGERS, type CheckinTrigger, type RunSummary } from "./team";
import type { RunRecord, TestResult } from "./types";

/**
 * Demo state lives in React and in localStorage under one key, with one
 * progress record per scenario. This is a local store for a public demo, not
 * durable storage. Only the team panel sends anything off the device: the
 * message, recent turns and a bounded summary of the candidate's edits and
 * test results.
 */
export const STORAGE_KEY = "fydell-sandbox-v3";
/** Where versions 1 and 2 lived. Read once for migration and cleared on save and reset. */
export const LEGACY_STORAGE_KEYS = ["fydell-sandbox-v2", "fydell-sandbox-v1"] as const;
/** Versions 1 and 2 only ever held the payment event inbox. */
export const LEGACY_SCENARIO_KEY = "event-inbox";

export const MESSAGE_KINDS = ["message", "checkin", "notice"] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];

/** `sending` and `unavailable` only apply to the candidate's own turns. */
export const MESSAGE_STATUSES = ["sending", "sent", "unavailable"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export type TeamMessage = {
  /** For the candidate's turns this is also the clientMsgId sent to the server. */
  id: string;
  /** "you", "system" or one of the scenario's teammate ids. */
  from: string;
  to: string | null;
  text: string;
  kind: MessageKind;
  trigger: CheckinTrigger | null;
  factIds: string[];
  at: string;
  status: MessageStatus;
  /** Why a candidate turn got no reply, in the server's words. */
  notice: string | null;
};

export const HANDOFF_FIELDS = ["changed", "checked", "unresolved"] as const;
export type HandoffField = (typeof HANDOFF_FIELDS)[number];
export type Handoff = Record<HandoffField, string>;

export const HANDOFF_PROMPTS: Record<HandoffField, string> = {
  changed: "What did you change?",
  checked: "How did you check it?",
  unresolved: "What remains unresolved?",
};

export function emptyHandoff(): Handoff {
  return { changed: "", checked: "", unresolved: "" };
}

export function hasHandoff(handoff: Handoff): boolean {
  return HANDOFF_FIELDS.some((f) => handoff[f].trim().length > 0);
}

export type Attempt = {
  id: string;
  at: string;
  files: Record<string, string>;
  run: RunRecord;
  handoff: Handoff;
  /** A copy of the team thread at the moment of submission. */
  transcript: TeamMessage[];
};

export const DECISIONS = ["advance", "hold", "decline"] as const;
export type DecisionValue = (typeof DECISIONS)[number];
export type Decision = { value: DecisionValue; at: string };

export type ReviewDraft = { followUp: string | null; privateNote: string | null; decision: Decision | null };

/** Everything one visitor did in one scenario. */
export type ScenarioProgress = {
  files: Record<string, string>;
  activeFile: string;
  lastRun: RunRecord | null;
  attempts: Attempt[];
  team: TeamMessage[];
  delivered: CheckinTrigger[];
  /** Set when the workspace first opens. */
  startedAt: string | null;
  /** Last edit, test run or message. */
  lastActivityAt: string | null;
  runs: RunSummary[];
  runCount: number;
  /** The handoff draft, kept while the candidate works. */
  handoff: Handoff;
  /** The employer view's draft for the latest attempt. */
  review: ReviewDraft;
};

export type DemoState = {
  version: 3;
  scenarios: Record<string, ScenarioProgress>;
};

export const TEAM_LIMIT = 120;
export const RUN_SUMMARY_LIMIT = 20;
export const ATTEMPT_LIMIT = 10;
const TEXT_LIMIT = 4000;

export function emptyReview(): ReviewDraft {
  return { followUp: null, privateNote: null, decision: null };
}

export function starterEditableFiles(scenario: DemoScenario): Record<string, string> {
  const rt = runtimeFor(scenario);
  return Object.fromEntries(rt.editablePaths.map((p) => [p, rt.starterFiles[p]]));
}

export function initialProgress(scenario: DemoScenario): ScenarioProgress {
  return {
    files: starterEditableFiles(scenario),
    activeFile: runtimeFor(scenario).defaultFile,
    lastRun: null,
    attempts: [],
    team: [],
    delivered: [],
    startedAt: null,
    lastActivityAt: null,
    runs: [],
    runCount: 0,
    handoff: emptyHandoff(),
    review: emptyReview(),
  };
}

export function initialState(): DemoState {
  return { version: 3, scenarios: {} };
}

/** A scenario's progress, or a fresh record when the visitor has not started it. */
export function progressOf(state: DemoState, scenario: DemoScenario): ScenarioProgress {
  return state.scenarios[scenario.key] ?? initialProgress(scenario);
}

export function withProgress(state: DemoState, scenario: DemoScenario, recipe: (p: ScenarioProgress) => ScenarioProgress): DemoState {
  const current = progressOf(state, scenario);
  const next = recipe(current);
  return next === current && state.scenarios[scenario.key] ? state : { ...state, scenarios: { ...state.scenarios, [scenario.key]: next } };
}

export function withoutProgress(state: DemoState, key: string): DemoState {
  if (!(key in state.scenarios)) return state;
  const scenarios = { ...state.scenarios };
  delete scenarios[key];
  return { ...state, scenarios };
}

export type ProgressStatus = "not_started" | "in_progress" | "submitted";

export function progressStatus(progress: ScenarioProgress | undefined): ProgressStatus {
  if (!progress) return "not_started";
  if (progress.attempts.length > 0) return "submitted";
  return progress.startedAt ? "in_progress" : "not_started";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function oneOf<T extends string>(list: readonly T[], value: unknown, fallback: T): T {
  return typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : fallback;
}
function memberOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}
function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
function isoOrNull(value: unknown): string | null {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

/** Maps a result id across versions; version 2 used ids like "public.processes_once". */
type IdMap = (id: string) => string;
const sameId: IdMap = (id) => id;
const legacyId: IdMap = (id) => {
  const meta = LEGACY_TESTS.find((t) => t.id === id);
  return meta ? testId(meta.file, meta.name) : id;
};

function parseFiles(scenario: DemoScenario, value: unknown): Record<string, string> {
  const files = starterEditableFiles(scenario);
  if (!isRecord(value)) return files;
  for (const path of runtimeFor(scenario).editablePaths) {
    const text = value[path];
    if (typeof text === "string" && text.length <= 200_000) files[path] = text;
  }
  return files;
}

function parseResult(scenario: DemoScenario, value: unknown, mapId: IdMap): TestResult | null {
  if (!isRecord(value)) return null;
  const { id, status, message, durationMs } = value;
  if (typeof id !== "string") return null;
  const mapped = mapId(id);
  if (!runtimeFor(scenario).testMeta(mapped)) return null;
  if (status !== "pass" && status !== "fail" && status !== "not_run") return null;
  return { id: mapped, status, message: stringOrNull(message), durationMs: typeof durationMs === "number" ? durationMs : 0 };
}

export function parseRun(scenario: DemoScenario, value: unknown, mapId: IdMap = sameId): RunRecord | null {
  if (!isRecord(value)) return null;
  const { at, scope, outcome, outcomeMessage, results, logs, durationMs } = value;
  if (typeof at !== "string" || (scope !== "public" && scope !== "all")) return null;
  if (outcome !== "completed" && outcome !== "timeout" && outcome !== "error") return null;
  if (!Array.isArray(results)) return null;
  const parsed: TestResult[] = [];
  for (const r of results) {
    const p = parseResult(scenario, r, mapId);
    if (!p) return null;
    parsed.push(p);
  }
  return {
    at,
    scope,
    outcome,
    outcomeMessage: stringOrNull(outcomeMessage),
    results: parsed,
    logs: Array.isArray(logs) ? logs.filter((l): l is string => typeof l === "string").slice(0, 200) : [],
    durationMs: typeof durationMs === "number" ? durationMs : 0,
  };
}

function parseRunSummary(value: unknown): RunSummary | null {
  if (!isRecord(value)) return null;
  const { at, outcome, passed, total, failing } = value;
  if (isoOrNull(at) === null || !memberOf(["completed", "timeout", "error"] as const, outcome)) return null;
  if (typeof passed !== "number" || typeof total !== "number" || passed < 0 || total < 0 || passed > total) return null;
  if (!Array.isArray(failing) || !failing.every((f): f is string => typeof f === "string")) return null;
  return { at: at as string, outcome, passed, total, failing: failing.slice(0, 20) };
}

export function parseTeamMessage(scenario: DemoScenario, value: unknown): TeamMessage | null {
  if (!isRecord(value)) return null;
  const teammates = runtimeFor(scenario).teammateIds;
  const senders = ["you", "system", ...teammates];
  const { id, from, to, text, kind, trigger, factIds, at, status, notice } = value;
  if (typeof id !== "string" || id.length === 0 || id.length > 80) return null;
  if (!memberOf(senders, from) || !memberOf(MESSAGE_KINDS, kind)) return null;
  if (typeof text !== "string" || text.length === 0) return null;
  const sentAt = isoOrNull(at);
  if (!sentAt) return null;
  const recipient = to === null || to === undefined ? null : memberOf(teammates, to) ? to : undefined;
  if (recipient === undefined) return null;
  if (from === "you" && (recipient === null || kind !== "message")) return null;
  const parsedTrigger = trigger === null || trigger === undefined ? null : memberOf(CHECKIN_TRIGGERS, trigger) ? trigger : undefined;
  if (parsedTrigger === undefined) return null;
  if (kind === "checkin" && parsedTrigger === null) return null;
  let parsedStatus: MessageStatus = memberOf(MESSAGE_STATUSES, status) ? status : "sent";
  if (from !== "you") parsedStatus = "sent";
  // A request that was in flight when the page closed never got its answer.
  if (parsedStatus === "sending") parsedStatus = "unavailable";
  return {
    id,
    from,
    to: recipient,
    text: text.slice(0, TEXT_LIMIT),
    kind,
    trigger: parsedTrigger,
    factIds: Array.isArray(factIds) ? factIds.filter((f): f is string => typeof f === "string" && f.length <= 80).slice(0, 12) : [],
    at: sentAt,
    status: parsedStatus,
    notice:
      parsedStatus === "unavailable"
        ? (typeof notice === "string" ? notice.slice(0, 600) : "The reply did not arrive before the page closed.")
        : null,
  };
}

function parseTeam(scenario: DemoScenario, value: unknown): TeamMessage[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .flatMap((m): TeamMessage[] => {
      const parsed = parseTeamMessage(scenario, m);
      if (!parsed || seen.has(parsed.id)) return [];
      seen.add(parsed.id);
      return [parsed];
    })
    .slice(-TEAM_LIMIT);
}

function parseHandoff(value: unknown): Handoff {
  const handoff = emptyHandoff();
  if (!isRecord(value)) return handoff;
  for (const f of HANDOFF_FIELDS) {
    const text = value[f];
    if (typeof text === "string") handoff[f] = text.slice(0, TEXT_LIMIT);
  }
  return handoff;
}

function parseAttempts(scenario: DemoScenario, value: unknown, mapId: IdMap): Attempt[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((a): Attempt[] => {
      if (!isRecord(a) || typeof a.id !== "string" || typeof a.at !== "string") return [];
      const run = parseRun(scenario, a.run, mapId);
      if (!run) return [];
      return [
        { id: a.id, at: a.at, files: parseFiles(scenario, a.files), run, handoff: parseHandoff(a.handoff), transcript: parseTeam(scenario, a.transcript) },
      ];
    })
    .slice(-ATTEMPT_LIMIT);
}

function parseDecision(value: unknown): Decision | null {
  if (!isRecord(value) || typeof value.at !== "string") return null;
  const choice = value.value;
  return typeof choice === "string" && (DECISIONS as readonly string[]).includes(choice) ? { value: choice as DecisionValue, at: value.at } : null;
}

function parseReview(value: unknown): ReviewDraft {
  const review = isRecord(value) ? value : {};
  return {
    followUp: typeof review.followUp === "string" ? review.followUp.slice(0, 2000) : null,
    privateNote: typeof review.privateNote === "string" ? review.privateNote.slice(0, 4000) : null,
    decision: parseDecision(review.decision),
  };
}

function parseDelivered(value: unknown): CheckinTrigger[] {
  if (!Array.isArray(value)) return [];
  return CHECKIN_TRIGGERS.filter((t) => value.includes(t));
}

export function parseProgress(scenario: DemoScenario, value: unknown, mapId: IdMap = sameId): ScenarioProgress {
  const p = isRecord(value) ? value : {};
  const base = initialProgress(scenario);
  const runs = Array.isArray(p.runs) ? p.runs.flatMap((r) => parseRunSummary(r) ?? []).slice(-RUN_SUMMARY_LIMIT) : [];
  const runCount = typeof p.runCount === "number" && Number.isInteger(p.runCount) && p.runCount >= runs.length ? p.runCount : runs.length;
  return {
    files: parseFiles(scenario, p.files),
    activeFile: oneOf(runtimeFor(scenario).candidatePaths, p.activeFile, base.activeFile),
    lastRun: parseRun(scenario, p.lastRun, mapId),
    attempts: parseAttempts(scenario, p.attempts, mapId),
    team: parseTeam(scenario, p.team),
    delivered: parseDelivered(p.delivered),
    startedAt: isoOrNull(p.startedAt),
    lastActivityAt: isoOrNull(p.lastActivityAt),
    runs,
    runCount,
    handoff: parseHandoff(p.handoff),
    review: parseReview(p.review),
  };
}

/**
 * Versions 1 and 2 held one candidate for the payment event inbox. Version 1
 * had a prepared-reply chat, which is dropped: its replies were written in
 * advance and do not belong in a live thread. Test result ids are mapped to
 * the `file::name` form. Creator settings and views are gone with the
 * walkthrough they belonged to.
 */
export function migrateLegacy(value: Record<string, unknown>): DemoState {
  const scenario = demoScenario(LEGACY_SCENARIO_KEY);
  if (!scenario) return initialState();
  const candidate = isRecord(value.candidate) ? { ...value.candidate } : {};
  if (value.version === 1) {
    delete candidate.team;
    delete candidate.delivered;
  }
  const progress = parseProgress(scenario, { ...candidate, review: value.review }, legacyId);
  const untouched = JSON.stringify(progress) === JSON.stringify(initialProgress(scenario));
  return { version: 3, scenarios: untouched ? {} : { [scenario.key]: progress } };
}

/** Narrows anything read back from storage. Unknown or damaged state yields null. */
export function parseState(value: unknown): DemoState | null {
  if (!isRecord(value)) return null;
  if (value.version === 1 || value.version === 2) return migrateLegacy(value);
  if (value.version !== 3) return null;
  const scenarios: Record<string, ScenarioProgress> = {};
  if (isRecord(value.scenarios)) {
    for (const [key, raw] of Object.entries(value.scenarios)) {
      const scenario = demoScenario(key);
      if (scenario) scenarios[key] = parseProgress(scenario, raw);
    }
  }
  return { version: 3, scenarios };
}

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function readKey(storage: KeyValueStorage, key: string): DemoState | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parseState(parsed);
  } catch {
    return null;
  }
}

export function loadState(storage: KeyValueStorage | null): DemoState {
  if (!storage) return initialState();
  try {
    const current = readKey(storage, STORAGE_KEY);
    if (current) return current;
    for (const key of LEGACY_STORAGE_KEYS) {
      const legacy = readKey(storage, key);
      if (legacy) return legacy;
    }
    return initialState();
  } catch {
    return initialState();
  }
}

export function saveState(storage: KeyValueStorage | null, state: DemoState): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    for (const key of LEGACY_STORAGE_KEYS) storage.removeItem(key);
  } catch {
    // Storage can be full or blocked; the demo keeps working in memory.
  }
}

/** Clears the stored demo and returns a clean state. */
export function resetState(storage: KeyValueStorage | null): DemoState {
  if (storage) {
    try {
      storage.removeItem(STORAGE_KEY);
      for (const key of LEGACY_STORAGE_KEYS) storage.removeItem(key);
    } catch {
      // Blocked storage has nothing to clear.
    }
  }
  return initialState();
}

export function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}
