import { DRAFT_FIELDS, saveDraft, type DraftField } from "@/lib/eng/attempts";
import { jsonError, readJson } from "@/lib/eng/context";
import { errorResponse, ok } from "@/lib/eng/http";
import { candidateAttempt } from "@/lib/eng/route-helpers";

function isDraftField(value: unknown): value is DraftField {
  return typeof value === "string" && (DRAFT_FIELDS as readonly string[]).includes(value);
}

export async function PUT(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await candidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, attempt } = gate.value;
  const body = await readJson(req);
  if (!body || !isDraftField(body.field)) return jsonError(400, "Unknown draft field.");
  const text = typeof body.body === "string" ? body.body : "";
  const baseRevision = typeof body.baseRevision === "number" && Number.isInteger(body.baseRevision) && body.baseRevision >= 0 ? body.baseRevision : -1;
  if (baseRevision < 0) return jsonError(400, "Missing draft revision.");
  try {
    const result = await saveDraft(db, attempt, body.field, text, baseRevision);
    if (result.ok === false) return jsonError(409, "This field was changed in another tab.", { current: result.current });
    return ok({ revision: result.revision });
  } catch (err) {
    return errorResponse(err, "drafts");
  }
}
