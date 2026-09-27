import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import {
  acknowledgeCurveball,
  extendSessionEndsAt,
  getSessionForCandidate,
  getVersionContent,
  insertMessage,
  listEvents,
  presentCurveball,
  recordEvent,
} from "@/lib/simulations/db";
import { isMicroContent } from "@/lib/simulations/micro-types";
import {
  applyFairWindow,
  evaluateMilestoneEligibility,
  microThresholds,
} from "@/lib/simulations/curveball-policy";

export const runtime = "nodejs";

/**
 * POST actions:
 * - { action: "present" } server may present once after elapsed time or when force after checkpoint
 * - { action: "acknowledge" } candidate acknowledges
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { action?: string; checkpointSaved?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const session = await getSessionForCandidate(id, user.id);
    const content = await getVersionContent(session.template_version_id);
    const hasCurveball = isMicroContent(content) && Boolean(content.curveball);

    if (!hasCurveball) {
      return NextResponse.json({ ok: true, presented: false, reason: "no_curveball" });
    }

    if (body.action === "acknowledge" || (!body.action && session.curveball_presented_at)) {
      if (!session.curveball_presented_at)
        return NextResponse.json({ error: "No change to acknowledge yet" }, { status: 409 });
      await acknowledgeCurveball(id);
      await recordEvent(id, {
        eventType: "curveball_acknowledged",
        actor: "candidate",
        clientEventId: `curveball_ack_${id}`,
        schemaVersion: 1,
      });
      return NextResponse.json({ ok: true, acknowledged: true });
    }

    // Present path
    if (session.curveball_presented_at) {
      return NextResponse.json({
        ok: true,
        presented: true,
        already: true,
        announcement: content.curveball!.announcement,
        requiredAdaptation: content.curveball!.requiredAdaptation,
      });
    }

    const startedAt = session.started_at ? new Date(session.started_at).getTime() : 0;
    const elapsed = startedAt ? Date.now() - startedAt : 0;
    // Server-side milestone gate: authored thresholds only, never random or
    // per-candidate difficulty. Micro sims keep the 4-minute fair
    // investigation window via microThresholds().
    const events = await listEvents(id);
    const candidateEventCount = events.filter((e) => e.actor === "candidate").length;
    const eligibility = evaluateMilestoneEligibility({
      alreadyPresented: false,
      elapsedMs: elapsed,
      totalMs: session.duration_minutes * 60000,
      candidateEventCount,
      thresholds: microThresholds(session.duration_minutes),
      checkpointSaved: body.checkpointSaved === true,
    });
    if (!eligibility.eligible) {
      return NextResponse.json({
        ok: true,
        presented: false,
        reason: eligibility.reason,
        retryAfterMs: eligibility.retryAfterMs,
      });
    }

    const presented = await presentCurveball(id);
    // SIM-05 fair response window: the candidate always keeps a minimum
    // window AFTER the change lands. If it landed too close to the deadline,
    // extend the deadline. Best-effort: never fails the present.
    let extendedByMs = 0;
    let endsAt: string | null = session.ends_at;
    if (presented && session.ends_at) {
      try {
        const presentedAt = new Date().toISOString();
        const fairEndsAt = applyFairWindow(presentedAt, session.ends_at);
        if (fairEndsAt) {
          extendedByMs = new Date(fairEndsAt).getTime() - new Date(session.ends_at).getTime();
          endsAt = await extendSessionEndsAt(id, extendedByMs, "fair_response_window");
        }
      } catch (err) {
        console.error(`[sim] fair-window extension failed for session ${id}:`, err);
      }
    }
    if (presented) {
      await recordEvent(id, {
        eventType: "curveball_presented",
        actor: "system",
        clientEventId: `curveball_present_${id}`,
        payload: { trigger: body.checkpointSaved ? "checkpoint" : "elapsed" },
        schemaVersion: 1,
      });
      // Persist the announcement as a chat message from the scenario's
      // stakeholder so it lands in the conversation the candidate is already
      // reading (and in the UI poll). Idempotent: clientMsgId dedupes.
      try {
        await insertMessage({
          sessionId: id,
          thread: "stakeholder",
          stakeholderId: content.curveball!.stakeholderId,
          sender: "stakeholder",
          body: `${content.curveball!.announcement}\n\n${content.curveball!.requiredAdaptation}`,
          clientMsgId: `curveball_msg_${id}`,
        });
        await recordEvent(id, {
          eventType: "message_received",
          actor: "stakeholder",
          payload: {
            stakeholderId: content.curveball!.stakeholderId,
            ruleId: null,
            source: "curveball_announcement",
          },
          clientEventId: `curveball_msg_evt_${id}`,
          schemaVersion: 1,
        });
      } catch (err) {
        console.error(`[sim] curveball chat message failed for session ${id}:`, err);
      }
    }

    return NextResponse.json({
      ok: true,
      presented: true,
      announcement: content.curveball!.announcement,
      requiredAdaptation: content.curveball!.requiredAdaptation,
      extendedByMs,
      endsAt,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
