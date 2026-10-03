/**
 * POST /api/employer/roles — define a role (EMP-01).
 *
 * Validates the role definition via src/lib/employer/roles.ts (bounded
 * fields: title, family, stack, responsibilities, evaluation criteria).
 *
 * NEEDS-LIVE: persistence. There is no employer_roles table yet; the
 * validated definition is returned so the caller can review it, and
 * `persisted: false` is explicit. Adding the table + insert is the only
 * live-environment step.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { defineRole } from "@/lib/employer/roles";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/employer/roles — list the organization's roles with requirements.
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, roles: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 403 });

  let body: {
    title?: string;
    family?: string;
    stack?: string[];
    responsibilities?: string[];
    evaluationCriteria?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

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
    return NextResponse.json({ error: `Could not save role: ${insertError.message}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true, role, persisted: true });
}
