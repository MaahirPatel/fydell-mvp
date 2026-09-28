import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { getVersionContent } from "@/lib/simulations/db";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ROLE_BY_KEY } from "@/lib/simulations/roles";
import type { RoleKey } from "@/lib/simulations/types";

export const runtime = "nodejs";

/**
 * GET: list this candidate's pending invitations (for the desktop inbox and
 * any other candidate client). Candidate-scoped: matches
 * `sim_invitations.candidate_email` to the signed-in user's email.
 *
 * Listing is read-only: it never mints tokens and never touches
 * `token_hash`, so previously emailed invitation links keep working.
 * Clients accept via `POST /api/sim/invitations/accept` with the
 * invitation `id` (the server verifies the session email owns it).
 * The token-based accept (`POST /api/sim/invitations/{token}`) remains
 * for emailed-link flows.
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
  }> = [];

  for (const row of rows || []) {
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
    });
  }

  return NextResponse.json({ ok: true, invitations });
}
