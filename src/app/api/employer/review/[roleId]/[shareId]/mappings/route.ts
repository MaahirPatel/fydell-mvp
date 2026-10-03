import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { upsertMapping, type MappingStatus } from "@/lib/employer/review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: MappingStatus[] = ["suggested", "accepted", "corrected", "questioned", "unresolved"];

/**
 * POST /api/employer/review/[roleId]/[shareId]/mappings
 * Create or update the evidence mapping for one requirement (H06).
 * Body: { requirementText, requirementIndex, evidenceProjectId?, evidenceId?, status, reviewerNote? }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roleId: string; shareId: string }> }
) {
  const { roleId, shareId } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 403 });

  let body: {
    requirementText?: string;
    requirementIndex?: number;
    evidenceProjectId?: string | null;
    evidenceId?: string | null;
    status?: string;
    reviewerNote?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const requirementText = String(body.requirementText ?? "").trim();
  if (!requirementText) return NextResponse.json({ error: "requirementText is required." }, { status: 400 });
  if (typeof body.requirementIndex !== "number" || body.requirementIndex < 0) {
    return NextResponse.json({ error: "requirementIndex must be a non-negative number." }, { status: 400 });
  }
  const status = String(body.status ?? "suggested") as MappingStatus;
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${STATUSES.join(", ")}` }, { status: 400 });
  }

  try {
    const mapping = await upsertMapping({
      organizationId: org.organizationId,
      roleId,
      shareId,
      requirementText,
      requirementIndex: body.requirementIndex,
      evidenceProjectId: body.evidenceProjectId ?? null,
      evidenceId: body.evidenceId ?? null,
      status,
      reviewerNote: body.reviewerNote ?? "",
      createdBy: user.id,
    });
    return NextResponse.json({ ok: true, mapping });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not save mapping.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
