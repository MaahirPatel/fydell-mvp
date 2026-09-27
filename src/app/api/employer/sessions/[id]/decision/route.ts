/**
 * POST /api/employer/sessions/[id]/decision — record a hiring decision (EMP-08).
 *
 * Body: { decision: "advance" | "hold" | "decline", rationale? }.
 *
 * Decision rules (valid decision, identified actor, append-only history)
 * are enforced by src/lib/employer/decisions.ts. The record persists to
 * sim_employer_decisions ("decline" maps to the existing
 * "do_not_advance" check value) and is audit-logged.
 *
 * Hard guarantee, enforced by construction: this route enqueues NO email
 * and sends NO candidate message. Candidate communication is a separate,
 * deliberate employer action with its own approved copy — it does not exist
 * here.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { getSessionForOrgMember } from "@/lib/simulations/db";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  recordDecision,
  createDecisionMemoryStore,
  type HiringDecision,
} from "@/lib/employer/decisions";
import { createAuditMemoryStore } from "@/lib/employer/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DB_DECISION: Record<HiringDecision, string> = {
  advance: "advance",
  hold: "hold",
  decline: "do_not_advance",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 403 });

  let body: { decision?: string; rationale?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Enforce the decision rules in the lib first (valid decision, actor,
  // append-only history). The lib takes no mailer: it cannot notify anyone.
  const ruleCheck = recordDecision(
    createDecisionMemoryStore(),
    createAuditMemoryStore(),
    {
      orgId: org.organizationId,
      sessionId: id,
      decision: (body.decision ?? "") as HiringDecision,
      decidedBy: user.id,
      rationale: body.rationale ?? null,
    }
  );
  if (!ruleCheck.ok) {
    return NextResponse.json({ error: ruleCheck.message, code: ruleCheck.code }, { status: 400 });
  }

  try {
    const session = await getSessionForOrgMember(id, user.id);
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("sim_employer_decisions")
      .insert({
        session_id: id,
        organization_id: session.organization_id,
        decision: DB_DECISION[ruleCheck.value.decision],
        notes: (body.rationale ?? "").slice(0, 4000),
        decided_by: user.id,
      })
      .select("id, decision, created_at")
      .single();
    if (error) throw new Error(error.message);

    await admin.from("pilot_audit_events").insert({
      organization_id: session.organization_id,
      actor_user_id: user.id,
      action: "employer_decision_recorded",
      entity_type: "sim_session",
      entity_id: id,
      payload: { decision: ruleCheck.value.decision },
    });

    // Deliberately: no email, no outbox, no candidate notification.
    return NextResponse.json({
      ok: true,
      decision: ruleCheck.value.decision,
      decidedBy: ruleCheck.value.decidedBy,
      decidedAt: ruleCheck.value.decidedAt,
      rowId: data.id,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not record decision" },
      { status: 400 }
    );
  }
}
