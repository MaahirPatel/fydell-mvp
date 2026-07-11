import { NextResponse } from "next/server";
import { finalizeAttemptWithScore } from "@/lib/mvp/db";

// Candidate-facing: submit recommendation, score, and persist evidence report.
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
    const result = await finalizeAttemptWithScore(id, recommendation.trim());
    // #region agent log
    fetch("http://127.0.0.1:7392/ingest/681204a9-761a-4288-901b-c44a46a40f3b", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "dc0a6c" },
      body: JSON.stringify({
        sessionId: "dc0a6c",
        runId: "loop-verify",
        hypothesisId: "H4",
        location: "submit/route.ts",
        message: "Finalize result",
        data: { attemptId: id, score: result.overall_score },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return NextResponse.json({ ok: true, overall_score: result.overall_score });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not submit.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
