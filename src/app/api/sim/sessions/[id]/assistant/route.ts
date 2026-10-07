import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { getProviderConfig, postChatCompletion } from "@/lib/ai/provider";
import {
  getSessionForCandidate,
  getSessionState,
  getVersionContent,
  insertMessage,
  markAiInserted,
  recordAiInteraction,
  recordEvent,
} from "@/lib/simulations/db";
import { publicErrorMessage } from "@/lib/security/public-error";

export const runtime = "nodejs";

/**
 * POST: in-product AI assistant. Every prompt/response is recorded as an
 * observable AI interaction. The assistant sees only the candidate's opened
 * resources and notes - never the answer key, checks or rubric.
 *
 * PATCH: mark an interaction's output as inserted into notes/deliverable.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = getProviderConfig();
  if (!config)
    return NextResponse.json(
      { error: "The in-product assistant is not available in this environment." },
      { status: 503 }
    );

  let body: { prompt?: string; contextResourceIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const prompt = (body.prompt || "").trim();
  if (!prompt) return NextResponse.json({ error: "Prompt cannot be empty" }, { status: 400 });
  if (prompt.length > 4000)
    return NextResponse.json({ error: "Prompt too long" }, { status: 400 });

  try {
    const session = await getSessionForCandidate(id, user.id);
    if (session.status !== "active")
      return NextResponse.json({ error: "Session is not active" }, { status: 409 });

    const content = await getVersionContent(session.template_version_id);
    const state = await getSessionState(id);
    const contextIds = (body.contextResourceIds || []).slice(0, 4);
    const contextResources = content.resources.filter((r) => contextIds.includes(r.id));

    const contextBlock = contextResources
      .map((r) => `--- ${r.filename} ---\n${(r.content || "").slice(0, 4000)}`)
      .join("\n\n");

    const answer = await postChatCompletion(
      config,
      [
        {
          role: "system",
          content:
            "You are a work assistant inside a candidate assessment workspace. Help the candidate think through THEIR problem using the provided materials. " +
            "You must not invent facts about the scenario, must not claim knowledge of any 'correct answer', and must not do the whole task for them - help them reason. " +
            `Simulation-specific instructions: ${content.aiAssistantInstructions}`,
        },
        {
          role: "user",
          content:
            (contextBlock ? `MATERIALS THE CANDIDATE ATTACHED:\n${contextBlock}\n\n` : "") +
            (state.notes ? `CANDIDATE'S CURRENT NOTES:\n${state.notes.slice(0, 2000)}\n\n` : "") +
            `QUESTION:\n${prompt}`,
        },
      ],
      { maxTokens: 700, temperature: 0.3 }
    ).then((s) => s.trim()).catch(() => "");
    if (!answer)
      return NextResponse.json(
        { error: "The assistant returned an empty response. Try rephrasing." },
        { status: 502 }
      );

    const interactionId = await recordAiInteraction({
      sessionId: id,
      prompt,
      response: answer,
      contextResourceIds: contextIds,
    });
    await insertMessage({
      sessionId: id,
      thread: "assistant",
      sender: "candidate",
      body: prompt,
    });
    await insertMessage({
      sessionId: id,
      thread: "assistant",
      sender: "assistant",
      body: answer,
    });
    await recordEvent(id, {
      eventType: "ai_prompt_submitted",
      actor: "candidate",
      payload: { interactionId, contextCount: contextIds.length, promptLength: prompt.length },
    });

    return NextResponse.json({ ok: true, interactionId, answer });
  } catch (err) {
    return NextResponse.json(
      { error: publicErrorMessage(err, "Assistant request failed") },
      { status: 400 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { interactionId?: string; insertedInto?: "notes" | "deliverable" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.interactionId || !body.insertedInto)
    return NextResponse.json({ error: "interactionId and insertedInto required" }, { status: 400 });

  try {
    await getSessionForCandidate(id, user.id);
    await markAiInserted(id, body.interactionId, body.insertedInto);
    await recordEvent(id, {
      eventType: "ai_response_inserted",
      actor: "candidate",
      payload: { interactionId: body.interactionId, into: body.insertedInto },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: publicErrorMessage(err, "Failed") },
      { status: 400 }
    );
  }
}
