import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { orgAttempt } from "@/lib/eng/route-helpers";
import { submitReportFeedback } from "@/lib/eng/report-feedback";
import { csrfGuard } from "@/lib/security/csrf";

export const runtime = "nodejs";

/**
 * POST /api/eng/org/attempts/[attemptId]/report/feedback
 * Record whether the employer report was useful (§21).
 * Body: { understoodWork?, identifiedGaps?, helpedDecision?, note? }
 */
export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const blocked = await csrfGuard(req);
  if (blocked) return blocked;
  const gate = await orgAttempt((await params).attemptId, "view_reports");
  if (gate.ok === false) return gate.response;
  const { member, attempt } = gate.value;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    reportId?: unknown;
    understoodWork?: unknown;
    identifiedGaps?: unknown;
    helpedDecision?: unknown;
    note?: unknown;
  } | null;
  const reportId = typeof body?.reportId === "string" ? body.reportId : "";
  if (!reportId) return NextResponse.json({ error: "Report is required." }, { status: 400 });

  try {
    const feedback = await submitReportFeedback(reportId, attempt.id, member.organizationId, user.id, {
      understoodWork: typeof body?.understoodWork === "boolean" ? body.understoodWork : undefined,
      identifiedGaps: typeof body?.identifiedGaps === "boolean" ? body.identifiedGaps : undefined,
      helpedDecision: typeof body?.helpedDecision === "boolean" ? body.helpedDecision : undefined,
      note: typeof body?.note === "string" ? body.note : "",
    });
    return NextResponse.json({ ok: true, feedback });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not save feedback." }, { status: 400 });
  }
}
