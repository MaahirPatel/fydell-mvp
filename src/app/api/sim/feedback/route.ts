import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/security/request-body";

export const runtime = "nodejs";

const REVEALS = new Set(["yes", "somewhat", "no"]);
const INTEREST = new Set(["yes", "maybe", "no"]);

/** POST: persist pilot feedback for a completed session. */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody(req, {
    sessionId: { type: "string", max: 100 },
    realism: { type: "number" },
    revealsBeyondResume: { type: "string", max: 80 },
    usefulEvidence: { type: "stringArray", maxItems: 50, maxLength: 200 },
    unrealistic: { type: "string", max: 20000 },
    additions: { type: "string", max: 20000 },
    rolesHired: { type: "string", max: 5000 },
    pilotInterest: { type: "string", max: 80 },
    organizationName: { type: "string", max: 2000 },
  });
  if (parsed.ok === false) return parsed.response;
  const body = parsed.body;

  const realism = Number(body.realism);
  if (!Number.isInteger(realism) || realism < 1 || realism > 5)
    return NextResponse.json({ error: "Please rate realism from 1 to 5" }, { status: 400 });
  if (!body.revealsBeyondResume || !REVEALS.has(body.revealsBeyondResume))
    return NextResponse.json({ error: "Please answer question 2" }, { status: 400 });
  if (body.pilotInterest && !INTEREST.has(body.pilotInterest))
    return NextResponse.json({ error: "Invalid pilot interest value" }, { status: 400 });

  const admin = createAdminSupabaseClient();

  // Resolve template context from the session when provided.
  let templateSlug = "unknown";
  let roleKey = "unknown";
  let sessionId: string | null = null;
  if (body.sessionId) {
    const { data: session } = await admin
      .from("sim_sessions")
      .select("id, candidate_user_id, sim_templates(slug, role_key)")
      .eq("id", body.sessionId)
      .maybeSingle();
    if (session && session.candidate_user_id === user.id) {
      sessionId = session.id;
      const t = session.sim_templates as { slug?: string; role_key?: string } | null;
      templateSlug = t?.slug || templateSlug;
      roleKey = t?.role_key || roleKey;
    }
  }

  const { error } = await admin.from("sim_feedback").insert({
    session_id: sessionId,
    template_slug: templateSlug,
    role_key: roleKey,
    user_id: user.id,
    organization_name: (body.organizationName || "").slice(0, 200) || null,
    realism,
    reveals_beyond_resume: body.revealsBeyondResume,
    useful_evidence: (body.usefulEvidence || []).slice(0, 10),
    unrealistic_feedback: (body.unrealistic || "").slice(0, 2000),
    additions_feedback: (body.additions || "").slice(0, 2000),
    roles_hired: (body.rolesHired || "").slice(0, 500),
    pilot_interest: body.pilotInterest || null,
  });
  if (error)
    return NextResponse.json({ error: `Could not save feedback: ${error.message}` }, { status: 500 });

  return NextResponse.json({ ok: true });
}
