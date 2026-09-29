import { acknowledgeUpdate } from "@/lib/eng/attempts";
import { errorResponse, ok } from "@/lib/eng/http";
import { candidateAttempt } from "@/lib/eng/route-helpers";

export async function POST(_req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await candidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, attempt, user } = gate.value;
  try {
    const updated = await acknowledgeUpdate(db, attempt, user.id);
    return ok({ acknowledgedAt: updated.update_acknowledged_at });
  } catch (err) {
    return errorResponse(err, "acknowledge-update");
  }
}
