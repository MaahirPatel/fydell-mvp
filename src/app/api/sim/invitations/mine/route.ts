import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import {
  getVersionContent,
  hashToken,
  mintToken,
} from "@/lib/simulations/db";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ROLE_BY_KEY } from "@/lib/simulations/roles";
import type { RoleKey } from "@/lib/simulations/types";

export const runtime = "nodejs";

/**
 * GET: list this candidate's pending invitations (for the desktop inbox and
 * any other candidate client). Candidate-scoped: matches
 * `sim_invitations.candidate_email` to the signed-in user's email.
 *
 * Token re-issue: invite tokens are stored as hashes, so the raw token cannot
 * be recovered. Listing mints a FRESH token per pending invitation (same
 * mechanism as resend) and returns it, so the caller can drive the existing
 * accept flow (`POST /api/sim/invitations/{token}`). Tradeoff, stated
 * plainly: each listing supersedes previously issued links for that
 * invitation (emailed links stop working), exactly like an employer resend.
 * Callers should fetch on explicit user action (opening the inbox), not on
 * a timer.
 */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.email)
    return NextResponse.json({ error: "No email on this account" }, { status: 400 });

  const admin = createAdminSupabaseClient();
  const { data: rows, error } = await admin
    .from("sim_invitations")
    .select(
      "id, candidate_email, candidate_name, status, expires_at, created_at, organization_id, template_version_id"
    )
    .eq("candidate_email", user.email.toLowerCase())
    .in("status", ["sent", "opened"])
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const invitations: Array<{
    id: string;
    organizationName: string;
    simulationTitle: string;
    roleTitle: string;
    candidateName: string | null;
    status: string;
    expiresAt: string;
    token: string;
    tokenReissued: true;
  }> = [];

  for (const row of rows || []) {
    // Re-issue: mint a fresh token so the client can accept via the
    // token-based accept route. Old links are superseded (see docstring).
    const token = mintToken();
    const { error: updateError } = await admin
      .from("sim_invitations")
      .update({ token_hash: hashToken(token) })
      .eq("id", row.id)
      .in("status", ["sent", "opened"]);
    if (updateError) continue;

    let organizationName = "An employer";
    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", row.organization_id)
      .maybeSingle();
    if (org?.name) organizationName = org.name;

    let simulationTitle = "Work simulation";
    let roleTitle = "";
    try {
      const content = await getVersionContent(row.template_version_id);
      simulationTitle = content.title || simulationTitle;
      const role = ROLE_BY_KEY[content.roleKey as RoleKey];
      roleTitle = role?.title || content.roleKey || "";
    } catch {
      // Template version missing: still list the invitation with fallbacks.
    }

    invitations.push({
      id: row.id,
      organizationName,
      simulationTitle,
      roleTitle,
      candidateName: row.candidate_name,
      status: row.status,
      expiresAt: row.expires_at,
      token,
      tokenReissued: true,
    });
  }

  return NextResponse.json({ ok: true, invitations });
}
