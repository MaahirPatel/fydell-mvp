import { NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { proofAdmin, audit } from "@/lib/sim-engine/proof/db";

export async function POST(request: Request, context: { params: Promise<{ runId: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { runId } = await context.params;
  const admin = proofAdmin();
  const { data: run } = await admin.from("proof_runs").select("organization_id").eq("id", runId).maybeSingle();
  if (!run || run.organization_id !== org.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json()) as {
    interviewed?: boolean;
    advanced?: boolean;
    probes_used?: boolean;
    evidence_confirmed?: "confirmed" | "contradicted" | "unclear";
    notes?: string;
    offer_made?: boolean;
    offer_accepted?: boolean;
    hired?: boolean;
    reason?: string;
    post_hire?: {
      days_since_start?: number;
      manager_assessment?: string;
      ramp_status?: string;
      retention_status?: string;
      qualitative_feedback?: string;
    };
  };

  await admin.from("proof_interview_feedback").insert({
    run_id: runId,
    interviewed: body.interviewed ?? null,
    advanced: body.advanced ?? null,
    probes_used: body.probes_used ?? null,
    evidence_confirmed: body.evidence_confirmed ?? null,
    notes: body.notes ?? null,
  });

  if (body.hired !== undefined || body.offer_made !== undefined) {
    const { data: outcome } = await admin
      .from("proof_outcomes")
      .upsert(
        {
          run_id: runId,
          offer_made: body.offer_made ?? null,
          offer_accepted: body.offer_accepted ?? null,
          hired: body.hired ?? null,
          reason: body.reason ?? null,
        },
        { onConflict: "run_id" },
      )
      .select("id")
      .single();
    if (body.hired) {
      await admin.from("proof_runs").update({ status: "hired" }).eq("id", runId);
    }
    if (outcome && body.post_hire) {
      await admin.from("proof_post_hire_outcomes").insert({
        outcome_id: outcome.id,
        ...body.post_hire,
      });
    }
  }

  await admin.from("proof_product_events").insert({
    organization_id: org.organizationId,
    run_id: runId,
    name: body.hired ? "candidate_hired" : "interview_feedback",
    payload: { probes_used: body.probes_used, evidence_confirmed: body.evidence_confirmed },
  });
  await audit(user.email, "outcome_recorded", "proof_runs", runId, null, body);
  return NextResponse.json({ ok: true });
}
