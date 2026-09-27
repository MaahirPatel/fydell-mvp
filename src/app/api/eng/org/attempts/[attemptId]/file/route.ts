import { jsonError } from "@/lib/eng/context";
import { readSubmittedFile } from "@/lib/eng/evidence";
import { errorResponse, ok } from "@/lib/eng/http";
import { orgAttempt } from "@/lib/eng/route-helpers";

export async function GET(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await orgAttempt((await params).attemptId, "view_reports");
  if (gate.ok === false) return gate.response;
  const path = new URL(req.url).searchParams.get("path") ?? "";
  if (!path || path.length > 300) return jsonError(400, "Choose a file.");
  try {
    const file = await readSubmittedFile(gate.value.db, gate.value.attempt, path);
    if (!file) return jsonError(404, "That file is not in the submitted archive.");
    return ok({ file });
  } catch (err) {
    return errorResponse(err, "org-file");
  }
}
