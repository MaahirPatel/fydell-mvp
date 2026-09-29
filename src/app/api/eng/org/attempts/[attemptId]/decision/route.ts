import { readJson, str } from "@/lib/eng/context";
import { recordDecision } from "@/lib/eng/employer";
import { errorResponse, ok } from "@/lib/eng/http";
import { orgAttempt } from "@/lib/eng/route-helpers";
import type { Decision } from "@/lib/eng/types";

export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await orgAttempt((await params).attemptId, "record_decision");
  if (gate.ok === false) return gate.response;
  const { db, member, attempt } = gate.value;
  const body = await readJson(req);
  try {
    const decision = await recordDecision(db, member, attempt, str(body?.decision, 20) as Decision, str(body?.notes, 4001));
    return ok({ decisionId: decision.id as string });
  } catch (err) {
    return errorResponse(err, "decision");
  }
}
