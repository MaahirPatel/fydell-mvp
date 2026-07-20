import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { audit } from "@/lib/fde/lifecycle";
import {
  blueprintOutputHash,
  compileBlueprint,
  embedBlueprintInCustomerContext,
  inputConfigHash,
  renderSystemsContextMarkdown,
  type EmployerIntake,
} from "@/lib/fde/generator";
import { TRAIT_IDS, type TraitId } from "@/lib/fde/evidence/traits";

export const dynamic = "force-dynamic";

async function currentOrgId(userId: string) {
  const admin = createAdminSupabaseClient();
  const { data: membership } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return membership?.organization_id as string | undefined;
}

function parseIntake(body: Record<string, unknown>): EmployerIntake {
  const title = String(body.title || "").trim();
  const objective = String(body.objective || "").trim();
  const customerContext = String(body.customerContext || "").trim();
  const industry = String(body.industry || "").trim();
  const durationMinutes = Number(body.durationMinutes);

  if (!title) throw new Error("Title is required.");
  if (!objective) throw new Error("Objective is required.");
  if (!industry) throw new Error("Industry is required.");

  let skillWeights: Partial<Record<TraitId, number>> | undefined;
  if (body.skillWeights && typeof body.skillWeights === "object") {
    skillWeights = {};
    for (const id of TRAIT_IDS) {
      const raw = (body.skillWeights as Record<string, unknown>)[id];
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) skillWeights[id] = n;
    }
  }

  const aiPolicy =
    typeof body.aiPolicy === "string" && body.aiPolicy.trim() ? body.aiPolicy.trim() : undefined;

  let criticalTraits: TraitId[] | undefined;
  if (Array.isArray(body.criticalTraits)) {
    criticalTraits = body.criticalTraits
      .map((v) => String(v))
      .filter((id): id is TraitId => (TRAIT_IDS as readonly string[]).includes(id));
    if (criticalTraits.length === 0) criticalTraits = undefined;
  }

  return {
    title,
    objective,
    customerContext,
    industry,
    durationMinutes,
    skillWeights,
    aiPolicy,
    criticalTraits,
  };
}

function seedFromBody(body: Record<string, unknown>): string {
  const raw = typeof body.seed === "string" ? body.seed.trim() : "";
  return raw || `gen-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

    const body = await req.json();
    const action = body.action === "save_mission" ? "save_mission" : "compile";
    const intake = parseIntake(body);
    const seed = seedFromBody(body);

    const result = compileBlueprint(intake, seed);

    if (action === "compile") {
      return NextResponse.json({
        ok: true,
        seed,
        blueprint: result.blueprint,
        preview: result.preview,
        validation: result.validation,
        filesPreview: result.filesPreview,
        maturity: result.maturity,
        hashes: {
          input: inputConfigHash({
            title: intake.title,
            objective: intake.objective,
            industry: intake.industry,
            durationMinutes: intake.durationMinutes,
            seed,
            skillWeights: intake.skillWeights as Record<string, number> | undefined,
            aiPolicy: intake.aiPolicy,
            criticalTraits: intake.criticalTraits,
          }),
          output: blueprintOutputHash(result.blueprint),
          compilerVersion: result.blueprint.version,
        },
      });
    }

    // action === "save_mission"
    const organizationId = await currentOrgId(data.user.id);
    if (!organizationId) {
      return NextResponse.json({ error: "No active organization" }, { status: 403 });
    }

    const admin = createAdminSupabaseClient();
    const systemsContext = renderSystemsContextMarkdown(result.blueprint);
    const customerContext = embedBlueprintInCustomerContext(intake.customerContext, result.blueprint);

    const { data: mission, error } = await admin
      .from("fde_missions")
      .insert({
        organization_id: organizationId,
        title: intake.title,
        objective: intake.objective,
        customer_context: customerContext,
        systems_context: systemsContext,
        simulation_template_key: result.blueprint.blueprintId,
        status: "draft",
        created_by: data.user.id,
      })
      .select("*")
      .single();

    if (error || !mission) {
      return NextResponse.json({ error: error?.message || "Could not create mission draft." }, { status: 400 });
    }

    await audit(data.user.id, "fde_mission.generated_from_simulation", "fde_mission", mission.id, {
      organizationId,
      blueprintId: result.blueprint.blueprintId,
      seed,
      maturity: result.maturity,
    });

    return NextResponse.json({
      ok: true,
      mission,
      blueprint: result.blueprint,
      maturity: result.maturity,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not generate simulation.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
