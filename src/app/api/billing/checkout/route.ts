import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { BILLABLE_STATUSES, getBilling, getMembership, saveCustomer } from "@/lib/billing/db";
import { appOrigin, billingConfig, checkoutLineItems, isBillingPlan, stripeClient } from "@/lib/billing/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const config = billingConfig();
  if (!config) return NextResponse.json({ error: "Billing is not configured on this deployment." }, { status: 503 });

  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to choose a plan." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const plan = typeof body === "object" && body !== null && "plan" in body ? (body as { plan: unknown }).plan : null;
  if (!isBillingPlan(plan)) return NextResponse.json({ error: "Choose Starter or Team." }, { status: 400 });

  const membership = await getMembership(user.id);
  if (!membership) return NextResponse.json({ error: "Create or join an employer workspace first." }, { status: 403 });
  if (!membership.canManageBilling) {
    return NextResponse.json({ error: "Only a workspace owner or admin can change the plan." }, { status: 403 });
  }

  const stripe = stripeClient(config);
  const origin = appOrigin(req);
  const existing = await getBilling(membership.organizationId);
  if (existing?.stripeSubscriptionId && BILLABLE_STATUSES.has(existing.status ?? "")) {
    const portal = await stripe.billingPortal.sessions.create({
      customer: existing.stripeCustomerId,
      return_url: `${origin}/app/employer/settings#plan`,
    });
    return NextResponse.json({ url: portal.url });
  }

  let customerId = existing?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      name: membership.organizationName,
      metadata: { organization_id: membership.organizationId },
    });
    customerId = customer.id;
    await saveCustomer(membership.organizationId, customerId);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: membership.organizationId,
    line_items: checkoutLineItems(plan, config),
    subscription_data: { metadata: { organization_id: membership.organizationId, plan } },
    allow_promotion_codes: true,
    success_url: `${origin}/app/employer/settings?billing=success#plan`,
    cancel_url: `${origin}/app/employer/settings?billing=cancelled#plan`,
  });
  if (!session.url) return NextResponse.json({ error: "Stripe did not return a checkout page." }, { status: 502 });
  return NextResponse.json({ url: session.url });
}
