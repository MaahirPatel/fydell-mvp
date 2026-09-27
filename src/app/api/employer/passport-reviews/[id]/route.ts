import { NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { recordDecision, type ReviewDecision } from "@/lib/passport/store";

const DECISIONS: ReviewDecision[] = ["none", "advance", "hold", "decline"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No workspace" }, { status: 403 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { decision?: unknown; note?: unknown } | null;
  const decision = DECISIONS.find((d) => d === body?.decision);
  if (!decision || !/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Choose a decision." }, { status: 400 });
  const saved = await recordDecision(org.organizationId, id, user.id, decision, typeof body?.note === "string" ? body.note : "");
  if (!saved) return NextResponse.json({ error: "Review not found in this workspace." }, { status: 404 });
  return NextResponse.json({ ok: true, decision });
}
