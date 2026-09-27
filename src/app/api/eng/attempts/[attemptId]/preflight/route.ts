import { submitSetupCode } from "@/lib/eng/attempts";
import { buildCandidateView } from "@/lib/eng/candidate-view";
import { jsonError, readJson, str } from "@/lib/eng/context";
import { errorResponse, ok } from "@/lib/eng/http";
import { candidateAttempt } from "@/lib/eng/route-helpers";

export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await candidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, attempt, scenario, user } = gate.value;
  const code = str((await readJson(req))?.code, 80);
  if (!code) return jsonError(400, "Paste the setup code printed by preflight.py.");
  try {
    const updated = await submitSetupCode(db, attempt, scenario, code, user.id);
    return ok({ view: await buildCandidateView(db, updated) });
  } catch (err) {
    return errorResponse(err, "preflight");
  }
}
