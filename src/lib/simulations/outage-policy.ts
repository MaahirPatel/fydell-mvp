/**
 * Teammate-service outage policy (SIM-07).
 *
 * The deterministic authored reply map always works with no AI provider.
 * When an LLM redraft is configured and it fails, the route falls back to
 * the authored reply and records `teammate_service_degraded`. Sustained
 * failure escalates per this policy:
 *  - a few failures: keep serving scripted replies (fallback_only), degraded
 *    event recorded for the audit trail
 *  - threshold crossed: record `teammate_service_outage`, pause the
 *    attempt's clock and extend the deadline so the candidate loses no time
 *
 * And the scoring guarantee: a delayed or missing bot reply must never
 * reduce the candidate's evaluation. Quality floors below apply when an
 * outage was recorded for the session.
 */

/** Consecutive degraded replies before an outage is declared. */
export const OUTAGE_CONSECUTIVE_THRESHOLD = 5;

/** How long the attempt clock pauses per outage declaration. */
export const OUTAGE_PAUSE_MS = 5 * 60 * 1000;

export type OutageAction = "none" | "fallback_only" | "declare_outage";

export interface OutageEvaluation {
  action: OutageAction;
  /** Consecutive degraded replies observed (including this one). */
  consecutiveDegraded: number;
  /** Deadline extension owed when declaring an outage. */
  extensionMs: number;
}

/**
 * Pure escalation decision. `consecutiveDegraded` counts back-to-back
 * degraded replies (resets to 0 on any healthy reply). `outageAlreadyOpen`
 * prevents double-declaring while an outage pause is active.
 */
export function evaluateOutage(args: {
  degraded: boolean;
  consecutiveDegraded: number;
  outageAlreadyOpen: boolean;
}): OutageEvaluation {
  if (!args.degraded)
    return { action: "none", consecutiveDegraded: 0, extensionMs: 0 };
  const consecutive = args.consecutiveDegraded + 1;
  if (!args.outageAlreadyOpen && consecutive >= OUTAGE_CONSECUTIVE_THRESHOLD)
    return { action: "declare_outage", consecutiveDegraded: consecutive, extensionMs: OUTAGE_PAUSE_MS };
  return { action: "fallback_only", consecutiveDegraded: consecutive, extensionMs: 0 };
}

/**
 * Count trailing consecutive `teammate_service_degraded` events (most recent
 * first). A `teammate_service_recovered` or healthy reply resets the streak.
 */
export function countConsecutiveDegraded(
  events: Array<{ event_type: string; created_at: string }>
): number {
  const ordered = [...events].sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0
  );
  let count = 0;
  for (const e of ordered) {
    if (e.event_type === "teammate_service_degraded") {
      count++;
      continue;
    }
    if (
      e.event_type === "teammate_service_recovered" ||
      e.event_type === "teammate_service_outage" ||
      e.event_type === "message_received"
    )
      break;
  }
  return count;
}

export function outageIsOpen(
  events: Array<{ event_type: string; created_at: string }>
): boolean {
  // Most-recent-first: the latest outage/recovery event decides.
  const ordered = [...events].sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0
  );
  for (const e of ordered) {
    if (e.event_type === "teammate_service_outage") return true;
    if (e.event_type === "teammate_service_recovered") return false;
  }
  return false;
}

/**
 * SIM-07 scoring guarantee: when a teammate-service outage was recorded for
 * the session, a missing/slow bot reply must not drag stakeholder quality
 * below the "candidate asked" floor. Returns the quality floor to apply.
 *
 *  - outage recorded + candidate sent a message → floor 0.5 (asked, no reply
 *    through no fault of their own)
 *  - otherwise → 0 (normal scoring applies)
 */
export function stakeholderQualityFloor(args: {
  outageRecorded: boolean;
  candidateSentMessage: boolean;
}): number {
  return args.outageRecorded && args.candidateSentMessage ? 0.5 : 0;
}
