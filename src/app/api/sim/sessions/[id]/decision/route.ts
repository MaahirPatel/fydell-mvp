import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { getSessionForOrgMember } from "@/lib/simulations/db";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const DECISIONS = new Set(["advance", "hold", "do_not_advance", "needs_further_evidence"]);

/** POST: record an employer decision for this session. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    decision?: string;
    notes?: string;
    evidenceInfluence?: "changed" | "confirmed" | "no_effect";
    reviewStatus?: "unreviewed" | "in_review" | "follow_up_needed" | "reviewed";
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.decision || !DECISIONS.has(body.decision))
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  if (
    body.evidenceInfluence &&
    !["changed", "confirmed", "no_effect"].includes(body.evidenceInfluence)
  ) {
    return NextResponse.json({ error: "Invalid evidenceInfluence" }, { status: 400 });
  }

  try {
    const session = await getSessionForOrgMember(id, user.id);
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("sim_employer_decisions")
      .insert({
        session_id: id,
        organization_id: session.organization_id,
        decision: body.decision,
        notes: (body.notes || "").slice(0, 4000),
        evidence_influence: body.evidenceInfluence || null,
        decided_by: user.id,
      })
      .select("id, decision, evidence_influence, created_at")
      .single();
    if (error) throw new Error(error.message);

    if (body.reviewStatus) {
      await admin
        .from("sim_sessions")
        .update({ review_status: body.reviewStatus })
        .eq("id", id)
        .eq("organization_id", session.organization_id);
    } else {
      await admin
        .from("sim_sessions")
        .update({ review_status: "reviewed" })
        .eq("id", id)
        .eq("organization_id", session.organization_id);
    }

    await admin.from("pilot_audit_events").insert({
      organization_id: session.organization_id,
      actor_user_id: user.id,
      action: "employer_decision_recorded",
      entity_type: "sim_session",
      entity_id: id,
      payload: {
        decision: body.decision,
        evidenceInfluence: body.evidenceInfluence || null,
      },
    });

    return NextResponse.json({ ok: true, decision: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not record decision" },
      { status: 400 }
    );
  }
}
