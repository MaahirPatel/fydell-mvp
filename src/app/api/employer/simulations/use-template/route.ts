import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { audit, publishMission } from "@/lib/fde/lifecycle";
import {
  blueprintOutputHash,
  compileBlueprint,
  embedBlueprintInCustomerContext,
  inputConfigHash,
  renderSystemsContextMarkdown,
} from "@/lib/fde/generator";
import { getFydellTemplate } from "@/lib/fde/templates/catalog";

export const dynamic = "force-dynamic";

/**
 * Copy a Fydell platform template into an organization-owned mission draft.
 * Does not invent candidates or attempts. Provenance: source=fydell_template.
 */
export async function POST(req: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const templateId = String(body.templateId || "fydell-enterprise-analytics-deployment-recovery");
    const template = getFydellTemplate(templateId);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const admin = createAdminSupabaseClient();
    const { data: membership } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", data.user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (!membership?.organization_id) {
      return NextResponse.json({ error: "No active organization" }, { status: 403 });
    }

    const result = compileBlueprint(template.intake, template.seed);
    const systemsContext = renderSystemsContextMarkdown(result.blueprint);
    const customerContext = embedBlueprintInCustomerContext(
      [
        template.intake.customerContext,
        "",
        `Source: Fydell Template (${template.id})`,
        `Role: ${template.roleTitle} · ${template.seniority}`,
      ].join("\n"),
      result.blueprint
    );

    const { data: mission, error } = await admin
      .from("fde_missions")
      .insert({
        organization_id: membership.organization_id,
        title: template.title,
        objective: template.intake.objective,
        customer_context: customerContext,
        systems_context: systemsContext,
        simulation_template_key: template.id,
        technical_environment: template.intake.industry,
        status: "draft",
        created_by: data.user.id,
      })
      .select("*")
      .single();

    if (error || !mission) {
      return NextResponse.json(
        { error: error?.message || "Could not create simulation from template." },
        { status: 400 }
      );
    }

    await audit(data.user.id, "fde_mission.adopted_fydell_template", "fde_mission", mission.id, {
      templateId: template.id,
      blueprintId: result.blueprint.blueprintId,
      seed: template.seed,
      inputHash: inputConfigHash({
        title: template.intake.title,
        objective: template.intake.objective,
        industry: template.intake.industry,
        durationMinutes: template.intake.durationMinutes,
        seed: template.seed,
      }),
      outputHash: blueprintOutputHash(result.blueprint),
    });

    // Auto-publish validated Fydell templates so invite is immediate for pilot.
    let published = mission;
    try {
      published = await publishMission(mission.id, data.user.id);
    } catch {
      // Leave as draft if gate rejects; employer can still preview/fix.
    }

    return NextResponse.json({
      ok: true,
      mission: published,
      templateId: template.id,
      maturity: result.maturity,
      redirectTo: `/app/employer/missions/${mission.id}#invite`,
      message:
        published.status === "active"
          ? "Template is live in your workspace. Invite a candidate below."
          : "Template copied as a draft. Preview, publish, then invite.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not use template.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
