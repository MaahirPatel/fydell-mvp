import { jsonError } from "@/lib/eng/context";
import { readSubmittedFile } from "@/lib/eng/evidence";
import { errorResponse, ok } from "@/lib/eng/http";
import { candidateAttempt } from "@/lib/eng/route-helpers";

/** The candidate's own submitted files, so they can check the lines a finding cites. */
export async function GET(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await candidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  if (gate.value.attempt.status !== "submitted") return jsonError(409, "Files can be viewed after you submit.");
  const path = new URL(req.url).searchParams.get("path") ?? "";
  if (!path || path.length > 300) return jsonError(400, "Choose a file.");
  try {
    const file = await readSubmittedFile(gate.value.db, gate.value.attempt, path);
    if (!file) return jsonError(404, "That file is not in your submitted archive.");
    return ok({ file });
  } catch (err) {
    return errorResponse(err, "candidate-file");
  }
}
