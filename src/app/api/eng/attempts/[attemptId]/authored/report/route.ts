import { errorResponse, ok } from "@/lib/eng/http";
import { jsonError, readJson, str } from "@/lib/eng/context";
import { addResponse } from "@/lib/eng/candidate-report";
import { authoredCandidateAttempt } from "@/lib/eng/authored/route-helpers";
import { buildAuthoredCandidateReport } from "@/lib/eng/authored/reports";

/** The candidate's released report, or null until the hiring team releases it. */
export async function GET(_req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await authoredCandidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, authored } = gate.value;
  try {
    return ok({ report: await buildAuthoredCandidateReport(db, authored.attempt, authored.pkg) });
  } catch (err) {
    return errorResponse(err, "authored-candidate-report");
  }
}

/** Adds context to, or flags an error in, the released report. The report itself never changes. */
export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await authoredCandidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, user, authored } = gate.value;
  const body = await readJson(req);
  const targetKind = body?.targetKind;
  const kind = body?.kind;
  if (targetKind !== "criterion" && targetKind !== "report") return jsonError(400, "Choose what you are responding to.");
  if (kind !== "context" && kind !== "inaccurate") return jsonError(400, "Choose whether you are adding context or flagging an error.");
  const targetId = targetKind === "report" ? "report" : str(body?.targetId, 40);
  if (!targetId) return jsonError(400, "Choose what you are responding to.");
  const text = typeof body?.body === "string" ? body.body : "";
  const clientRequestId = str(body?.clientRequestId, 64) || null;
  if (clientRequestId && clientRequestId.length < 8) return jsonError(400, "Invalid request id.");
  try {
    const result = await addResponse(db, authored.attempt, user.id, { targetKind, targetId, kind, body: text, clientRequestId });
    return ok({ response: result.response, created: result.created }, result.created ? 201 : 200);
  } catch (err) {
    return errorResponse(err, "authored-candidate-report-response");
  }
}
