/**
 * Requirement-change milestone policy (SIM-05, WORK-03).
 *
 * A requirement update (curveball) is a server-side milestone:
 *  - emitted at most once per session (idempotent present)
 *  - gated by authored thresholds (elapsed ratio + minimum observed events),
 *    never by random or per-candidate difficulty
 *  - exposure AND acknowledgment are recorded as events with server timestamps
 *  - the candidate always keeps a fair minimum response window AFTER exposure:
 *    if the change lands too close to the deadline, the deadline extends
 *
 * This module is pure; the routes supply session state and persist decisions.
 */

export interface CurveballThresholds {
  /** Fraction of total session time that must elapse first (0..1). */
  triggerElapsedRatio: number;
  /** Minimum observed candidate events before eligible. */
  minEvents: number;
}

/** Fair minimum opportunity to respond after a requirement change lands. */
export const MIN_RESPONSE_WINDOW_MS = 10 * 60 * 1000;

export interface MilestoneEligibilityInput {
  alreadyPresented: boolean;
  /** Ms since the server recorded session start. */
  elapsedMs: number;
  /** Total allowed session ms (durationMinutes * 60000). */
  totalMs: number;
  /** Observed candidate events so far. */
  candidateEventCount: number;
  thresholds: CurveballThresholds;
  /** Explicit checkpoint save may force eligibility (documented, not random). */
  checkpointSaved?: boolean;
}

export interface MilestoneEligibility {
  eligible: boolean;
  reason:
    | "already_presented"
    | "too_early"
    | "insufficient_activity"
    | "checkpoint"
    | "eligible";
  /** Ms until the time-based gate opens (0 when not time-gated). */
  retryAfterMs: number;
}

export function evaluateMilestoneEligibility(
  input: MilestoneEligibilityInput
): MilestoneEligibility {
  if (input.alreadyPresented)
    return { eligible: false, reason: "already_presented", retryAfterMs: 0 };

  const ratio = input.totalMs > 0 ? input.elapsedMs / input.totalMs : 0;
  const timeGateMs = input.thresholds.triggerElapsedRatio * input.totalMs;
  const timeOk = input.elapsedMs >= timeGateMs;
  const activityOk = input.candidateEventCount >= input.thresholds.minEvents;

  if (input.checkpointSaved && activityOk)
    return { eligible: true, reason: "checkpoint", retryAfterMs: 0 };
  if (!activityOk)
    return { eligible: false, reason: "insufficient_activity", retryAfterMs: Math.max(0, timeGateMs - input.elapsedMs) };
  if (!timeOk)
    return {
      eligible: false,
      reason: "too_early",
      retryAfterMs: Math.max(0, timeGateMs - input.elapsedMs),
    };
  return { eligible: true, reason: "eligible", retryAfterMs: 0 };
}

/**
 * Micro-simulation thresholds, preserving the existing 4-minute fair
 * investigation window (previously hardcoded in the curveball route).
 */
export function microThresholds(durationMinutes: number): CurveballThresholds {
  const totalMs = Math.max(1, durationMinutes) * 60000;
  return { triggerElapsedRatio: (4 * 60000) / totalMs, minEvents: 0 };
}

export interface FairWindowInput {
  presentedAtMs: number;
  endsAtMs: number;
  /** Minimum response window; defaults to MIN_RESPONSE_WINDOW_MS. */
  minWindowMs?: number;
}

/**
 * If the requirement change was presented with less than the fair response
 * window remaining, compute the extension owed so the candidate keeps the
 * full window AFTER exposure. Returns 0 when no extension is owed.
 */
export function fairWindowExtensionMs(input: FairWindowInput): number {
  const minWindow = input.minWindowMs ?? MIN_RESPONSE_WINDOW_MS;
  const remaining = input.endsAtMs - input.presentedAtMs;
  if (remaining >= minWindow) return 0;
  return minWindow - remaining;
}

/** New ends_at after applying the fair-window extension (null = no change). */
export function applyFairWindow(
  presentedAtIso: string,
  endsAtIso: string,
  minWindowMs: number = MIN_RESPONSE_WINDOW_MS
): string | null {
  const extension = fairWindowExtensionMs({
    presentedAtMs: new Date(presentedAtIso).getTime(),
    endsAtMs: new Date(endsAtIso).getTime(),
    minWindowMs,
  });
  if (extension <= 0) return null;
  return new Date(new Date(endsAtIso).getTime() + extension).toISOString();
}
