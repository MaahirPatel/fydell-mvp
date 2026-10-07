import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { authorizeReviewScope, evidenceBelongsToScope, upsertMapping, type MappingStatus } from "@/lib/employer/review";
import { capabilityDeniedMessage, orgCan } from "@/lib/orgs/capabilities";
import { csrfGuard } from "@/lib/security/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: MappingStatus[] = ["suggested", "accepted", "corrected", "questioned", "unresolved"];

/**
 * POST /api/employer/review/[roleId]/[shareId]/mappings
 * Create or update the reviewer's assessment of one requirement.
 * Body: { requirementIndex, evidenceProjectId?, evidenceId?, status, reviewerNote? }
 * The requirement text is taken from the stored role.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roleId: string; shareId: string }> }
) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const { roleId, shareId } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 403 });
  if (!orgCan(org.role, "record_decisions")) {
    return NextResponse.json({ error: capabilityDeniedMessage("record_decisions") }, { status: 403 });
  }
  const scope = await authorizeReviewScope(org.organizationId, roleId, shareId);
  if (!scope) return NextResponse.json({ error: "Review not found." }, { status: 404 });

  let body: {
    requirementIndex?: unknown;
    evidenceProjectId?: unknown;
    evidenceId?: unknown;
    status?: unknown;
    reviewerNote?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const index = body.requirementIndex;
  if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= scope.requirements.length) {
    return NextResponse.json({ error: "That requirement is not part of this role." }, { status: 400 });
  }
  const status = String(body.status ?? "suggested") as MappingStatus;
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${STATUSES.join(", ")}` }, { status: 400 });
  }
  const evidenceProjectId = typeof body.evidenceProjectId === "string" ? body.evidenceProjectId : null;
  const evidenceId = typeof body.evidenceId === "string" ? body.evidenceId : null;
  if (!(await evidenceBelongsToScope(scope, evidenceProjectId, evidenceId))) {
    return NextResponse.json({ error: "That evidence is not part of the shared Passport." }, { status: 400 });
  }
  const reviewerNote = typeof body.reviewerNote === "string" ? body.reviewerNote.slice(0, 2000) : "";

  try {
    const mapping = await upsertMapping({
      organizationId: org.organizationId,
      roleId,
      shareId,
      requirementText: scope.requirements[index],
      requirementIndex: index,
      evidenceProjectId,
      evidenceId,
      status,
      reviewerNote,
      createdBy: user.id,
    });
    return NextResponse.json({ ok: true, mapping });
  } catch {
    return NextResponse.json({ error: "Could not save this assessment. Your note is kept; try again." }, { status: 500 });
  }
}
