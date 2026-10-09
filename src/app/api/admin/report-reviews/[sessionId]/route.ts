import { NextRequest, NextResponse } from "next/server";
import { requirePlatformRoleApi } from "@/lib/ops/require-platform-role";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { engineeringReportFor, evaluationStateOf } from "@/lib/engineering/submission-eval";
import { applyReviewAction, type ReviewAction, type ReviewStatus } from "@/lib/engineering/report-review";

function reviewSaveFailed(error: { message: string; code?: string }): NextResponse {
  console.error("[report-review] save failed", error.code, error.message);
  return NextResponse.json({ error: "Could not save the review. Nothing was changed; try again." }, { status: 500 });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = new Set<ReviewAction>(["release", "request_changes", "reopen"]);

/**
 * POST: a qualified Fydell reviewer releases, returns or reopens an
 * engineering report (AI-12). Body: { action, notes }.
 * Every decision is appended to sim_report_review_events with the reviewer
 * and the evaluation run it was based on. Releasing never messages anyone.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const ctx = await requirePlatformRoleApi(["super_admin", "admin", "reviewer"]);
  if ("error" in ctx) return ctx.error;
  const { sessionId } = await params;

  let body: { action?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const action = body.action as ReviewAction;
  if (!ACTIONS.has(action)) return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  const notes = String(body.notes ?? "").slice(0, 4000);

  const admin = createAdminSupabaseClient();
  const { data: session } = await admin
    .from("sim_sessions")
    .select("id, template_id, status")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const report = await engineeringReportFor(sessionId, session.template_id as string);
  if (!report) return NextResponse.json({ error: "Not an engineering assessment" }, { status: 400 });

  const current: ReviewStatus = report.review.status;
  const decision = applyReviewAction(current, action, { notes, evaluation: evaluationStateOf(report) });
  if (decision.ok === false) return NextResponse.json({ error: decision.error }, { status: 409 });

  const evaluationRunId = report.evaluation.state === "finished" ? report.evaluation.runId : null;
  const now = new Date().toISOString();
  const values = {
    status: decision.status,
    reviewer_email: ctx.email,
    notes,
    evaluation_run_id: evaluationRunId,
    decided_at: now,
    updated_at: now,
  };
  // Compare-and-set on the status the reviewer saw, so two reviewers acting
  // at once cannot silently overwrite each other.
  const { data: existing } = await admin
    .from("sim_report_reviews")
    .select("session_id")
    .eq("session_id", sessionId)
    .maybeSingle();
  const stale = NextResponse.json(
    { error: "Someone else changed this review. Reload and try again." },
    { status: 409 }
  );
  if (existing) {
    const { data: updated, error } = await admin
      .from("sim_report_reviews")
      .update(values)
      .eq("session_id", sessionId)
      .eq("status", current)
      .select("session_id");
    if (error) return reviewSaveFailed(error);
    if (!updated?.length) return stale;
  } else {
    const { error } = await admin.from("sim_report_reviews").insert({ session_id: sessionId, ...values });
    if (error?.code === "23505") return stale;
    if (error) return reviewSaveFailed(error);
  }
  await admin.from("sim_report_review_events").insert({
    session_id: sessionId,
    action,
    from_status: current,
    to_status: decision.status,
    actor_email: ctx.email,
    notes,
    evaluation_run_id: evaluationRunId,
  });

  return NextResponse.json({ ok: true, status: decision.status });
}
