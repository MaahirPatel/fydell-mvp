import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import {
  extendSessionEndsAt,
  getSessionForCandidate,
  getSessionState,
  getVersionContent,
  insertMessage,
  listEvents,
  listEventsAfter,
  recordEvent,
} from "@/lib/simulations/db";
import { buildReplayPage, parseCursor, parseLimit } from "@/lib/simulations/event-replay";
import { buildSessionChatContext, toChatEvents } from "@/lib/simulations/chat-context";
import { deliverDueProactiveMessages } from "@/lib/simulations/proactive";
import { ALLOWED_CANDIDATE_EVENTS } from "@/lib/simulations/observed-events";
import { pendingConnectivityExtensions } from "@/lib/simulations/timing";
import { publicErrorMessage } from "@/lib/security/public-error";

export const runtime = "nodejs";

/**
 * GET ?after=<seq>&limit=<n>: candidate-visible events after a server cursor,
 * in server order. Reconnecting clients resume from the returned `cursor`.
 * Delivery may repeat; dedupe on `seq`.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });

  const after = parseCursor(req.nextUrl.searchParams.get("after"));
  if (after === null) {
    return NextResponse.json(
      { error: "after must be a non-negative integer", code: "validation_failed" },
      { status: 400 }
    );
  }
  const limit = parseLimit(req.nextUrl.searchParams.get("limit"));

  try {
    await getSessionForCandidate(id, user.id);
  } catch (err) {
    const forbidden = err instanceof Error && err.message === "Forbidden";
    return NextResponse.json(
      forbidden ? { error: "Forbidden", code: "forbidden" } : { error: "Session not found", code: "not_found" },
      { status: forbidden ? 403 : 404 }
    );
  }
  try {
    const rows = await listEventsAfter(id, after, limit + 1);
    return NextResponse.json({ ok: true, ...buildReplayPage(rows, after, limit) });
  } catch {
    return NextResponse.json(
      { error: "Could not load session events. Try again.", code: "retryable_provider_failure", retryable: true },
      { status: 503 }
    );
  }
}

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

    // WORK-03: when connectivity is restored, credit the candidate back the
    // platform downtime. Idempotent: duplicate restored events are skipped,
    // and each closed interruption is extended exactly once (keyed on the
    // interruption's stable ledger id). Best-effort: never fails the event.
    let deadlineCreditedMs = 0;
    if (body.eventType === "connectivity_restored" && !result.duplicate) {
      try {
        const trail = await listEvents(id);
        const pending = pendingConnectivityExtensions(
          id,
          trail.map((e) => ({
            event_type: e.event_type,
            actor: e.actor,
            payload: e.payload,
            created_at: e.created_at,
          }))
        );
        for (const p of pending) {
          await extendSessionEndsAt(id, p.extraMs, "connectivity_restored", {
            clientEventId: `deadline_ext_${id}_${p.extensionKey}`,
            extensionKey: p.extensionKey,
          });
          deadlineCreditedMs += p.extraMs;
        }
      } catch (err) {
        console.error(`[sim] connectivity credit failed for session ${id}:`, err);
      }
    }

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

    return NextResponse.json({
      ok: true,
      id: result.id,
      duplicate: result.duplicate,
      ...(deadlineCreditedMs > 0 ? { deadlineCreditedMs } : {}),
    });
  } catch (err) {
    return NextResponse.json(
      { error: publicErrorMessage(err, "Could not record event") },
      { status: 400 }
    );
  }
}
