import { NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { recordDecision, type ReviewDecision } from "@/lib/passport/store";
import { capabilityDeniedMessage, orgCan } from "@/lib/orgs/capabilities";
import { csrfGuard } from "@/lib/security/csrf";

const DECISIONS: ReviewDecision[] = ["none", "advance", "hold", "decline"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No workspace" }, { status: 403 });
  if (!orgCan(org.role, "record_decisions")) return NextResponse.json({ error: capabilityDeniedMessage("record_decisions") }, { status: 403 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { decision?: unknown; note?: unknown; expectedVersion?: unknown } | null;
  const decision = DECISIONS.find((d) => d === body?.decision);
  if (!decision || !/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Choose a decision." }, { status: 400 });
  const expected = typeof body?.expectedVersion === "string" && body.expectedVersion.length <= 64 ? body.expectedVersion : null;
  const saved = await recordDecision(org.organizationId, id, user.id, decision, typeof body?.note === "string" ? body.note : "", expected);
  if (saved.kind === "not_found") return NextResponse.json({ error: "Review not found in this workspace." }, { status: 404 });
  if (saved.kind === "conflict") {
    return NextResponse.json(
      { error: "A teammate changed this decision or note since you opened it. Their version is shown; reapply your change if it still applies.", current: saved.state },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, decision, state: saved.state });
}
