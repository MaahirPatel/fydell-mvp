import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import {
  getSessionForCandidate,
  getSessionState,
  getVersionContent,
  insertMessage,
  listEvents,
  recordEvent,
} from "@/lib/simulations/db";
import { buildSessionChatContext, toChatEvents } from "@/lib/simulations/chat-context";
import { deliverDueProactiveMessages } from "@/lib/simulations/proactive";

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
  // v2 workbench semantic events
  "table_sorted",
  "table_filtered",
  "row_flagged",
  "ticket_selected",
  "step_toggled",
  "rule_reviewed",
  "decision_selected",
  "evidence_selected",
  "deliverable_revised",
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

    // Deliver any proactive teammate messages now due (progress reactions,
    // elapsed-time nudges). Best-effort: never fails the event recording.
    try {
      const [content, state, events] = await Promise.all([
        getVersionContent(session.template_version_id),
        getSessionState(id),
        listEvents(id),
      ]);
      const chatCtx = buildSessionChatContext({
        startedAt: session.started_at,
        curveballPresentedAt: session.curveball_presented_at,
        deliverable: (state.deliverable || {}) as Record<string, unknown>,
        workspace: (state.workspace || {}) as Record<string, unknown>,
        completedTaskIds: state.completed_task_ids || [],
        events: toChatEvents(events),
      });
      await deliverDueProactiveMessages({
        sessionId: id,
        content,
        ctx: chatCtx,
        insertMessage: async (input) => {
          const r = await insertMessage(input);
          return { duplicate: r.duplicate };
        },
        recordEvent: async (input) =>
          recordEvent(id, {
            eventType: input.eventType,
            actor: input.actor,
            payload: input.payload,
            clientEventId: input.clientEventId,
          }),
      });
    } catch {
      // Swallow: proactive messages must never break candidate actions.
    }

    return NextResponse.json({ ok: true, id: result.id, duplicate: result.duplicate });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not record event" },
      { status: 400 }
    );
  }
}
