import { NextResponse } from "next/server";
import {
  submitFinalRecommendation,
  generateAttemptScore,
  generateCandidateReport
} from "@/lib/mvp/db";

// Candidate-facing: submit the final recommendation, then deterministically
// score it and build the evidence-backed report.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { recommendation } = await req.json().catch(() => ({}));
    if (typeof recommendation !== "string" || recommendation.trim().length < 1) {
      return NextResponse.json(
        { error: "A final recommendation is required." },
        { status: 400 }
      );
    }
    const attempt = await submitFinalRecommendation(id, recommendation.trim());
    if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });

    const score = await generateAttemptScore(id);
    await generateCandidateReport(id);
    return NextResponse.json({ ok: true, overall_score: score?.overall_score ?? null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not submit.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
