import { readJson } from "@/lib/eng/context";
import { errorResponse, ok } from "@/lib/eng/http";
import { authoredCandidateAttempt } from "@/lib/eng/authored/route-helpers";
import { runPublicTests } from "@/lib/eng/authored/runtime";

export const maxDuration = 120;

/** Runs only the public tests against the files sent. Rate-limited per attempt in the database. */
export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await authoredCandidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const body = await readJson(req);
  const purpose = body?.purpose === "environment_check" ? "environment_check" : "workspace";
  try {
    const run = await runPublicTests(gate.value.db, gate.value.authored, purpose, body?.files, gate.value.user.id);
    return ok({ run });
  } catch (err) {
    return errorResponse(err, "authored-public-tests");
  }
}
