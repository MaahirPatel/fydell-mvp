import { errorResponse, ok } from "@/lib/eng/http";
import { authoredCandidateAttempt } from "@/lib/eng/authored/route-helpers";
import { buildAuthoredCandidateReport } from "@/lib/eng/authored/reports";

/** The candidate's released report, or null until the hiring team releases it. */
export async function GET(_req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await authoredCandidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, authored } = gate.value;
  try {
    return ok({ report: await buildAuthoredCandidateReport(db, authored.attempt, authored.pkg) });
  } catch (err) {
    return errorResponse(err, "authored-candidate-report");
  }
}
