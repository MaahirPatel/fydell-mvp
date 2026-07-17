import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { createMissionDraft } from "@/lib/fde/lifecycle";

export const dynamic = "force-dynamic";

async function currentOrgId(adminUserId: string) {
  const admin = createAdminSupabaseClient();
  const { data: membership } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", adminUserId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return membership?.organization_id as string | undefined;
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = await currentOrgId(data.user.id);
  if (!organizationId) {
    return NextResponse.json({ missions: [], organizationId: null });
  }

  const admin = createAdminSupabaseClient();
  const { data: missions, error } = await admin
    .from("fde_missions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ missions: missions || [], organizationId });
}

export async function POST(req: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = await currentOrgId(data.user.id);
    if (!organizationId) {
      return NextResponse.json({ error: "No active organization" }, { status: 403 });
    }

    const body = await req.json();
    const title = String(body.title || "").trim();
    if (!title) {
      return NextResponse.json({ error: "Mission title is required." }, { status: 400 });
    }

    const mission = await createMissionDraft({
      orgId: organizationId,
      userId: data.user.id,
      title,
      objective: body.objective,
      customerContext: body.customerContext,
      expectedOutcome: body.expectedOutcome,
      systemsContext: body.systemsContext,
      technicalEnvironment: body.technicalEnvironment,
      constraints: body.constraints,
      securityConsiderations: body.securityConsiderations,
      successMeasures: body.successMeasures,
      location: body.location,
      travelExpectation: body.travelExpectation,
      workArrangement: body.workArrangement,
      compensationMinimum: body.compensationMinimum ?? null,
      compensationMaximum: body.compensationMaximum ?? null,
      currency: body.currency,
      hiringTimeline: body.hiringTimeline,
      invitationLimit: body.invitationLimit,
    });

    return NextResponse.json({ ok: true, mission });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not create mission.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
