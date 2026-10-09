import { jsonError, readJson, str } from "@/lib/eng/context";
import { DecisionConflictError, recordDecision } from "@/lib/eng/employer";
import { errorResponse, isUuid, ok } from "@/lib/eng/http";
import { orgAttempt } from "@/lib/eng/route-helpers";
import type { Decision } from "@/lib/eng/types";

export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await orgAttempt((await params).attemptId, "record_decision");
  if (gate.ok === false) return gate.response;
  const { db, member, attempt } = gate.value;
  if (attempt.is_preview) return jsonError(409, "Preview attempts are not part of hiring, so they cannot carry a decision.");
  const body = await readJson(req);
  const raw = body?.expectedDecisionId;
  const expected = raw === null ? null : typeof raw === "string" && isUuid(raw) ? raw : undefined;
  try {
    const decision = await recordDecision(db, member, attempt, str(body?.decision, 20) as Decision, str(body?.notes, 4001), expected);
    return ok({ decisionId: decision.id as string });
  } catch (err) {
    if (err instanceof DecisionConflictError) return jsonError(409, err.message, { current: err.current });
    return errorResponse(err, "decision");
  }
}
