import { addResponse, buildCandidateReport } from "@/lib/eng/candidate-report";
import { jsonError, readJson, str } from "@/lib/eng/context";
import { errorResponse, ok } from "@/lib/eng/http";
import { candidateAttempt } from "@/lib/eng/route-helpers";

export async function GET(_req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await candidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, attempt, scenario } = gate.value;
  try {
    return ok({ report: await buildCandidateReport(db, attempt, scenario) });
  } catch (err) {
    return errorResponse(err, "candidate-report");
  }
}

/** Adds context to, or flags an error in, the released report. The report itself never changes. */
export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await candidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, attempt, user } = gate.value;
  const body = await readJson(req);
  const targetKind = body?.targetKind;
  const kind = body?.kind;
  if (targetKind !== "finding" && targetKind !== "criterion" && targetKind !== "report") return jsonError(400, "Choose what you are responding to.");
  if (kind !== "context" && kind !== "inaccurate") return jsonError(400, "Choose whether you are adding context or flagging an error.");
  const targetId = targetKind === "report" ? "report" : str(body?.targetId, 40);
  if (!targetId) return jsonError(400, "Choose what you are responding to.");
  const text = typeof body?.body === "string" ? body.body : "";
  const clientRequestId = str(body?.clientRequestId, 64) || null;
  if (clientRequestId && clientRequestId.length < 8) return jsonError(400, "Invalid request id.");
  try {
    const result = await addResponse(db, attempt, user.id, { targetKind, targetId, kind, body: text, clientRequestId });
    return ok({ response: result.response, created: result.created }, result.created ? 201 : 200);
  } catch (err) {
    return errorResponse(err, "candidate-report-response");
  }
}
