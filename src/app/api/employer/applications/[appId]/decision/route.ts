/**
 * Team decision and private note for an application without a Passport review.
 *
 * PATCH - Body: { decision, note, expectedVersion }. A stale expectedVersion
 *         returns 409 with the saved state instead of overwriting it.
 */
import { NextResponse } from "next/server";
import { csrfGuard } from "@/lib/security/csrf";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { capabilityDeniedMessage, orgCan } from "@/lib/orgs/capabilities";
import { recordApplicationDecision } from "@/lib/hiring/application-decisions";
import type { ReviewDecision } from "@/lib/passport/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DECISIONS: ReviewDecision[] = ["none", "advance", "hold", "decline"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function PATCH(req: Request, { params }: { params: Promise<{ appId: string }> }) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "Your account isn't part of a hiring workspace." }, { status: 403 });
  if (!orgCan(org.role, "record_decisions")) return NextResponse.json({ error: capabilityDeniedMessage("record_decisions") }, { status: 403 });
  const { appId } = await params;
  const body = (await req.json().catch(() => null)) as { decision?: unknown; note?: unknown; expectedVersion?: unknown } | null;
  const decision = DECISIONS.find((d) => d === body?.decision);
  if (!decision || !UUID.test(appId)) return NextResponse.json({ error: "Choose a decision." }, { status: 400 });
  const expected = typeof body?.expectedVersion === "string" && body.expectedVersion.length <= 64 ? body.expectedVersion : null;
  const saved = await recordApplicationDecision(org.organizationId, appId, user.id, decision, typeof body?.note === "string" ? body.note : "", expected);
  if (saved.kind === "not_found") return NextResponse.json({ error: "Application not found in this workspace." }, { status: 404 });
  if (saved.kind === "conflict") {
    return NextResponse.json(
      { error: "A teammate changed this decision or note since you opened it. Their version is shown; reapply your change if it still applies.", current: saved.state },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, decision, state: saved.state });
}
