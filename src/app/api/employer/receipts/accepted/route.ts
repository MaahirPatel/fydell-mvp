import { NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { listAcceptedReceipts } from "@/lib/pilot/receipt-share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/employer/receipts/accepted
 * List simulation-result shares this org has accepted as evidence.
 */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "You are not a member of an active hiring workspace." }, { status: 403 });
  return NextResponse.json({ acceptances: await listAcceptedReceipts(org.organizationId) });
}
