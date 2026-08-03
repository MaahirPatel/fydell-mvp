import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import {
  getSessionForCandidate,
  getVersionContent,
  insertMessage,
  listEvents,
  recordEvent,
} from "@/lib/simulations/db";
import { draftReply, findStakeholder } from "@/lib/simulations/stakeholder";

export const runtime = "nodejs";

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
      return NextResponse.json({ ok: true, duplicate: true, candidateMessage: message });
    }

    await recordEvent(id, {
      eventType: "message_sent",
      actor: "candidate",
      payload: { stakeholderId: stakeholder.id, length: text.length },
      clientEventId: body.clientMsgId ? `msg_${body.clientMsgId}` : undefined,
    });

    // Which authored rules already fired (for onceOnly semantics).
    const events = await listEvents(id);
    const usedRuleIds = events
      .filter((e) => e.event_type === "message_received")
      .map((e) => (e.payload as { ruleId?: string }).ruleId)
      .filter((r): r is string => Boolean(r));

    const drafted = await draftReply(stakeholder, text, {
      curveballPresented: Boolean(session.curveball_presented_at),
      usedRuleIds,
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

    return NextResponse.json({
      ok: true,
      candidateMessage: message,
      reply: replyMessage,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send message" },
      { status: 400 }
    );
  }
}
