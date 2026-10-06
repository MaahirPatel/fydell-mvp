import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { reviewVerification } from "@/lib/employer/review";
import { csrfGuard } from "@/lib/security/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/employer/review/[roleId]/[shareId]/verify/[requestId]/review
 * Employer accepts or rejects a candidate's verification response.
 * Body: { decision: "accepted" | "rejected", reviewerNote? }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roleId: string; shareId: string; requestId: string }> }
) {
  const blocked = await csrfGuard(req);
  if (blocked) return blocked;
  const { requestId } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { decision?: unknown; reviewerNote?: unknown } | null;
  const decision = body?.decision === "accepted" || body?.decision === "rejected" ? body.decision : null;
  if (!decision) return NextResponse.json({ error: "Decision must be accepted or rejected." }, { status: 400 });

  try {
    const verification = await reviewVerification(
      requestId,
      org.organizationId,
      user.id,
      decision,
      typeof body?.reviewerNote === "string" ? body.reviewerNote : ""
    );
    return NextResponse.json({ ok: true, verification });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not record the review." }, { status: 400 });
  }
}
