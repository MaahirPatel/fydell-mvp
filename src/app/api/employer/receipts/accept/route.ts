import { NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { acceptReceiptShare } from "@/lib/pilot/receipt-share";
import { csrfGuard } from "@/lib/security/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/employer/receipts/accept
 * Accept a candidate's shared simulation results as evidence in this
 * org's hiring process.
 * Body: { shareToken, notes? }
 *
 * The share must be valid (not expired/revoked). Acceptance is idempotent
 * per org per share. The candidate's data is not copied — the share link
 * remains the source of truth.
 */
export async function POST(req: Request) {
  const blocked = await csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "You are not a member of an active hiring workspace." }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { shareToken?: unknown; notes?: unknown } | null;
  const shareToken = typeof body?.shareToken === "string" ? body.shareToken.trim() : "";
  if (!shareToken) return NextResponse.json({ error: "Provide the share token." }, { status: 400 });

  const result = await acceptReceiptShare({
    organizationId: org.organizationId,
    acceptedBy: user.id,
    shareToken,
    notes: typeof body?.notes === "string" ? body.notes : "",
  });

  if (result.ok === false) return NextResponse.json({ error: result.reason }, { status: 400 });
  return NextResponse.json({ acceptance: result.acceptance, alreadyAccepted: result.alreadyAccepted });
}
