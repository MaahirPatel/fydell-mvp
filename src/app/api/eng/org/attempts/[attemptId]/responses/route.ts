import { resolveResponse } from "@/lib/eng/candidate-report";
import { jsonError, readJson, str } from "@/lib/eng/context";
import { errorResponse, isUuid, ok } from "@/lib/eng/http";
import { orgAttempt } from "@/lib/eng/route-helpers";

/** Resolves a candidate's context note or flagged error with a written reply. The report is unchanged; corrections are released as a new version. */
export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await orgAttempt((await params).attemptId, "write_reports");
  if (gate.ok === false) return gate.response;
  const { db, member, attempt } = gate.value;
  const body = await readJson(req);
  const responseId = str(body?.responseId, 40);
  if (!isUuid(responseId)) return jsonError(400, "Choose a response to resolve.");
  try {
    const response = await resolveResponse(db, attempt, responseId, member.email, str(body?.resolution, 2001));
    return ok({ response });
  } catch (err) {
    return errorResponse(err, "org-responses");
  }
}
