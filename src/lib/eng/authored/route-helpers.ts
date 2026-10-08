import "server-only";
import { getAttemptForCandidate } from "../attempts";
import { engAdmin, requireCandidate, type Admin, type Gate } from "../context";
import { errorResponse } from "../http";
import { loadAuthored, type AuthoredAttempt } from "./runtime";

export interface AuthoredCandidateCtx {
  db: Admin;
  user: { id: string; email: string };
  authored: AuthoredAttempt;
}

/** Signed-in candidate who owns this attempt, and the attempt is an employer-authored work sample. */
export async function authoredCandidateAttempt(attemptId: string): Promise<Gate<AuthoredCandidateCtx>> {
  const gate = await requireCandidate();
  if (gate.ok === false) return gate;
  const db = engAdmin();
  try {
    const attempt = await getAttemptForCandidate(db, attemptId, gate.value.id);
    const authored = await loadAuthored(db, attempt);
    return { ok: true, value: { db, user: gate.value, authored } };
  } catch (err) {
    return { ok: false, response: errorResponse(err, "authored-attempt") };
  }
}
