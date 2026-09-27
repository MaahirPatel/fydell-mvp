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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  if (!result.ok) {
    return NextResponse.json({ error: result.message, code: result.code }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    role: result.value,
    persisted: false,
    persistence: "NEEDS-LIVE: no employer_roles table yet; validated definition returned for review",
  });
}
