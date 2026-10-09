import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import {
  acknowledgeCurveball,
  getSessionForCandidate,
  getVersionContent,
  recordEvent,
} from "@/lib/simulations/db";
import { isMicroContent, type MicroSimContent } from "@/lib/simulations/micro-types";
import { maybePresentCurveball } from "@/lib/simulations/curveball-present";
import { publicErrorMessage } from "@/lib/security/public-error";
import { parseJsonBody } from "@/lib/security/request-body";

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

  const parsed = await parseJsonBody(
    req,
    { action: { type: "string", max: 40 }, checkpointSaved: { type: "boolean" } },
    { optional: true }
  );
  if (parsed.ok === false) return parsed.response;
  const body = parsed.body;

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

    // Server-side milestone gate + idempotent presentation, shared with the
    // message poll (see curveball-present.ts).
    const outcome = await maybePresentCurveball(session, content as MicroSimContent, {
      checkpointSaved: body.checkpointSaved === true,
    });
    if (outcome.presented === false) {
      return NextResponse.json({
        ok: true,
        presented: false,
        reason: outcome.reason,
        retryAfterMs: outcome.retryAfterMs,
      });
    }
    return NextResponse.json({
      ok: true,
      presented: true,
      already: outcome.already || undefined,
      announcement: content.curveball!.announcement,
      requiredAdaptation: content.curveball!.requiredAdaptation,
      extendedByMs: outcome.extendedByMs,
      endsAt: outcome.endsAt,
    });
  } catch (err) {
    return NextResponse.json(
      { error: publicErrorMessage(err, "Failed") },
      { status: 400 }
    );
  }
}
