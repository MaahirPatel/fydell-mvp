/**
 * A work-sample invitation is a response to one named evidence gap, never a
 * default step. Before inviting, the reviewer says what capability remains
 * uncertain, why it matters for this role, and what observable work would
 * address it. Pure validation and time-zone handling; storage is in
 * work-samples.ts.
 */

export type EvidenceGap = {
  requirementId: string;
  requirementText: string;
  uncertainCapability: string;
  whyItMatters: string;
  observableWork: string;
};

export type WorkSampleInviteInput = {
  scenarioVersionId: string;
  requirementId: string;
  uncertainCapability: string;
  whyItMatters: string;
  observableWork: string;
  /** Wall-clock deadline in `timeZone`, as "YYYY-MM-DDTHH:mm". */
  deadlineLocal: string;
  timeZone: string;
};

export const GAP_ANSWER = { min: 10, max: 1000 } as const;
export const DEADLINE_WINDOW = { minHours: 24, maxDays: 30 } as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REQ_ID = /^[A-Za-z0-9_-]{1,40}$/;
const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
/** Same shape the database accepts for eng_invitations.deadline_timezone. */
const TZ_SHAPE = /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/;

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length > 64 || !TZ_SHAPE.test(tz)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function offsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** Converts a wall-clock time in an IANA zone to the instant it names. */
export function zonedTimeToUtc(local: string, timeZone: string): Date | null {
  const m = LOCAL.exec(local);
  if (!m || !isValidTimeZone(timeZone)) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let result = guess - offsetMs(guess, timeZone);
  const corrected = guess - offsetMs(result, timeZone);
  if (corrected !== result) result = corrected;
  return new Date(result);
}

export function deadlineProblem(deadline: Date, now: Date = new Date()): string | null {
  const ms = deadline.getTime() - now.getTime();
  if (ms < DEADLINE_WINDOW.minHours * 3600_000) return `Give the applicant at least ${DEADLINE_WINDOW.minHours} hours.`;
  if (ms > DEADLINE_WINDOW.maxDays * 86400_000) return `Set a deadline within ${DEADLINE_WINDOW.maxDays} days.`;
  return null;
}

function answer(raw: unknown, label: string): string | { error: string } {
  const v = typeof raw === "string" ? raw.replace(/\s+\n/g, "\n").trim() : "";
  if (v.length < GAP_ANSWER.min) return { error: `Answer "${label}" in a sentence or two.` };
  if (v.length > GAP_ANSWER.max) return { error: `Keep "${label}" under ${GAP_ANSWER.max} characters.` };
  return v;
}

export function parseWorkSampleInvite(raw: unknown): { ok: true; value: WorkSampleInviteInput } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { ok: false, error: "Send the invitation fields." };
  const b = raw as Record<string, unknown>;
  if (typeof b.scenarioVersionId !== "string" || !UUID.test(b.scenarioVersionId)) return { ok: false, error: "Choose a work sample." };
  if (typeof b.requirementId !== "string" || !REQ_ID.test(b.requirementId)) return { ok: false, error: "Choose the requirement this work sample addresses." };
  const uncertain = answer(b.uncertainCapability, "What capability remains uncertain?");
  if (typeof uncertain !== "string") return { ok: false, error: uncertain.error };
  const why = answer(b.whyItMatters, "Why does it matter for this role?");
  if (typeof why !== "string") return { ok: false, error: why.error };
  const observable = answer(b.observableWork, "What observable work would address it?");
  if (typeof observable !== "string") return { ok: false, error: observable.error };
  if (typeof b.deadlineLocal !== "string" || !LOCAL.test(b.deadlineLocal)) return { ok: false, error: "Choose a deadline date and time." };
  if (!isValidTimeZone(b.timeZone)) return { ok: false, error: "Choose a valid time zone for the deadline, such as Europe/London." };
  return {
    ok: true,
    value: {
      scenarioVersionId: b.scenarioVersionId.toLowerCase(),
      requirementId: b.requirementId,
      uncertainCapability: uncertain,
      whyItMatters: why,
      observableWork: observable,
      deadlineLocal: b.deadlineLocal,
      timeZone: b.timeZone,
    },
  };
}

/** Formats an instant in the zone the deadline was set in. */
export function formatDeadline(iso: string, timeZone: string | null): string {
  const tz = timeZone && isValidTimeZone(timeZone) ? timeZone : "UTC";
  const s = new Intl.DateTimeFormat("en-GB", { timeZone: tz, dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  return `${s} (${tz})`;
}
