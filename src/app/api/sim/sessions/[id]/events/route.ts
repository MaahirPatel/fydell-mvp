import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { getSessionForCandidate, recordEvent } from "@/lib/simulations/db";

export const runtime = "nodejs";

const ALLOWED_CANDIDATE_EVENTS = new Set([
  "resource_opened",
  "resource_downloaded",
  "task_completed",
  "task_reopened",
  "notes_edited",
  "deliverable_field_edited",
  "workspace_action",
  "curveball_acknowledged",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    eventType?: string;
    resourceId?: string;
    taskId?: string;
    payload?: Record<string, unknown>;
    clientEventId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.eventType || !ALLOWED_CANDIDATE_EVENTS.has(body.eventType))
    return NextResponse.json({ error: "Unknown event type" }, { status: 400 });

  try {
    const session = await getSessionForCandidate(id, user.id);
    if (session.status !== "active")
      return NextResponse.json({ error: "Session is not active" }, { status: 409 });

    const result = await recordEvent(id, {
      eventType: body.eventType,
      actor: "candidate",
      resourceId: body.resourceId,
      taskId: body.taskId,
      payload: body.payload,
      clientEventId: body.clientEventId,
    });
    return NextResponse.json({ ok: true, id: result.id, duplicate: result.duplicate });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not record event" },
      { status: 400 }
    );
  }
}
