import { NextResponse } from "next/server";
import { requireManager } from "@/lib/mvp/guard";
import { getAttempt, createOutcomeFeedback } from "@/lib/mvp/db";
import type { FeedbackStage } from "@/lib/mvp/types";

const STAGES: FeedbackStage[] = ["30_day", "60_day", "90_day", "6_month", "12_month"];

// Manager-facing: record outcome feedback for a hired candidate (the moat).
export async function POST(req: Request) {
  const ctx = await requireManager();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { attemptId, feedbackStage } = body;
  if (!attemptId || !STAGES.includes(feedbackStage)) {
    return NextResponse.json(
      { error: "attemptId and a valid feedbackStage are required." },
      { status: 400 }
    );
  }

  const attempt = await getAttempt(attemptId);
  if (!attempt || attempt.workspace_id !== ctx.workspace.id) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }

  const feedback = await createOutcomeFeedback({
    attemptId,
    feedbackStage,
    managerEmail: body.managerEmail,
    managerRole: body.managerRole,
    overallPerformance: body.overallPerformance,
    wouldHireAgain: body.wouldHireAgain,
    rampSpeed: body.rampSpeed,
    workQuality: body.workQuality,
    communication: body.communication,
    judgment: body.judgment,
    independence: body.independence,
    notes: body.notes
  });
  return NextResponse.json({ feedback });
}
