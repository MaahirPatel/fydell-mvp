import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import {
  acknowledgeCurveball,
  getSessionForCandidate,
  getVersionContent,
  presentCurveball,
  recordEvent,
} from "@/lib/simulations/db";
import { isMicroContent } from "@/lib/simulations/micro-types";

export const runtime = "nodejs";

const MIN_ELAPSED_MS_BEFORE_CURVEBALL = 4 * 60 * 1000; // fair investigation window

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
    const eligible = elapsed >= MIN_ELAPSED_MS_BEFORE_CURVEBALL || body.checkpointSaved === true;
    if (!eligible) {
      return NextResponse.json({
        ok: true,
        presented: false,
        reason: "too_early",
        retryAfterMs: Math.max(0, MIN_ELAPSED_MS_BEFORE_CURVEBALL - elapsed),
      });
    }

    const presented = await presentCurveball(id);
    if (presented) {
      await recordEvent(id, {
        eventType: "curveball_presented",
        actor: "system",
        clientEventId: `curveball_present_${id}`,
        payload: { trigger: body.checkpointSaved ? "checkpoint" : "elapsed" },
        schemaVersion: 1,
      });
    }

    return NextResponse.json({
      ok: true,
      presented: true,
      announcement: content.curveball!.announcement,
      requiredAdaptation: content.curveball!.requiredAdaptation,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
