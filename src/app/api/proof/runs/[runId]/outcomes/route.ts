import { NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { capabilityDeniedMessage, orgCan } from "@/lib/orgs/capabilities";
import { proofAdmin, audit } from "@/lib/sim-engine/proof/db";
import { authorizeProofRunAccess } from "@/lib/sim-engine/proof/sandbox/access";

interface PostHire {
  days_since_start?: number;
  manager_assessment?: string;
  ramp_status?: string;
  retention_status?: string;
  qualitative_feedback?: string;
}

interface OutcomeBody {
  interviewed?: boolean;
  advanced?: boolean;
  probes_used?: boolean;
  evidence_confirmed?: "confirmed" | "contradicted" | "unclear";
  notes?: string;
  offer_made?: boolean;
  offer_accepted?: boolean;
  hired?: boolean;
  reason?: string;
  post_hire?: PostHire;
}

const EVIDENCE_STATES = new Set(["confirmed", "contradicted", "unclear"]);

function bool(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function text(value: unknown, max: number): string | undefined {
  return typeof value === "string" ? value.slice(0, max) : undefined;
}

/** Copies only known fields, so a caller cannot set ids or columns this route does not own. */
function parseOutcomeBody(raw: unknown): OutcomeBody | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const evidence = typeof r.evidence_confirmed === "string" && EVIDENCE_STATES.has(r.evidence_confirmed)
    ? (r.evidence_confirmed as OutcomeBody["evidence_confirmed"])
    : undefined;
  let postHire: PostHire | undefined;
  if (r.post_hire && typeof r.post_hire === "object" && !Array.isArray(r.post_hire)) {
    const p = r.post_hire as Record<string, unknown>;
    const days = typeof p.days_since_start === "number" && Number.isInteger(p.days_since_start) && p.days_since_start >= 0 && p.days_since_start <= 3650
      ? p.days_since_start
      : undefined;
    postHire = {
      days_since_start: days,
      manager_assessment: text(p.manager_assessment, 2000),
      ramp_status: text(p.ramp_status, 100),
      retention_status: text(p.retention_status, 100),
      qualitative_feedback: text(p.qualitative_feedback, 4000),
    };
  }
  return {
    interviewed: bool(r.interviewed),
    advanced: bool(r.advanced),
    probes_used: bool(r.probes_used),
    evidence_confirmed: evidence,
    notes: text(r.notes, 4000),
    offer_made: bool(r.offer_made),
    offer_accepted: bool(r.offer_accepted),
    hired: bool(r.hired),
    reason: text(r.reason, 2000),
    post_hire: postHire,
  };
}

export async function POST(request: Request, context: { params: Promise<{ runId: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!orgCan(org.role, "record_decisions")) {
    return NextResponse.json({ error: capabilityDeniedMessage("record_decisions") }, { status: 403 });
  }
  const { runId } = await context.params;
  const access = await authorizeProofRunAccess(runId);
  if ("response" in access) return access.response;
  const admin = proofAdmin();
  const { data: run } = await admin.from("proof_runs").select("organization_id").eq("id", runId).maybeSingle();
  if (!run || run.organization_id !== org.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = parseOutcomeBody(await request.json().catch(() => null));
  if (!body) return NextResponse.json({ error: "Send the outcome as a JSON object." }, { status: 400 });

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
        ...body.post_hire,
        outcome_id: outcome.id,
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
