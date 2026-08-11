import { NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { ensureOrgPilotCohort } from "@/lib/pilot/cohort";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Same-cohort comparison for completed candidates only. */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 403 });

  try {
    const cohort = await ensureOrgPilotCohort(org.organizationId, user.id);
    const admin = createAdminSupabaseClient();
    const { data: invitations } = await admin
      .from("sim_invitations")
      .select("id, candidate_email, candidate_name, template_version_id, sim_sessions(id, status, report_status)")
      .eq("organization_id", org.organizationId)
      .eq("cohort_id", cohort.id)
      .eq("template_version_id", cohort.template_version_id);

    const rows = [];
    for (const inv of invitations || []) {
      const session = Array.isArray(inv.sim_sessions) ? inv.sim_sessions[0] : inv.sim_sessions;
      if (!session || session.status !== "report_ready") continue;
      const { data: run } = await admin
        .from("sim_analysis_runs")
        .select("id, overall, recommendation, result, ai_use_summary, interview_questions")
        .eq("session_id", session.id)
        .eq("status", "complete")
        .eq("is_current", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!run) continue;
      const result = (run.result || {}) as {
        performance?: number | null;
        coverage?: number;
        confidence?: number;
        band?: string;
        strengths?: string[];
        improvements?: string[];
        competencies?: { key: string; label: string; performance: number | null; band: string }[];
      };
      rows.push({
        sessionId: session.id,
        candidate: inv.candidate_name || inv.candidate_email,
        reportStatus: session.report_status,
        performance: result.performance ?? null,
        coverage: result.coverage ?? null,
        confidence: result.confidence ?? null,
        band: result.band || null,
        strengths: result.strengths || [],
        counterevidence: result.improvements || [],
        competencies: result.competencies || [],
        humanReviewRequired: Boolean(
          (run.ai_use_summary as { humanReviewRequired?: boolean } | null)?.humanReviewRequired
        ),
      });
    }

    return NextResponse.json({
      cohortId: cohort.id,
      evaluationVersionId: cohort.template_version_id,
      candidates: rows,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Compare failed" },
      { status: 500 }
    );
  }
}
