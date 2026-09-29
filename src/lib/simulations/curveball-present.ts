/**
 * Server-driven requirement-update presentation (SIM-05, WORK-03).
 *
 * Shared by the explicit curveball route and the message poll every client
 * already makes, so the update reaches candidates whether or not their client
 * knows to ask for it (the desktop client only polls messages). Presentation
 * is idempotent (presentCurveball flips curveball_presented_at once), gated by
 * authored thresholds only, and followed by the fair response window.
 */

import "server-only";
import {
  extendSessionEndsAt,
  insertMessage,
  listEvents,
  presentCurveball,
  recordEvent,
} from "./db";
import { applyFairWindow, evaluateMilestoneEligibility, microThresholds, type CurveballThresholds } from "./curveball-policy";
import type { MicroSimContent } from "./micro-types";

export interface PresentableSession {
  id: string;
  status: string;
  started_at: string | null;
  ends_at: string | null;
  duration_minutes: number;
  curveball_presented_at: string | null;
}

/** Authored thresholds: engineering scenarios name their own minute mark. */
export function curveballThresholdsFor(content: MicroSimContent, durationMinutes: number): CurveballThresholds {
  const at = content.engineering?.updateAfterMinutes;
  if (at && at > 0) {
    return {
      triggerElapsedRatio: Math.min(1, (at * 60000) / (Math.max(1, durationMinutes) * 60000)),
      minEvents: 1,
    };
  }
  return microThresholds(durationMinutes);
}

export type PresentOutcome =
  | { presented: false; reason: string; retryAfterMs: number }
  | { presented: true; already: boolean; extendedByMs: number; endsAt: string | null };

export async function maybePresentCurveball(
  session: PresentableSession,
  content: MicroSimContent,
  opts: { checkpointSaved?: boolean; now?: number } = {}
): Promise<PresentOutcome> {
  if (!content.curveball) return { presented: false, reason: "no_curveball", retryAfterMs: 0 };
  if (session.curveball_presented_at) {
    return { presented: true, already: true, extendedByMs: 0, endsAt: session.ends_at };
  }
  if (session.status !== "active" || !session.started_at) {
    return { presented: false, reason: "not_active", retryAfterMs: 0 };
  }

  const now = opts.now ?? Date.now();
  const elapsed = now - new Date(session.started_at).getTime();
  const events = await listEvents(session.id);
  const candidateEventCount = events.filter((e) => e.actor === "candidate").length;
  const eligibility = evaluateMilestoneEligibility({
    alreadyPresented: false,
    elapsedMs: elapsed,
    totalMs: session.duration_minutes * 60000,
    candidateEventCount,
    thresholds: curveballThresholdsFor(content, session.duration_minutes),
    checkpointSaved: opts.checkpointSaved === true,
  });
  if (!eligibility.eligible) {
    return { presented: false, reason: eligibility.reason, retryAfterMs: eligibility.retryAfterMs };
  }

  const presented = await presentCurveball(session.id);
  if (!presented) return { presented: true, already: true, extendedByMs: 0, endsAt: session.ends_at };

  // Fair response window: the candidate always keeps a minimum window after
  // the change lands. Best-effort: never fails the presentation.
  let extendedByMs = 0;
  let endsAt: string | null = session.ends_at;
  if (session.ends_at) {
    try {
      const fairEndsAt = applyFairWindow(new Date(now).toISOString(), session.ends_at);
      if (fairEndsAt) {
        extendedByMs = new Date(fairEndsAt).getTime() - new Date(session.ends_at).getTime();
        endsAt = await extendSessionEndsAt(session.id, extendedByMs, "fair_response_window");
      }
    } catch (err) {
      console.error(`[sim] fair-window extension failed for session ${session.id}:`, err);
    }
  }

  await recordEvent(session.id, {
    eventType: "curveball_presented",
    actor: "system",
    clientEventId: `curveball_present_${session.id}`,
    payload: { trigger: opts.checkpointSaved ? "checkpoint" : "elapsed", curveballId: content.curveball.id },
    schemaVersion: 1,
  });
  // The announcement lands in the thread the candidate is already reading.
  // Idempotent: clientMsgId dedupes.
  try {
    await insertMessage({
      sessionId: session.id,
      thread: "stakeholder",
      stakeholderId: content.curveball.stakeholderId,
      sender: "stakeholder",
      body: `${content.curveball.announcement}\n\n${content.curveball.requiredAdaptation}`,
      clientMsgId: `curveball_msg_${session.id}`,
    });
    await recordEvent(session.id, {
      eventType: "message_received",
      actor: "stakeholder",
      payload: { stakeholderId: content.curveball.stakeholderId, ruleId: null, source: "curveball_announcement" },
      clientEventId: `curveball_msg_evt_${session.id}`,
      schemaVersion: 1,
    });
  } catch (err) {
    console.error(`[sim] curveball chat message failed for session ${session.id}:`, err);
  }
  return { presented: true, already: false, extendedByMs, endsAt };
}
