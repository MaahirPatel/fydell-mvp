import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { getCompanySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Database is not configured." },
        { status: 503 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: auth } = await supabase.auth.getUser();
    let userId = auth.user?.id || null;

    // Transitional: company cookie users still need a path once linked
    if (!userId) {
      const company = await getCompanySession();
      if (!company) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json({
        organizationName: null,
        roleTitle: null,
        pipeline: { invited: 0, accepted: 0, in_progress: 0, submitted: 0, report_ready: 0 },
        activity: [],
        error: "Complete email-verified login to load live data.",
      });
    }

    const admin = createAdminSupabaseClient();
    const { data: membership } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({
        organizationName: null,
        roleTitle: null,
        pipeline: { invited: 0, accepted: 0, in_progress: 0, submitted: 0, report_ready: 0 },
        activity: [],
        approvalStatus: "pending",
        invitesEnabled: false,
      });
    }

    const orgId = membership.organization_id;
    const { data: org } = await admin
      .from("organizations")
      .select("name, status")
      .eq("id", orgId)
      .maybeSingle();

    const { data: onboarding } = await admin
      .from("employer_onboarding")
      .select("approval_status")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: role } = await admin
      .from("hiring_roles")
      .select("*")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: candidates } = await admin
      .from("pilot_candidates")
      .select("id, full_name, email, status")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50);

    const candidateIds = (candidates || []).map((c) => c.id);
    const { data: assignments } =
      candidateIds.length > 0
        ? await admin
            .from("simulation_assignments")
            .select("id, candidate_id, status")
            .in("candidate_id", candidateIds)
        : { data: [] as Array<{ id: string; candidate_id: string; status: string }> };

    const { data: sessions } =
      candidateIds.length > 0
        ? await admin
            .from("pilot_simulation_sessions")
            .select("id, candidate_id, status, submission_reference")
            .eq("organization_id", orgId)
        : { data: [] as Array<{ id: string; candidate_id: string; status: string }> };

    const { data: reports } =
      candidateIds.length > 0
        ? await admin
            .from("evidence_reports_v2")
            .select("id, candidate_id, status")
            .eq("organization_id", orgId)
        : { data: [] as Array<{ id: string; candidate_id: string; status: string }> };

    const asg = assignments || [];
    const pipeline = {
      invited: asg.filter((a) => a.status === "invited").length,
      accepted: asg.filter((a) => a.status === "accepted" || a.status === "available").length,
      in_progress: asg.filter((a) => a.status === "in_progress").length,
      submitted: asg.filter((a) =>
        ["submitted", "report_processing", "report_ready", "reviewed"].includes(a.status)
      ).length,
      report_ready: (reports || []).filter((r) =>
        ["ready", "released"].includes(r.status)
      ).length,
    };

    const activity = (candidates || []).map((c) => {
      const a = asg.find((x) => x.candidate_id === c.id);
      const s = (sessions || []).find((x) => x.candidate_id === c.id);
      const r = (reports || []).find((x) => x.candidate_id === c.id);
      return {
        id: c.id,
        name: c.full_name || c.email,
        email: c.email,
        invitation: c.status,
        session: s?.status || "not_started",
        report: r?.status || "none",
      };
    });

    return NextResponse.json({
      organizationName: org?.name || null,
      roleTitle: role?.title || null,
      pipeline,
      activity,
      approvalStatus: onboarding?.approval_status || org?.status,
      invitesEnabled: Boolean(role?.invites_enabled),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Dashboard error";
    console.error("[pilot/dashboard]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
