import { recordConsent } from "@/lib/eng/attempts";
import { buildCandidateView } from "@/lib/eng/candidate-view";
import { errorResponse, ok } from "@/lib/eng/http";
import { candidateAttempt } from "@/lib/eng/route-helpers";

export async function POST(_req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await candidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, attempt, user } = gate.value;
  try {
    const updated = await recordConsent(db, attempt, user.id);
    return ok({ view: await buildCandidateView(db, updated) });
  } catch (err) {
    return errorResponse(err, "consent");
  }
}
