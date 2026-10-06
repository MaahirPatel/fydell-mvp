import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type ReportFeedback = {
  id: string;
  reportId: string;
  understoodWork: boolean | null;
  identifiedGaps: boolean | null;
  helpedDecision: boolean | null;
  note: string;
  createdAt: string;
};

export type ReportFeedbackInput = {
  understoodWork?: boolean;
  identifiedGaps?: boolean;
  helpedDecision?: boolean;
  note?: string;
};

/**
 * Record whether an employer report was useful (§21).
 * This feeds product quality, not candidate scoring.
 * One feedback per reviewer per report version (upsert).
 */
export async function submitReportFeedback(
  reportId: string,
  attemptId: string,
  organizationId: string,
  reviewerUserId: string,
  input: ReportFeedbackInput,
): Promise<ReportFeedback> {
  const db = createAdminSupabaseClient();

  // Verify the report belongs to this org's attempt.
  const { data: report } = await db
    .from("eng_reports")
    .select("id, attempt_id, eng_attempts!inner(invitation_id, eng_invitations!inner(organization_id))")
    .eq("id", reportId)
    .maybeSingle();
  if (!report) throw new Error("Report not found.");

  const reportOrgId = (report.eng_attempts as unknown as {
    eng_invitations?: { organization_id?: string };
  } | null)?.eng_invitations?.organization_id;
  if (!reportOrgId || reportOrgId !== organizationId) {
    throw new Error("Report not found.");
  }

  // Verify the report is for the attempt in the route URL.
  // Without this, feedback for attempt A's report could be filed via attempt B's URL.
  if (report.attempt_id !== attemptId) {
    throw new Error("Report does not belong to this attempt.");
  }

  const { data, error } = await db
    .from("report_feedback")
    .upsert(
      {
        report_id: reportId,
        organization_id: organizationId,
        reviewer_user_id: reviewerUserId,
        understood_work: input.understoodWork ?? null,
        identified_gaps: input.identifiedGaps ?? null,
        helped_decision: input.helpedDecision ?? null,
        note: (input.note ?? "").trim().slice(0, 1000),
      },
      { onConflict: "report_id,reviewer_user_id" },
    )
    .select("*")
    .single();
  if (error || !data) throw new Error("Could not save feedback.");

  const r = data as Record<string, string | boolean | null>;
  return {
    id: r.id as string,
    reportId: r.report_id as string,
    understoodWork: r.understood_work as boolean | null,
    identifiedGaps: r.identified_gaps as boolean | null,
    helpedDecision: r.helped_decision as boolean | null,
    note: (r.note as string) ?? "",
    createdAt: r.created_at as string,
  };
}

/** Aggregate usefulness for a report (for product quality dashboards). */
export async function getReportFeedbackSummary(reportId: string): Promise<{
  count: number;
  understoodWork: number;
  identifiedGaps: number;
  helpedDecision: number;
}> {
  const db = createAdminSupabaseClient();
  const { data } = await db.from("report_feedback").select("understood_work, identified_gaps, helped_decision").eq("report_id", reportId);
  const rows = (data ?? []) as Array<{ understood_work: boolean | null; identified_gaps: boolean | null; helped_decision: boolean | null }>;
  return {
    count: rows.length,
    understoodWork: rows.filter((r) => r.understood_work === true).length,
    identifiedGaps: rows.filter((r) => r.identified_gaps === true).length,
    helpedDecision: rows.filter((r) => r.helped_decision === true).length,
  };
}
