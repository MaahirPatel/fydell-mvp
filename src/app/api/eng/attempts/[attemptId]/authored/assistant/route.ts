import { readJson } from "@/lib/eng/context";
import { errorResponse, ok } from "@/lib/eng/http";
import { authoredCandidateAttempt } from "@/lib/eng/authored/route-helpers";
import { askAssistant } from "@/lib/eng/authored/collaboration";
import { limitByUser, ROUTE_LIMITS } from "@/lib/security/route-limits";

export const maxDuration = 90;

/** Asks the optional coding assistant. Limits and the task's AI policy are enforced here, not in the browser. */
export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await authoredCandidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, user, authored } = gate.value;
  const limited = limitByUser(user.id, ROUTE_LIMITS.modelCall);
  if (limited) return limited;
  const body = await readJson(req);
  try {
    const result = await askAssistant(db, authored, user.id, {
      prompt: body?.prompt,
      clientMsgId: body?.clientMsgId,
      contextPaths: body?.contextPaths,
      files: body?.files,
    });
    return ok(result);
  } catch (err) {
    return errorResponse(err, "authored-assistant");
  }
}
