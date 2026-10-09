import type { DemoScenario } from "@/lib/sandbox-demo/catalog-types";
import { runtimeFor } from "@/lib/sandbox-demo/runtime";
import { DECISIONS, HANDOFF_FIELDS, parseRun, type DecisionValue, type Handoff } from "@/lib/sandbox-demo/state";
import type { RunRecord } from "@/lib/sandbox-demo/types";

export const APPLICANT_KEY = /^[a-z][a-z0-9-]{1,39}$/;
export const PRIVATE_NOTE_LIMIT = 4000;
export const MESSAGE_LIMIT = 2000;
export const HANDOFF_FIELD_LIMIT = 2000;
export const FILE_LIMIT = 50_000;

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export type DecisionInput = { applicantKey: string; decision: DecisionValue; privateNote: string | null };
export type MessageInput = { applicantKey: string; body: string; requirementId: string | null };
export type SampleInput = { files: Record<string, string>; handoff: Handoff; run: RunRecord };

function record(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function applicantKey(v: unknown): string | null {
  return typeof v === "string" && APPLICANT_KEY.test(v) ? v : null;
}

function isDecision(v: unknown): v is DecisionValue {
  return typeof v === "string" && (DECISIONS as readonly string[]).includes(v);
}

export function parseDecisionInput(raw: unknown): Parsed<DecisionInput> {
  const body = record(raw);
  if (!body) return { ok: false, error: "Send the decision as a JSON object." };
  const key = applicantKey(body.applicantKey);
  if (!key) return { ok: false, error: "Choose an applicant in your demo workspace." };
  if (!isDecision(body.decision)) return { ok: false, error: "Choose Advance, Hold or Decline." };
  let privateNote: string | null = null;
  if (body.privateNote !== undefined && body.privateNote !== null) {
    if (typeof body.privateNote !== "string") return { ok: false, error: "The private note must be text." };
    const note = body.privateNote.trim();
    if (note.length > PRIVATE_NOTE_LIMIT) return { ok: false, error: `Keep the private note under ${PRIVATE_NOTE_LIMIT} characters.` };
    privateNote = note || null;
  }
  return { ok: true, value: { applicantKey: key, decision: body.decision, privateNote } };
}

export function parseMessageInput(raw: unknown, scenario: DemoScenario): Parsed<MessageInput> {
  const body = record(raw);
  if (!body) return { ok: false, error: "Send the message as a JSON object." };
  const key = applicantKey(body.applicantKey);
  if (!key) return { ok: false, error: "Choose an applicant in your demo workspace." };
  if (typeof body.body !== "string" || !body.body.trim()) return { ok: false, error: "Write the question before sending it." };
  const text = body.body.trim();
  if (text.length > MESSAGE_LIMIT) return { ok: false, error: `Keep the question under ${MESSAGE_LIMIT} characters.` };
  let requirementId: string | null = null;
  if (body.requirementId !== undefined && body.requirementId !== null) {
    if (typeof body.requirementId !== "string" || !scenario.criteria.some((c) => c.id === body.requirementId)) {
      return { ok: false, error: "That requirement is not part of this role." };
    }
    requirementId = body.requirementId;
  }
  return { ok: true, value: { applicantKey: key, body: text, requirementId } };
}

/**
 * The employer's own run of the sample task. Only editable task files are
 * accepted, and the run record must name this scenario's tests.
 */
export function parseSampleInput(raw: unknown, scenario: DemoScenario): Parsed<SampleInput> {
  const body = record(raw);
  if (!body) return { ok: false, error: "Send the submission as a JSON object." };
  const files = record(body.files);
  if (!files) return { ok: false, error: "The submission has no files." };
  const editable = new Set(runtimeFor(scenario).editablePaths);
  const cleanFiles: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    if (!editable.has(path)) return { ok: false, error: `${path.slice(0, 80)} is not a file the task lets you edit.` };
    if (typeof content !== "string") return { ok: false, error: `${path} must be text.` };
    if (content.length > FILE_LIMIT) return { ok: false, error: `${path} is longer than ${FILE_LIMIT} characters.` };
    cleanFiles[path] = content;
  }
  const handoffRaw = record(body.handoff) ?? {};
  const handoff = {} as Handoff;
  for (const field of HANDOFF_FIELDS) {
    const v = handoffRaw[field];
    if (v !== undefined && typeof v !== "string") return { ok: false, error: "Handoff answers must be text." };
    const text = typeof v === "string" ? v : "";
    if (text.length > HANDOFF_FIELD_LIMIT) return { ok: false, error: `Keep each handoff answer under ${HANDOFF_FIELD_LIMIT} characters.` };
    handoff[field] = text;
  }
  const run = parseRun(scenario, body.run);
  if (!run) return { ok: false, error: "The test run could not be read. Run the tests again and resubmit." };
  if (run.scope !== "all") return { ok: false, error: "Submit runs the public and protected tests. Submit again from the task." };
  return { ok: true, value: { files: cleanFiles, handoff, run } };
}
