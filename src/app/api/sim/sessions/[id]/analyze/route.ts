import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { runMicroScoring } from "@/lib/simulations/micro-scoring";
import { getVersionContent } from "@/lib/simulations/db";
import { isMicroContent } from "@/lib/simulations/micro-types";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST: run (or re-check) analysis for a submitted session. Idempotent -
 * called by the post-submission page and the employer report page, so a
 * failed run can always be retried without duplicating results.
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
    const { analysisRunId } = await runMicroScoring(id);
    return NextResponse.json({ ok: true, analysisRunId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
