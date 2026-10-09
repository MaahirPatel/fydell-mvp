import type { AuthoredFile } from "@/lib/eng/authored/types";
import type { EditorTab } from "./EditorArea";
import type { ActivityItem, ActivityKind } from "./Sidebar";

/**
 * A development-grade local copy of the workspace kept in this browser, so a
 * reload or dropped connection does not lose unsaved buffers. It is a draft,
 * never the record: the server copy is what is reviewed and submitted.
 */
export interface LocalDraft {
  v: 1;
  savedAt: string;
  revision: number;
  files: AuthoredFile[];
  tabs: EditorTab[];
  active: string | null;
  cursors: Record<string, { line: number; column: number }>;
  localMode: boolean;
  activity: ActivityItem[];
  answers: Record<string, string>;
  aiUse: string;
}

export const draftKey = (attemptId: string) => `fydell.sim.ws.${attemptId}`;

const ACTIVITY_KINDS = new Set<ActivityKind>(["tests", "save", "assistant", "scenario", "sync", "team", "problem"]);

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function files(v: unknown): AuthoredFile[] | null {
  if (!Array.isArray(v)) return null;
  const out: AuthoredFile[] = [];
  for (const f of v) {
    if (!isObject(f) || typeof f.path !== "string" || typeof f.content !== "string") return null;
    out.push({ path: f.path, content: f.content });
  }
  return out;
}

function tabs(v: unknown): EditorTab[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((t): EditorTab[] => (isObject(t) && (t.kind === "file" || t.kind === "diff") && typeof t.path === "string" ? [{ kind: t.kind, path: t.path }] : []));
}

function strings(v: unknown): Record<string, string> {
  if (!isObject(v)) return {};
  return Object.fromEntries(Object.entries(v).filter((e): e is [string, string] => typeof e[1] === "string"));
}

function cursors(v: unknown): LocalDraft["cursors"] {
  if (!isObject(v)) return {};
  const out: LocalDraft["cursors"] = {};
  for (const [k, c] of Object.entries(v)) if (isObject(c) && typeof c.line === "number" && typeof c.column === "number") out[k] = { line: c.line, column: c.column };
  return out;
}

function activity(v: unknown): ActivityItem[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((a): ActivityItem[] =>
    isObject(a) && typeof a.id === "string" && typeof a.at === "string" && typeof a.text === "string" && typeof a.kind === "string" && ACTIVITY_KINDS.has(a.kind as ActivityKind)
      ? [{ id: a.id, at: a.at, kind: a.kind as ActivityKind, text: a.text }]
      : [],
  );
}

export function readDraft(attemptId: string): LocalDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(attemptId));
    if (!raw) return null;
    const d: unknown = JSON.parse(raw);
    if (!isObject(d) || d.v !== 1 || typeof d.revision !== "number" || typeof d.savedAt !== "string") return null;
    const f = files(d.files);
    if (!f) return null;
    return {
      v: 1,
      savedAt: d.savedAt,
      revision: d.revision,
      files: f,
      tabs: tabs(d.tabs),
      active: typeof d.active === "string" ? d.active : null,
      cursors: cursors(d.cursors),
      localMode: d.localMode === true,
      activity: activity(d.activity),
      answers: strings(d.answers),
      aiUse: typeof d.aiUse === "string" ? d.aiUse : "",
    };
  } catch {
    return null;
  }
}

export function writeDraft(attemptId: string, draft: LocalDraft) {
  try {
    window.localStorage.setItem(draftKey(attemptId), JSON.stringify(draft));
  } catch {
    /* Storage full or unavailable: the server copy is unaffected. */
  }
}

export function clearDraft(attemptId: string) {
  try {
    window.localStorage.removeItem(draftKey(attemptId));
  } catch {
    /* Nothing to clear. */
  }
}

const submissionKey = (attemptId: string) => `fydell.sim.submission.${attemptId}`;

/**
 * One client submission id per attempt, kept until the server confirms, so a
 * retry after a dropped response is recognised as the same submission.
 */
export function clientSubmissionId(attemptId: string): string {
  const fresh = `web_${crypto.randomUUID().replace(/-/g, "")}`;
  try {
    const existing = window.localStorage.getItem(submissionKey(attemptId));
    if (existing && /^[A-Za-z0-9_-]{8,80}$/.test(existing)) return existing;
    window.localStorage.setItem(submissionKey(attemptId), fresh);
  } catch {
    /* Without storage the id lives for this page only; the server still accepts one submission per attempt. */
  }
  return fresh;
}

export function clearClientSubmissionId(attemptId: string) {
  try {
    window.localStorage.removeItem(submissionKey(attemptId));
  } catch {
    /* Nothing to clear. */
  }
}
