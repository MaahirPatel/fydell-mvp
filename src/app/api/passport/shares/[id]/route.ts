import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { shareRevocationExplanation } from "@/lib/passport/removal";
import { listShares, revokeShare } from "@/lib/passport/store";
import { csrfGuard } from "@/lib/security/csrf";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Unknown link." }, { status: 400 });
  const revoked = await revokeShare(user.id, id);
  if (!revoked) return NextResponse.json({ error: "This link was already revoked or does not exist." }, { status: 404 });
  // PASS-07: revocation stops future access; it cannot retract downloaded copies.
  return NextResponse.json({ shares: await listShares(user.id), explanation: shareRevocationExplanation() });
}
