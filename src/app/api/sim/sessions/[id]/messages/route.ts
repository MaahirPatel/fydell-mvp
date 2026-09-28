import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import {
  extendSessionEndsAt,
  getSessionForCandidate,
  getSessionState,
  getVersionContent,
  insertMessage,
  listEvents,
  listMessages,
  recordEvent,
} from "@/lib/simulations/db";
import { draftReply, findStakeholder } from "@/lib/simulations/stakeholder";
import { isMicroContent } from "@/lib/simulations/micro-types";
import { maybePresentCurveball } from "@/lib/simulations/curveball-present";
import { buildSessionChatContext, toChatEvents } from "@/lib/simulations/chat-context";
import { deliverDueProactiveMessages } from "@/lib/simulations/proactive";
import {
  countConsecutiveDegraded,
  evaluateOutage,
  outageIsOpen,
} from "@/lib/simulations/outage-policy";

export const runtime = "nodejs";

/**
 * GET: list stakeholder-thread messages (used by the candidate UI poll for
 * proactive teammate messages). Returns messages oldest-first.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const session = await getSessionForCandidate(id, user.id);
    // Clients poll this route, so it is where a due requirement update is
    // presented server-side (SIM-05). Best-effort: never fails the poll.
    if (session.status === "active" && !session.curveball_presented_at) {
      try {
        const content = await getVersionContent(session.template_version_id);
        if (isMicroContent(content) && content.curveball) await maybePresentCurveball(session, content);
      } catch (err) {
        console.error(`[sim] curveball presentation on poll failed for session ${id}:`, err);
      }
    }
    const messages = await listMessages(id);
    return NextResponse.json({
      ok: true,
      messages: messages
        .filter((m) => m.thread === "stakeholder")
        .map((m) => ({
          id: m.id,
          thread: m.thread,
          sender: m.sender,
          stakeholderId: m.stakeholder_id,
          body: m.body,
          createdAt: m.created_at,
        })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not load messages" },
      { status: 400 }
    );
  }
}

/**
 * POST: candidate sends a stakeholder message; the stakeholder replies via
 * the authored deterministic response map (optionally AI-redrafted).
 * Duplicate client message ids do not create duplicate messages or replies.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { stakeholderId?: string; text?: string; clientMsgId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const text = (body.text || "").trim();
  if (!text) return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  if (text.length > 2000)
    return NextResponse.json({ error: "Message too long (max 2000 characters)" }, { status: 400 });
  if (!body.stakeholderId)
    return NextResponse.json({ error: "stakeholderId is required" }, { status: 400 });

  try {
    const session = await getSessionForCandidate(id, user.id);
    if (session.status !== "active")
      return NextResponse.json({ error: "Session is not active" }, { status: 409 });

    const content = await getVersionContent(session.template_version_id);
    const stakeholder = findStakeholder(content, body.stakeholderId);
    if (!stakeholder)
      return NextResponse.json({ error: "Unknown stakeholder" }, { status: 400 });

    const { message, duplicate } = await insertMessage({
      sessionId: id,
      thread: "stakeholder",
      stakeholderId: stakeholder.id,
      sender: "candidate",
      body: text,
      clientMsgId: body.clientMsgId,
    });
    if (duplicate) {
      // Return the already-created reply too, so a retried send gets the
      // full conversation state instead of a dangling candidate message.
      let reply: unknown = null;
      if (body.clientMsgId) {
        const prior = await listMessages(id);
        reply =
          prior.find(
            (m) =>
              (m as unknown as { client_msg_id?: string }).client_msg_id ===
              `reply_${body.clientMsgId}`
          ) || null;
      }
      return NextResponse.json({ ok: true, duplicate: true, candidateMessage: message, reply });
    }

    await recordEvent(id, {
      eventType: "message_sent",
      actor: "candidate",
      payload: { stakeholderId: stakeholder.id, length: text.length },
      clientEventId: body.clientMsgId ? `msg_${body.clientMsgId}` : undefined,
    });

    // Which authored rules already fired (for onceOnly semantics).
    const events = await listEvents(id);
    const state = await getSessionState(id);
    const chatCtx = buildSessionChatContext({
      startedAt: session.started_at,
      curveballPresentedAt: session.curveball_presented_at,
      deliverable: (state.deliverable || {}) as Record<string, unknown>,
      workspace: (state.workspace || {}) as Record<string, unknown>,
      completedTaskIds: state.completed_task_ids || [],
      events: toChatEvents(events),
    });

    const drafted = await draftReply(stakeholder, text, {
      curveballPresented: chatCtx.curveballPresented,
      usedRuleIds: chatCtx.usedRuleIds,
      chat: chatCtx,
    });

    const { message: replyMessage } = await insertMessage({
      sessionId: id,
      thread: "stakeholder",
      stakeholderId: stakeholder.id,
      sender: "stakeholder",
      body: drafted.reply,
      clientMsgId: body.clientMsgId ? `reply_${body.clientMsgId}` : undefined,
    });
    await recordEvent(id, {
      eventType: "message_received",
      actor: "stakeholder",
      payload: { stakeholderId: stakeholder.id, ruleId: drafted.ruleId, source: drafted.source },
      clientEventId: body.clientMsgId ? `recv_${body.clientMsgId}` : undefined,
    });

    // SIM-07: teammate-service outage handling. When an LLM redraft is
    // configured and it failed (authored fallback served instead), record the
    // degradation. Sustained failure declares an outage and pauses/extends
    // the attempt per policy — the candidate never loses time to our outage.
    // Best-effort: never fails the reply.
    let outageDeclared = false;
    try {
      const aiConfigured = Boolean(process.env.OPENAI_API_KEY && stakeholder.aiPersona);
      const degraded = aiConfigured && drafted.source === "authored";
      const outageEvents = (await listEvents(id)).map((e) => ({
        event_type: e.event_type,
        created_at: e.created_at,
        payload: e.payload,
      }));
      if (!degraded && aiConfigured) {
        // Healthy redraft after degradation: close the loop for the audit trail.
        const wasDegraded = outageEvents.some((e) => e.event_type === "teammate_service_degraded");
        const wasOutage = outageIsOpen(outageEvents);
        if (wasDegraded || wasOutage) {
          await recordEvent(id, {
            eventType: "teammate_service_recovered",
            actor: "system",
            payload: {},
            clientEventId: `tm_recovered_${id}_${Date.now()}`,
          });
        }
      } else if (degraded) {
        // Record first, then count on the refreshed trail (including this
        // attempt): the degraded fallback also writes message_received, so
        // counting before the record would undercount by one and the streak
        // could never reach the outage threshold.
        await recordEvent(id, {
          eventType: "teammate_service_degraded",
          actor: "system",
          payload: { stakeholderId: stakeholder.id },
          clientEventId: `tm_degraded_${id}_${Date.now()}`,
        });
        const refreshed = (await listEvents(id)).map((e) => ({
          event_type: e.event_type,
          created_at: e.created_at,
          payload: e.payload,
        }));
        const decision = evaluateOutage({
          degraded: true,
          consecutiveDegraded: countConsecutiveDegraded(refreshed),
          outageAlreadyOpen: outageIsOpen(refreshed),
        });
        if (decision.action === "declare_outage") {
          await recordEvent(id, {
            eventType: "teammate_service_outage",
            actor: "system",
            payload: { consecutiveDegraded: decision.consecutiveDegraded },
            clientEventId: `tm_outage_${id}_${Date.now()}`,
          });
          try {
            await extendSessionEndsAt(id, decision.extensionMs, "teammate_service_outage");
            outageDeclared = true;
          } catch (err) {
            console.error(`[sim] outage extension failed for session ${id}:`, err);
          }
        }
      }
    } catch (err) {
      console.error(`[sim] outage bookkeeping failed for session ${id}:`, err);
    }

    // Deliver any proactive teammate messages now due (e.g. message-count
    // triggers). Best-effort: never fails the reply.
    // Rebuild context to include the message just sent.
    const freshEvents = await listEvents(id);
    const freshCtx = buildSessionChatContext({
      startedAt: session.started_at,
      curveballPresentedAt: session.curveball_presented_at,
      deliverable: (state.deliverable || {}) as Record<string, unknown>,
      workspace: (state.workspace || {}) as Record<string, unknown>,
      completedTaskIds: state.completed_task_ids || [],
      events: toChatEvents(freshEvents),
    });
    await deliverDueProactiveMessages({
      sessionId: id,
      content,
      ctx: freshCtx,
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

    return NextResponse.json({
      ok: true,
      candidateMessage: message,
      reply: replyMessage,
      teammateOutageDeclared: outageDeclared,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send message" },
      { status: 400 }
    );
  }
}
