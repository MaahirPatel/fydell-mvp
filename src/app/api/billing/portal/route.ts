import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { getBilling, getMembership } from "@/lib/billing/db";
import { appOrigin, billingConfig, stripeClient } from "@/lib/billing/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const config = billingConfig();
  if (!config) return NextResponse.json({ error: "Billing is not configured on this deployment." }, { status: 503 });

  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage billing." }, { status: 401 });
  const membership = await getMembership(user.id);
  if (!membership?.canManageBilling) {
    return NextResponse.json({ error: "Only a workspace owner or admin can manage billing." }, { status: 403 });
  }
  const billing = await getBilling(membership.organizationId);
  if (!billing) return NextResponse.json({ error: "This workspace has no billing account yet." }, { status: 404 });

  const portal = await stripeClient(config).billingPortal.sessions.create({
    customer: billing.stripeCustomerId,
    return_url: `${appOrigin(req)}/app/employer/settings?section=plan`,
  });
  return NextResponse.json({ url: portal.url });
}
