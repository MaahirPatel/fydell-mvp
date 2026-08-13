import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/app-url";
import { isPreviewMode, previewCandidateResult } from "@/lib/dev/preview";

export const runtime = "nodejs";

/** GET: the candidate's result for a scored micro session (owner or org member). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  if (isPreviewMode()) {
    const fixture = previewCandidateResult(sessionId);
    return fixture
      ? NextResponse.json(fixture)
      : NextResponse.json({ ready: false, sessionStatus: "submitted", failed: false });
  }

  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: session } = await admin
    .from("sim_sessions")
    .select("id, candidate_user_id, organization_id, status, share_token")
    .eq("id", sessionId)
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

  const { data: run } = await admin
    .from("sim_analysis_runs")
    .select("result, completed_at, status, error")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!run || run.status !== "complete" || !run.result) {
    return NextResponse.json({
      ready: false,
      sessionStatus: session.status,
      failed: run?.status === "failed",
    });
  }

  const { data: credential } = await admin
    .from("sim_credentials")
    .select("credential_number, issued_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  return NextResponse.json({
    ready: true,
    result: run.result,
    completedAt: run.completed_at,
    shareUrl: session.share_token ? `${appUrl()}/results/${session.share_token}` : null,
    credential: credential || null,
  });
}
