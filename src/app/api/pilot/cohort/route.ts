import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import {
  ensureOrgPilotCohort,
  getOrgPilotCohort,
  setCohortStatus,
  type CohortStatus,
} from "@/lib/pilot/cohort";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { PILOT_EVALUATION_SLUG } from "@/lib/simulations/content/micro-ops-yield";

export const runtime = "nodejs";

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
      .select(
        "id, candidate_email, candidate_name, status, email_delivery, expires_at, created_at, sim_sessions(id, status, report_status, review_status, submitted_at)"
      )
      .eq("organization_id", org.organizationId)
      .eq("cohort_id", cohort.id)
      .order("created_at", { ascending: false });

    const rows = invitations || [];
    const metrics = {
      invited: rows.length,
      opened: rows.filter((r) => ["opened", "accepted", "started", "completed"].includes(r.status)).length,
      inProgress: rows.filter((r) => {
        const s = Array.isArray(r.sim_sessions) ? r.sim_sessions[0] : r.sim_sessions;
        return s && (s.status === "active" || s.status === "accepted");
      }).length,
      submitted: rows.filter((r) => {
        const s = Array.isArray(r.sim_sessions) ? r.sim_sessions[0] : r.sim_sessions;
        return s && ["submitted", "analyzed", "report_ready"].includes(s.status);
      }).length,
      reportsReady: rows.filter((r) => {
        const s = Array.isArray(r.sim_sessions) ? r.sim_sessions[0] : r.sim_sessions;
        return s && s.report_status === "ready";
      }).length,
      humanReview: rows.filter((r) => {
        const s = Array.isArray(r.sim_sessions) ? r.sim_sessions[0] : r.sim_sessions;
        return s && s.report_status === "human_review_required";
      }).length,
      reviewed: rows.filter((r) => {
        const s = Array.isArray(r.sim_sessions) ? r.sim_sessions[0] : r.sim_sessions;
        return s && s.review_status === "reviewed";
      }).length,
    };

    return NextResponse.json({
      cohort,
      evaluationSlug: PILOT_EVALUATION_SLUG,
      metrics,
      invitations: rows,
    });
  } catch (err) {
    console.error("[api/pilot/cohort] GET failed", err);
    return NextResponse.json({ error: "Could not load this cohort." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 403 });

  let body: { status?: CohortStatus };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.status || !["draft", "open", "paused", "closed"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = (await getOrgPilotCohort(org.organizationId)) ||
    (await ensureOrgPilotCohort(org.organizationId, user.id));

  try {
    const cohort = await setCohortStatus(org.organizationId, existing.id, body.status);
    return NextResponse.json({ ok: true, cohort });
  } catch (err) {
    console.error("[api/pilot/cohort] PATCH failed", err);
    return NextResponse.json({ error: "Could not update this cohort." }, { status: 400 });
  }
}
