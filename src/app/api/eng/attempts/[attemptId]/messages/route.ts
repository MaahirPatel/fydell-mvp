import { listMessages, sendMessage } from "@/lib/eng/attempts";
import { jsonError, readJson, str } from "@/lib/eng/context";
import { errorResponse, ok } from "@/lib/eng/http";
import { candidateAttempt } from "@/lib/eng/route-helpers";

export async function GET(_req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await candidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, attempt } = gate.value;
  if (attempt.status !== "in_progress" && attempt.status !== "submitted") return ok({ messages: [] });
  return ok({ messages: await listMessages(db, attempt.id), updateReleasedAt: attempt.update_released_at });
}

export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await candidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, attempt, scenario } = gate.value;
  const body = await readJson(req);
  const text = typeof body?.body === "string" ? body.body : "";
  const clientMsgId = str(body?.clientMsgId, 64);
  if (!clientMsgId) return jsonError(400, "Invalid message id.");
  try {
    const messages = await sendMessage(db, attempt, scenario, { body: text, clientMsgId });
    return ok({ messages });
  } catch (err) {
    return errorResponse(err, "messages");
  }
}
