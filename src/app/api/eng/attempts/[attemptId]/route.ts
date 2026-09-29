import { buildCandidateView } from "@/lib/eng/candidate-view";
import { errorResponse, ok } from "@/lib/eng/http";
import { candidateAttempt, scheduleIfRunnable } from "@/lib/eng/route-helpers";

export const maxDuration = 300;

export async function GET(_req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await candidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  try {
    const view = await buildCandidateView(gate.value.db, gate.value.attempt);
    if (gate.value.attempt.status === "submitted") await scheduleIfRunnable(gate.value.db, gate.value.attempt.id);
    return ok({ view });
  } catch (err) {
    return errorResponse(err, "candidate-view");
  }
}
