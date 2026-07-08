import { NextResponse } from "next/server";
import { requireManager } from "@/lib/mvp/guard";
import { getAttempt, generateAttemptScore, generateCandidateReport } from "@/lib/mvp/db";

// Manager-facing: (re)generate the deterministic score + report for an attempt.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireManager();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const attempt = await getAttempt(id);
  if (!attempt || attempt.workspace_id !== ctx.workspace.id) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }

  const score = await generateAttemptScore(id);
  const report = await generateCandidateReport(id);
  return NextResponse.json({ score, report });
}
