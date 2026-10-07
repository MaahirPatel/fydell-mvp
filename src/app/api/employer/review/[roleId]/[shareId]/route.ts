import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { authorizeReviewScope, listMappings, listQuestions } from "@/lib/employer/review";
import { capabilityDeniedMessage, orgCan } from "@/lib/orgs/capabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/employer/review/[roleId]/[shareId]
 * Requirement-evidence mappings and follow-up questions for one role and
 * one shared work record in the caller's organization.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roleId: string; shareId: string }> }
) {
  const { roleId, shareId } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 403 });
  if (!orgCan(org.role, "view_hiring_work")) {
    return NextResponse.json({ error: capabilityDeniedMessage("view_hiring_work") }, { status: 403 });
  }
  const scope = await authorizeReviewScope(org.organizationId, roleId, shareId);
  if (!scope) return NextResponse.json({ error: "Review not found." }, { status: 404 });

  try {
    const [mappings, questions] = await Promise.all([
      listMappings(org.organizationId, roleId, shareId),
      listQuestions(org.organizationId, roleId, shareId),
    ]);
    return NextResponse.json({ ok: true, requirements: scope.requirements, mappings, questions });
  } catch {
    return NextResponse.json({ error: "Could not load this review. Try again." }, { status: 500 });
  }
}
