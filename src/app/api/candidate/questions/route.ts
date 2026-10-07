import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { listQuestionsForCandidate, answerQuestion, notifyQuestionAnswered } from "@/lib/employer/review";
import { csrfGuard } from "@/lib/security/csrf";
import { publicErrorMessage } from "@/lib/security/public-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/candidate/questions - follow-up questions from employers, open first.
 * POST /api/candidate/questions - respond to a question.
 * Body: { questionId, response }
 */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const questions = await listQuestionsForCandidate(user.id);
    return NextResponse.json({ ok: true, questions });
  } catch (e) {
    const message = publicErrorMessage(e, "Could not load questions.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { questionId?: string; response?: string; organizationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.questionId) {
    return NextResponse.json({ error: "questionId is required." }, { status: 400 });
  }

  try {
    // Verify the question belongs to one of this candidate's shares before answering.
    const mine = await listQuestionsForCandidate(user.id);
    const target = mine.find((q) => q.id === body.questionId);
    if (!target) return NextResponse.json({ error: "Question not found." }, { status: 404 });
    if (target.status === "closed") {
      return NextResponse.json({ error: "This question was closed by the employer, so it can no longer be answered." }, { status: 409 });
    }
    if (!target.shareActive) {
      return NextResponse.json({ error: `The link you shared with ${target.organizationName} is no longer active, so they can't read an answer.` }, { status: 409 });
    }
    const updated = await answerQuestion(target.id, target.organizationId, String(body.response ?? ""));
    await notifyQuestionAnswered(updated);
    return NextResponse.json({ ok: true, question: updated });
  } catch (e) {
    const known = e instanceof Error && /^(Response |This question was closed)/.test(e.message) ? e.message : null;
    const message = known ?? publicErrorMessage(e, "Could not save your answer. Your text is kept; try again.");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
