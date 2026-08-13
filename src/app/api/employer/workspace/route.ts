import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isReservedOrganizationName } from "@/lib/org/reserved";

export const runtime = "nodejs";

const MANAGER_ROLES = new Set(["owner", "admin"]);

/** PATCH: rename the caller's workspace. Owners and admins only. */
export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 403 });

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  if (name.length < 2) {
    return NextResponse.json(
      { error: "Workspace name must be at least 2 characters." },
      { status: 400 }
    );
  }
  if (name.length > 80) {
    return NextResponse.json(
      { error: "Workspace name must be 80 characters or fewer." },
      { status: 400 }
    );
  }
  if (isReservedOrganizationName(name)) {
    return NextResponse.json({ error: "That name is reserved." }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: membership } = await admin
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", org.organizationId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership || !MANAGER_ROLES.has(String(membership.role))) {
    return NextResponse.json(
      { error: "Only an owner or admin can rename the workspace." },
      { status: 403 }
    );
  }

  const { error } = await admin
    .from("organizations")
    .update({ name })
    .eq("id", org.organizationId);

  if (error) {
    return NextResponse.json({ error: "Could not save the name." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, name });
}
