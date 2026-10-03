import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { listQuestionsForCandidate, answerQuestion } from "@/lib/employer/review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/candidate/questions — list open follow-up questions from employers.
 * POST /api/candidate/questions — respond to a question.
 * Body: { questionId, response }
 */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const questions = await listQuestionsForCandidate(user.id);
    return NextResponse.json({ ok: true, questions });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load questions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { questionId?: string; response?: string; organizationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.questionId || !body.organizationId) {
    return NextResponse.json({ error: "questionId and organizationId are required." }, { status: 400 });
  }

  try {
    // Verify the question belongs to one of this candidate's shares before answering.
    const mine = await listQuestionsForCandidate(user.id);
    const target = mine.find((q) => q.id === body.questionId);
    if (!target) return NextResponse.json({ error: "Question not found." }, { status: 404 });
    const updated = await answerQuestion(body.questionId, body.organizationId, String(body.response ?? ""));
    return NextResponse.json({ ok: true, question: updated });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not save response.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
