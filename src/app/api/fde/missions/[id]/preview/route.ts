import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  applyBlueprintOverlay,
  extractBlueprintFromCustomerContext,
} from "@/lib/fde/generator";
import { createPreviewAttempt } from "@/lib/fde/lifecycle";
import { resolveScenarioForSession } from "@/lib/relay/variants/resolve";

export const dynamic = "force-dynamic";

async function authorizeMission(userId: string, missionId: string) {
  const admin = createAdminSupabaseClient();
  const { data: mission } = await admin
    .from("fde_missions")
    .select("*")
    .eq("id", missionId)
    .maybeSingle();
  if (!mission) return { error: "Simulation not found" as const, status: 404 as const };

  const { data: membership } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("organization_id", mission.organization_id)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) return { error: "Forbidden" as const, status: 403 as const };

  return { mission, admin };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const auth = await authorizeMission(data.user.id, id);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { mission } = auth;

    const release = resolveScenarioForSession({
      preferVariantId: process.env.RELAY_ACTIVE_VARIANT_ID || null,
    });
    const blueprint = mission.customer_context
      ? extractBlueprintFromCustomerContext(String(mission.customer_context))
      : null;
    const overlay = applyBlueprintOverlay(release.files, blueprint);
    const brief = overlay.files["docs/customer-brief.md"] || "";
    const shipmentsHead = (overlay.files["data/shipments.csv"] || "").split("\n").slice(0, 4).join("\n");
    const inboxHead = (overlay.files["data/inbox_thread.json"] || "").slice(0, 400);

    return NextResponse.json({
      mission: {
        id: mission.id,
        title: mission.title,
        objective: mission.objective,
        status: mission.status,
      },
      overlay: {
        companyName: overlay.companyName,
        templateLabel: overlay.templateLabel,
        durationMinutes: overlay.durationMinutes,
        curveballNarrative: overlay.curveballNarrative,
        usedValidatedTemplate: overlay.usedValidatedTemplate,
        blueprintId: overlay.blueprintId,
        materialDiffSignature: overlay.materialDiffSignature,
        briefExcerpt: brief.slice(0, 1800),
        shipmentsCsvHead: shipmentsHead,
        inboxJsonHead: inboxHead,
        fileCount: Object.keys(overlay.files).length,
        fileNames: Object.keys(overlay.files).sort(),
      },
      attemptKindNote:
        "Launching a walkthrough creates attempt_kind=preview — excluded from hiring analytics and candidate lists.",
      message: blueprint
        ? "Generated with your role configuration on the validated FDE pilot template. Candidate CSV rows and inbox thread reflect this blueprint."
        : "Showing the validated FDE pilot template. Generate a simulation to overlay your company's role context.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not build preview.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

/** Create (or reuse) a first-class preview attempt for the signed-in employer. */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const auth = await authorizeMission(data.user.id, id);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { session, duplicate } = await createPreviewAttempt({
      missionId: id,
      employerUserId: data.user.id,
    });

    return NextResponse.json({
      ok: true,
      duplicate,
      attemptKind: "preview",
      sessionId: session.id,
      // Session id is a valid resume token for the owning user.
      launchUrl: `/s/${session.id}/preflight`,
      excludedFromAnalytics: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not create preview attempt.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
