import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { csrfGuard } from "@/lib/security/csrf";
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
import { generateResponse } from "@/lib/simulations/conversation/generator";
import { DEFAULT_POLICY } from "@/lib/simulations/conversation/assistance";
import { isMicroContent } from "@/lib/simulations/micro-types";
import { maybePresentCurveball } from "@/lib/simulations/curveball-present";
import { buildSessionChatContext, toChatEvents } from "@/lib/simulations/chat-context";
import { deliverDueProactiveMessages } from "@/lib/simulations/proactive";
import {
  countConsecutiveDegraded,
  evaluateOutage,
  outageIsOpen,
} from "@/lib/simulations/outage-policy";
// Conversation coordinator: decides whether a coworker should respond,
// preventing repeated questions and tracking what's been discussed.
import { classifyMessage } from "@/lib/simulations/conversation/intent";
import { decideResponse } from "@/lib/simulations/conversation/coordinator";
import { buildStateFromMessages } from "@/lib/simulations/conversation/state-builder";
import { recordCandidateMessage } from "@/lib/simulations/conversation/memory";

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
  const blocked = await csrfGuard(req);
  if (blocked) return blocked;
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // AI generation is expensive: 30 messages per hour per user.
  const rl = rateLimit(`sim-chat:${user.id}`, 30, 60 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: "Slow down. Try again in a bit." }, { status: 429 });

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

    // Conversation coordinator: build state from message history, classify
    // the new message, and decide whether a response is useful.
    // This prevents the old behavior of replying to every message with
    // a generic fallback question.

    // Extract scenario's versioned assistance policy early — both the
    // coordinator and generator need it.
    const scenarioPolicy = (content as unknown as {
      assistancePolicy?: {
        version: string;
        maxHints: number;
        allowSolution: boolean;
        hintBlockedTopics: string[];
      };
    }).assistancePolicy;
    const policy = scenarioPolicy || DEFAULT_POLICY;

    const priorMessages = await listMessages(id);
    let convState = buildStateFromMessages(
      id,
      session.template_version_id,
      "v1",
      priorMessages
        .filter((m) => m.thread === "stakeholder")
        .map((m) => ({
          id: m.id,
          sender: m.sender as "candidate" | "stakeholder",
          stakeholderId: m.stakeholder_id,
          body: m.body,
          created_at: m.created_at,
        })),
      // Pass events so the builder can use stored model memory updates
      events.map((e) => ({
        event_type: e.event_type,
        payload: (e.payload || {}) as Record<string, unknown>,
        created_at: e.created_at,
      }))
    );
    const classified = classifyMessage(text);
    convState = recordCandidateMessage(convState, message.id, text, classified);

    // Build coworker info from versioned scenario configuration.
    // Topic ownership and responsibilities are defined per-stakeholder in the
    // scenario content, not hardcoded here.
    const content2 = content as unknown as {
      stakeholders?: Array<{ id: string; ownsTopics?: string[]; responsibilities?: string[] }>;
    };
    const coworkers = (content2.stakeholders || []).map((s) => ({
      id: s.id,
      ownsTopics: s.ownsTopics || [],
      canHelp: true,
    }));

    // Compute time since last coworker message for cooldown
    const coworkerMsgs = priorMessages.filter(
      (m) => m.thread === "stakeholder" && m.sender === "stakeholder"
    );
    const lastCoworkerAt = coworkerMsgs.length > 0
      ? Math.max(...coworkerMsgs.map((m) => new Date(m.created_at).getTime()))
      : 0;
    const msSinceLastCoworkerMsg = lastCoworkerAt > 0 ? Date.now() - lastCoworkerAt : Infinity;

    const decision = decideResponse({
      state: convState,
      classified,
      messageText: text,
      coworkers,
      msSinceLastCoworkerMsg,
      unsolicitedCooldownMs: 5 * 60 * 1000, // 5 minutes
      assistancePolicy: policy,
    });

    // If the coordinator says silence is better, don't reply.
    // The candidate's message is recorded; no generic fallback question.
    if (!decision.shouldSpeak) {
      await recordEvent(id, {
        eventType: "message_no_reply",
        actor: "system",
        payload: {
          stakeholderId: stakeholder.id,
          reason: decision.silenceReason,
          intent: classified.intent,
        },
        clientEventId: body.clientMsgId ? `noreply_${body.clientMsgId}` : undefined,
      });
      return NextResponse.json({
        ok: true,
        candidateMessage: message,
        reply: null,
        noReplyReason: decision.silenceReason,
      });
    }

    // Generate a grounded response using the LLM with permitted context only.
    // The coordinator already decided a response is warranted; the generator
    // interprets the message and composes a context-specific reply.
    // Uses the scenario's versioned policy extracted above.
    const recentMsgs = priorMessages
      .filter((m) => m.thread === "stakeholder")
      .slice(-10)
      .map((m) => ({
        from: (m.sender === "candidate" ? "candidate" : "coworker") as "candidate" | "coworker",
        coworkerId: m.stakeholder_id || undefined,
        text: m.body,
      }));

    // Use the scenario's versioned assistance policy extracted earlier.
    const generated = await generateResponse({
      stakeholder,
      state: convState,
      candidateMessage: text,
      recentMessages: recentMsgs,
      policy,
    });

    let replyText: string;
    let factIds: string[] = [];
    let assistanceCategory: string = "clarification";
    let generationStatus: string;
    let memoryUpdates: Record<string, unknown> | null = null;

    if (generated.status === "generated") {
      const g = generated.generation;
      // If the model says no response needed, respect it (even though
      // the coordinator said to speak — the model has more context)
      if (g.response.no_response_needed) {
        await recordEvent(id, {
          eventType: "message_no_reply",
          actor: "system",
          payload: {
            stakeholderId: stakeholder.id,
            reason: g.response.silence_reason || "Model determined no response needed",
            modelInterpretation: g.interpretation.summary,
          },
          clientEventId: body.clientMsgId ? `noreply_${body.clientMsgId}` : undefined,
        });
        return NextResponse.json({
          ok: true,
          candidateMessage: message,
          reply: null,
          noReplyReason: g.response.silence_reason,
        });
      }
      replyText = g.response.text;
      factIds = generated.factIds;
      assistanceCategory = g.response.assistance_category;
      generationStatus = "generated";

      // Store model's memory updates in the event for exact rebuild.
      // The state-builder uses these instead of re-inferring from text.
      memoryUpdates = {
        interpretation: g.interpretation,
        topicsAddressed: g.memory_updates.topics_addressed,
        planStated: g.memory_updates.plan_stated,
        diagnosisShared: g.memory_updates.diagnosis_shared,
        questionsResolved: g.memory_updates.questions_resolved,
      };
    } else if (generated.status === "unavailable") {
      // Honest unavailable state — do not masquerade as dynamic
      await recordEvent(id, {
        eventType: "teammate_unavailable",
        actor: "system",
        payload: { stakeholderId: stakeholder.id, reason: generated.reason },
        clientEventId: body.clientMsgId ? `unavail_${body.clientMsgId}` : undefined,
      });
      return NextResponse.json({
        ok: true,
        candidateMessage: message,
        reply: null,
        teammateUnavailable: true,
        unavailableReason: "The simulated teammate service is temporarily unavailable. Your message is saved. Try again in a moment.",
      });
    } else {
      // Invalid output — fall back to authored rules (honest limited fallback)
      generationStatus = "fallback_authored";
      const fallback = await draftReply(stakeholder, text, {
        curveballPresented: chatCtx.curveballPresented,
        usedRuleIds: chatCtx.usedRuleIds,
        chat: chatCtx,
      });
      replyText = fallback.reply;
    }

    // Stale-response check: if the candidate sent another message while we
    // were generating this reply, the reply may reference outdated context.
    // Re-run the coordinator with fresh state; if it now says silence,
    // skip the reply rather than sending something stale.
    const freshMessages = await listMessages(id);
    const newerCandidateMsgs = freshMessages.filter(
      (m) =>
        m.thread === "stakeholder" &&
        m.sender === "candidate" &&
        m.id !== message.id &&
        new Date(m.created_at).getTime() > new Date(message.created_at).getTime()
    );
    if (newerCandidateMsgs.length > 0) {
      // Rebuild state with the newer messages and re-decide
      const freshState = buildStateFromMessages(
        id,
        session.template_version_id,
        "v1",
        freshMessages
          .filter((m) => m.thread === "stakeholder")
          .map((m) => ({
            id: m.id,
            sender: m.sender as "candidate" | "stakeholder",
            stakeholderId: m.stakeholder_id,
            body: m.body,
            created_at: m.created_at,
          })),
        events.map((e) => ({
          event_type: e.event_type,
          payload: (e.payload || {}) as Record<string, unknown>,
          created_at: e.created_at,
        }))
      );
      const recheck = decideResponse({
        state: freshState,
        classified,
        messageText: text,
        coworkers,
        msSinceLastCoworkerMsg: 0,
        unsolicitedCooldownMs: 5 * 60 * 1000,
      });
      if (!recheck.shouldSpeak) {
        await recordEvent(id, {
          eventType: "message_reply_suppressed_stale",
          actor: "system",
          payload: {
            stakeholderId: stakeholder.id,
            reason: recheck.silenceReason,
            newerMessages: newerCandidateMsgs.length,
          },
          clientEventId: body.clientMsgId ? `stale_${body.clientMsgId}` : undefined,
        });
        return NextResponse.json({
          ok: true,
          candidateMessage: message,
          reply: null,
          noReplyReason: `Suppressed stale reply: ${recheck.silenceReason}`,
        });
      }
    }

    const { message: replyMessage } = await insertMessage({
      sessionId: id,
      thread: "stakeholder",
      stakeholderId: stakeholder.id,
      sender: "stakeholder",
      body: replyText,
      clientMsgId: body.clientMsgId ? `reply_${body.clientMsgId}` : undefined,
    });
    await recordEvent(id, {
      eventType: "message_received",
      actor: "stakeholder",
      payload: {
        stakeholderId: stakeholder.id,
        generationStatus,
        factIds,
        assistanceCategory,
        // Model's memory updates for exact state rebuild
        ...(memoryUpdates ? { memoryUpdates } : {}),
        // Assistance tracking: record help level for fair reviewer interpretation
        ...(decision.helpLevel ? {
          helpLevel: decision.helpLevel,
          helpAllowed: decision.helpAllowed,
          helpReason: decision.helpReason,
        } : {}),
      },
      clientEventId: body.clientMsgId ? `recv_${body.clientMsgId}` : undefined,
    });

    // SIM-07: teammate-service outage handling. When generation fails or
    // falls back to authored content, record the degradation. Sustained
    // failure declares an outage and pauses/extends the attempt per policy.
    // Best-effort: never fails the reply.
    let outageDeclared = false;
    try {
      const aiConfigured = Boolean(process.env.OPENAI_API_KEY);
      const degraded = aiConfigured && generationStatus !== "generated";
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
