import { NextResponse } from "next/server";
import { csrfGuard } from "@/lib/security/csrf";
import { requireUser } from "@/lib/simulations/auth";
import { withdrawApplication } from "@/lib/hiring/applications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  const ok = await withdrawApplication(user.id, id);
  if (!ok) return NextResponse.json({ error: "That application is already withdrawn or isn't yours." }, { status: 404 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
