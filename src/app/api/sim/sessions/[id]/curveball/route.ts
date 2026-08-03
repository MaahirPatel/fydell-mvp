import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { acknowledgeCurveball, getSessionForCandidate, recordEvent } from "@/lib/simulations/db";

export const runtime = "nodejs";

/** POST: candidate acknowledges the mid-session change. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const session = await getSessionForCandidate(id, user.id);
    if (!session.curveball_presented_at)
      return NextResponse.json({ error: "No change to acknowledge yet" }, { status: 409 });
    await acknowledgeCurveball(id);
    await recordEvent(id, {
      eventType: "curveball_acknowledged",
      actor: "candidate",
      clientEventId: `curveball_ack_${id}`,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
