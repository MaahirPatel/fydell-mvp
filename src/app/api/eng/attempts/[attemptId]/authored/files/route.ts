import { jsonError, readJson } from "@/lib/eng/context";
import { errorResponse, ok } from "@/lib/eng/http";
import { authoredCandidateAttempt } from "@/lib/eng/authored/route-helpers";
import { saveWorkspace } from "@/lib/eng/authored/runtime";

/** Saves the candidate's working files. Conflicts return the server copy instead of overwriting it. */
export async function PUT(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await authoredCandidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const body = await readJson(req);
  const baseRevision = body?.baseRevision;
  if (typeof baseRevision !== "number" || !Number.isInteger(baseRevision) || baseRevision < 1) return jsonError(400, "Missing revision.");
  try {
    const result = await saveWorkspace(gate.value.db, gate.value.authored, body?.files, baseRevision);
    if (result.ok === false) {
      return jsonError(409, "Your files changed in another tab or window. Reload to continue from the latest saved copy.", { current: result.current });
    }
    return ok({ revision: result.revision, filesSha256: result.filesSha256 });
  } catch (err) {
    return errorResponse(err, "authored-files");
  }
}
