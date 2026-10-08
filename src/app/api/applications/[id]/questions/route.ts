/**
 * The applicant's side of targeted questions on one of their applications.
 *
 * GET  - questions the hiring team asked.
 * POST - answer one. Body: { questionId, response }.
 */
import { NextResponse } from "next/server";
import { csrfGuard } from "@/lib/security/csrf";
import { requireUser } from "@/lib/simulations/auth";
import { answerApplicationQuestion, listApplicationQuestionsForApplicant } from "@/lib/profile-evidence/applications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  return NextResponse.json({ questions: await listApplicationQuestionsForApplicant(user.id, id) }, { headers: noStore });
}

export async function POST(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first. Your answer is kept on this page." }, { status: 401 });
  const body: unknown = await req.json().catch(() => null);
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  if (typeof b.questionId !== "string") return NextResponse.json({ error: "Choose a question to answer." }, { status: 400 });
  const result = await answerApplicationQuestion(user.id, b.questionId, typeof b.response === "string" ? b.response : "");
  if (result.ok === false) return NextResponse.json({ error: result.error }, { status: result.status, headers: noStore });
  return NextResponse.json({ question: result.question }, { headers: noStore });
}
