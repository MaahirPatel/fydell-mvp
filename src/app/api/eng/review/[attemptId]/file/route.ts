import { jsonError } from "@/lib/eng/context";
import { readSubmittedFile } from "@/lib/eng/evidence";
import { errorResponse, ok } from "@/lib/eng/http";
import { reviewerAttempt } from "@/lib/eng/route-helpers";
import { activeCodeAccess, recordCodeRead } from "@/lib/ops/admin-cases";

export async function GET(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await reviewerAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const path = new URL(req.url).searchParams.get("path") ?? "";
  if (!path || path.length > 300) return jsonError(400, "Choose a file.");
  try {
    const grant = await activeCodeAccess(gate.value.db, gate.value.reviewer, gate.value.attempt.id);
    if (!grant) {
      return jsonError(403, "Open code access for this attempt first. Give a reason; access expires and every file you open is recorded.", {
        code: "code_access_required",
      });
    }
    const file = await readSubmittedFile(gate.value.db, gate.value.attempt, path);
    if (!file) return jsonError(404, "That file is not in the submitted archive.");
    await recordCodeRead(gate.value.reviewer, grant, path);
    return ok({ file });
  } catch (err) {
    return errorResponse(err, "review-file");
  }
}
