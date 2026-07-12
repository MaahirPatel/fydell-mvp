import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { inviteCandidate } from "@/lib/pilot/lifecycle";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const candidateEmail = String(body.candidateEmail || "").trim();
    const candidateName = String(body.candidateName || "").trim();
    if (!candidateEmail || !candidateName) {
      return NextResponse.json({ error: "Name and email required" }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { data: membership } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", data.user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: "No active organization" }, { status: 403 });
    }

    let hiringRoleId = body.hiringRoleId as string | undefined;
    if (!hiringRoleId) {
      const { data: role } = await admin
        .from("hiring_roles")
        .select("id")
        .eq("organization_id", membership.organization_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      hiringRoleId = role?.id;
    }
    if (!hiringRoleId) {
      return NextResponse.json({ error: "No active hiring role" }, { status: 400 });
    }

    const result = await inviteCandidate({
      userId: data.user.id,
      email: data.user.email,
      organizationId: membership.organization_id,
      hiringRoleId,
      candidateEmail,
      candidateName,
    });

    return NextResponse.json({
      ok: true,
      acceptUrl: result.acceptUrl,
      candidateId: result.candidate.id,
      assignmentId: result.assignment.id,
      invitationId: result.invitation.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invite failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
