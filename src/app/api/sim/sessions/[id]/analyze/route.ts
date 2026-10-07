import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { runMicroScoring } from "@/lib/simulations/micro-scoring";
import { getVersionContent } from "@/lib/simulations/db";
import { isMicroContent } from "@/lib/simulations/micro-types";
import { runV2Scoring } from "@/lib/simulations/v2/run";
import { mayUseKeywordFallback } from "@/lib/contracts/da01";
import { evaluateSubmittedSession } from "@/lib/engineering/submission-eval";
import { publicErrorMessage } from "@/lib/security/public-error";

export const runtime = "nodejs";
// Engineering attempts also run the trusted + hidden tests in an isolated runner.
export const maxDuration = 300;

/**
 * POST: run (or re-check) analysis for a submitted session. Idempotent -
 * called by the post-submission page and the employer report page, so a
 * failed run can always be retried without duplicating results.
 *
 * DA-01 is pinned to v2. Keyword micro-scoring is never an equivalent fallback
 * for that evaluation. Other micros may still fall back.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Caller must be the candidate or an org member for this session.
  const admin = createAdminSupabaseClient();
  const { data: session } = await admin
    .from("sim_sessions")
    .select("id, candidate_user_id, organization_id, status, template_version_id")
    .eq("id", id)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  if (session.candidate_user_id !== user.id) {
    const { data: member } = await admin
      .from("organization_members")
      .select("id")
      .eq("organization_id", session.organization_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (session.status === "accepted" || session.status === "active")
    return NextResponse.json({ error: "Session has not been submitted" }, { status: 409 });

  try {
    const content = await getVersionContent(session.template_version_id);
    if (!isMicroContent(content)) {
      return NextResponse.json(
        { error: "This simulation format is retired and can no longer be analyzed." },
        { status: 410 }
      );
    }

    // Engineering scenarios: deterministic correctness evidence comes from the
    // trusted and hidden tests run against the immutable submission. The run
    // is idempotent and records its own failures (never a candidate failure),
    // so a runner problem must not block the rest of the analysis.
    let engineering: { status: string; runId?: string } | null = null;
    if (content.engineering) {
      try {
        const outcome = await evaluateSubmittedSession(id);
        engineering =
          outcome.kind === "evaluated"
            ? { status: outcome.result?.status ?? "running", runId: outcome.runId }
            : outcome.kind === "no_files"
              ? { status: "no_files" }
              : null;
      } catch (err) {
        console.error(`[analyze] engineering evaluation failed for session ${id}:`, err);
        engineering = { status: "error" };
      }
    }

    try {
      const { analysisRunId } = await runV2Scoring(id);
      return NextResponse.json({ ok: true, analysisRunId, engineVersion: "v2", engineering });
    } catch (v2Err) {
      if (!mayUseKeywordFallback(content.slug)) {
        console.error("[analyze] DA-01 v2 scoring failed; no keyword fallback:", v2Err);
        return NextResponse.json(
          {
            ok: false,
            code: "analysis_failed",
            error:
              "Analysis failed. This evaluation cannot be scored by the keyword fallback.",
            engineVersion: "v2",
          },
          { status: 500 },
        );
      }
      console.error("[analyze] v2 scoring failed, falling back to micro:", v2Err);
      const { analysisRunId } = await runMicroScoring(id);
      return NextResponse.json({
        ok: true,
        analysisRunId,
        engineVersion: "micro-v2",
        fallback: true,
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: publicErrorMessage(err, "Analysis failed") },
      { status: 500 }
    );
  }
}
