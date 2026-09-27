import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { listShares, revokeShare } from "@/lib/passport/store";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Unknown link." }, { status: 400 });
  const revoked = await revokeShare(user.id, id);
  if (!revoked) return NextResponse.json({ error: "This link was already revoked or does not exist." }, { status: 404 });
  return NextResponse.json({ shares: await listShares(user.id) });
}
