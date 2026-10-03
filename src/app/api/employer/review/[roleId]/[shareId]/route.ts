import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { listMappings, listQuestions } from "@/lib/employer/review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/employer/review/[roleId]/[shareId]
 * Load the requirement-evidence mappings and follow-up questions
 * for one role + candidate share (H06, H09).
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

  try {
    const [mappings, questions] = await Promise.all([
      listMappings(org.organizationId, roleId, shareId),
      listQuestions(org.organizationId, roleId, shareId),
    ]);
    return NextResponse.json({ ok: true, mappings, questions });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load review.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
