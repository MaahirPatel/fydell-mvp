/**
 * Fair server-side timing for simulation attempts (WORK-03, SCEN-08).
 *
 * The authoritative clock is the server: `started_at` / `ends_at` are set by
 * the server at start, and the server timestamps every event row. Clients
 * report connectivity transitions; the server records them as events and this
 * module turns them into an auditable interruption ledger.
 *
 * Policy:
 *  - Platform-caused interruptions (connectivity loss, teammate-service
 *    outage pauses) do NOT consume the candidate's time: the deadline is
 *    extended by the interruption duration.
 *  - Candidate-caused pauses (e.g. the candidate closed the app) do not
 *    extend the deadline; they are still recorded so reports can distinguish
 *    "no activity" from "platform was down".
 *  - Interruptions are recorded with server timestamps only. Client claims
 *    about when an interruption started are advisory, never authoritative.
 */

export type InterruptionCause = "platform" | "candidate";

export interface InterruptionRecord {
  id: string;
  sessionId: string;
  cause: InterruptionCause;
  /** Server timestamp (ISO) when the interruption was recorded as started. */
  startedAt: string;
  /** Server timestamp (ISO) when connectivity was restored; null = ongoing. */
  endedAt: string | null;
  /** Machine-readable reason, e.g. "connectivity_lost", "teammate_outage_pause". */
  reason: string;
  note?: string;
}

/** Candidate-reportable event types that open/close an interruption. */
export const INTERRUPTION_START_EVENT = "connectivity_interrupted";
export const INTERRUPTION_END_EVENT = "connectivity_restored";

export interface TimingSummary {
  /** Wall-clock ms between start and now/end. */
  wallMs: number;
  /** Ms of platform-caused downtime to exclude from the candidate's clock. */
  excludedMs: number;
  /** Candidate-visible elapsed ms (wall minus platform downtime). */
  effectiveMs: number;
  interruptions: InterruptionRecord[];
  ongoing: InterruptionRecord | null;
}

/**
 * Build the interruption ledger from recorded events. Only server
 * timestamps (`created_at`) are used; payloads are advisory.
 */
export function buildInterruptionLedger(
  sessionId: string,
  events: Array<{
    event_type: string;
    actor: string;
    payload: Record<string, unknown>;
    created_at: string;
  }>
): InterruptionRecord[] {
  const ledger: InterruptionRecord[] = [];
  let open: InterruptionRecord | null = null;
  const ordered = [...events].sort((a, b) =>
    a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0
  );
  for (const e of ordered) {
    if (e.event_type === INTERRUPTION_START_EVENT && !open) {
      const cause =
        (e.payload?.cause as string) === "candidate" ? "candidate" : "platform";
      open = {
        id: `int_${e.created_at}_${ledger.length}`,
        sessionId,
        cause,
        startedAt: e.created_at,
        endedAt: null,
        reason: typeof e.payload?.reason === "string" ? e.payload.reason : "connectivity_lost",
        note: typeof e.payload?.note === "string" ? e.payload.note : undefined,
      };
      ledger.push(open);
    } else if (e.event_type === INTERRUPTION_END_EVENT && open) {
      open.endedAt = e.created_at;
      open = null;
    } else if (e.event_type === "teammate_service_outage" && !open) {
      // A recorded teammate-service outage pauses the attempt per policy.
      open = {
        id: `int_${e.created_at}_${ledger.length}`,
        sessionId,
        cause: "platform",
        startedAt: e.created_at,
        endedAt: null,
        reason: "teammate_outage_pause",
      };
      ledger.push(open);
    } else if (e.event_type === "teammate_service_recovered" && open?.reason === "teammate_outage_pause") {
      open.endedAt = e.created_at;
      open = null;
    }
  }
  return ledger;
}

/** Total platform-caused downtime in ms, capped at the session window. */
export function platformDowntimeMs(
  ledger: InterruptionRecord[],
  windowStartMs: number,
  windowEndMs: number
): number {
  let total = 0;
  for (const r of ledger) {
    if (r.cause !== "platform") continue;
    const start = Math.max(new Date(r.startedAt).getTime(), windowStartMs);
    const end = Math.min(
      r.endedAt ? new Date(r.endedAt).getTime() : windowEndMs,
      windowEndMs
    );
    if (end > start) total += end - start;
  }
  return total;
}

/**
 * Summarize timing for a session. `nowIso` defaults to the server now.
 * Ongoing interruptions are measured up to `nowIso` (or `endedAtOverride`
 * when the session already ended).
 */
export function summarizeTiming(args: {
  sessionId: string;
  startedAt: string | null;
  endsAt: string | null;
  events: Array<{
    event_type: string;
    actor: string;
    payload: Record<string, unknown>;
    created_at: string;
  }>;
  nowIso?: string;
}): TimingSummary {
  const nowMs = args.nowIso ? new Date(args.nowIso).getTime() : Date.now();
  const startMs = args.startedAt ? new Date(args.startedAt).getTime() : nowMs;
  const wallMs = Math.max(0, nowMs - startMs);
  const ledger = buildInterruptionLedger(args.sessionId, args.events);
  const excludedMs = platformDowntimeMs(ledger, startMs, nowMs);
  return {
    wallMs,
    excludedMs,
    effectiveMs: Math.max(0, wallMs - excludedMs),
    interruptions: ledger,
    ongoing: ledger.find((r) => r.endedAt === null) || null,
  };
}

/**
 * Fair deadline: extend `endsAt` by platform-caused downtime that occurred
 * while the session was active. Returns the new ends_at ISO, or null when no
 * extension is owed.
 */
export function computeFairEndsAt(args: {
  startedAt: string;
  endsAt: string;
  interruptions: InterruptionRecord[];
}): string | null {
  const startMs = new Date(args.startedAt).getTime();
  const endMs = new Date(args.endsAt).getTime();
  const owed = platformDowntimeMs(args.interruptions, startMs, endMs);
  if (owed <= 0) return null;
  return new Date(endMs + owed).toISOString();
}

/**
 * SCEN-08: deadline extension / accommodation support. Applies an explicit
 * extension (e.g. approved accommodation, support-granted extra time) on top
 * of the current ends_at. Pure and auditable: the caller records the reason.
 */
export function applyExtension(
  currentEndsAt: string,
  extensionMs: number,
  reason: string
): { endsAt: string; extensionMs: number; reason: string } {
  if (!Number.isFinite(extensionMs) || extensionMs <= 0)
    throw new Error("extensionMs must be a positive number");
  if (!reason || !reason.trim()) throw new Error("An extension reason is required");
  return {
    endsAt: new Date(new Date(currentEndsAt).getTime() + extensionMs).toISOString(),
    extensionMs,
    reason: reason.trim(),
  };
}
