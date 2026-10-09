/**
 * POST /api/employer/roles - define a role with concrete requirements.
 * Validated by src/lib/employer/roles.ts and stored in hiring_roles.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { defineRole } from "@/lib/employer/roles";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { capabilityDeniedMessage, orgCan } from "@/lib/orgs/capabilities";
import { csrfGuard } from "@/lib/security/csrf";
import { parseJsonBody } from "@/lib/security/request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/employer/roles - list the organization's roles with requirements.
 */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 403 });

  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("hiring_roles")
    .select("id, title, responsibilities, evaluation_criteria, status, created_at")
    .eq("organization_id", org.organizationId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load roles." }, { status: 500 });
  return NextResponse.json({ ok: true, roles: data ?? [] });
}

export async function POST(req: NextRequest) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 403 });
  if (!orgCan(org.role, "manage_candidates")) {
    return NextResponse.json({ error: capabilityDeniedMessage("manage_candidates") }, { status: 403 });
  }

  const parsed = await parseJsonBody(req, {
    title: { type: "string", max: 1000 },
    family: { type: "string", max: 200 },
    stack: { type: "stringArray", maxItems: 100, maxLength: 200 },
    responsibilities: { type: "stringArray", maxItems: 100, maxLength: 2000 },
    evaluationCriteria: { type: "stringArray", maxItems: 100, maxLength: 2000 },
  });
  if (parsed.ok === false) return parsed.response;
  const body = parsed.body;

  const result = defineRole(org.organizationId, user.id, {
    title: String(body.title ?? ""),
    family: String(body.family ?? ""),
    stack: body.stack ?? [],
    responsibilities: body.responsibilities ?? [],
    evaluationCriteria: body.evaluationCriteria ?? [],
  });
  if (result.ok === false) {
    return NextResponse.json({ error: result.message, code: result.code }, { status: 400 });
  }

  // Persist to hiring_roles (H01). Requirements version on creation.
  const db = createAdminSupabaseClient();
  const { data: role, error: insertError } = await db
    .from("hiring_roles")
    .insert({
      organization_id: org.organizationId,
      title: result.value.title,
      responsibilities: result.value.responsibilities,
      evaluation_criteria: result.value.evaluationCriteria,
      rubric_version: 1,
      rubric_approved_by: user.id,
      rubric_approved_at: new Date().toISOString(),
      status: "active",
      created_by: user.id,
    })
    .select("id, title, responsibilities, evaluation_criteria, status, created_at")
    .single();
  if (insertError) {
    return NextResponse.json({ error: "Could not save the role. Your entries are kept; try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, role, persisted: true });
}
