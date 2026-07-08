import "server-only";
import Stripe from "stripe";
import { getSupabaseAdmin } from "../supabase";

// ---------------------------------------------------------------------------
// Stripe billing for the MVP. Everything degrades gracefully: when the env
// vars are missing we never throw at import time and the API surfaces a
// "Billing not configured in this environment" message instead of a 500.
//
// The Stripe secret key and webhook secret are server-only and must NEVER be
// exposed to the client. Only NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is public.
// ---------------------------------------------------------------------------

export type PlanId = "team" | "pilot";

export class BillingNotConfiguredError extends Error {
  constructor(message = "Billing not configured in this environment.") {
    super(message);
    this.name = "BillingNotConfiguredError";
  }
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function priceIdForPlan(plan: PlanId): string | undefined {
  return plan === "team"
    ? process.env.STRIPE_TEAM_PRICE_ID
    : process.env.STRIPE_PILOT_PRICE_ID;
}

let cached: Stripe | null = null;

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new BillingNotConfiguredError();
  if (!cached) cached = new Stripe(key);
  return cached;
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export interface CheckoutInput {
  workspaceId: string;
  plan: PlanId;
  customerEmail?: string | null;
}

export interface CheckoutResult {
  url: string;
  sessionId: string;
}

/**
 * Create a Stripe Checkout Session for the Team or Pilot plan. Throws
 * BillingNotConfiguredError when Stripe or the relevant price ID is missing so
 * callers can return a friendly message rather than a hard failure.
 */
export async function createStripeCheckoutSession(
  input: CheckoutInput
): Promise<CheckoutResult> {
  if (!isStripeConfigured()) throw new BillingNotConfiguredError();
  const priceId = priceIdForPlan(input.plan);
  if (!priceId) {
    throw new BillingNotConfiguredError(
      `Billing not configured for the "${input.plan}" plan in this environment.`
    );
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: input.customerEmail ?? undefined,
    success_url: `${appUrl()}/platform?billing=success`,
    cancel_url: `${appUrl()}/platform?billing=cancelled`,
    metadata: { workspace_id: input.workspaceId, plan: input.plan },
    subscription_data: {
      metadata: { workspace_id: input.workspaceId, plan: input.plan }
    }
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return { url: session.url, sessionId: session.id };
}

async function upsertSubscription(params: {
  workspaceId: string;
  customerId?: string | null;
  subscriptionId?: string | null;
  status?: string | null;
  plan?: string | null;
  currentPeriodEnd?: number | null;
}): Promise<void> {
  await getSupabaseAdmin()
    .from("subscriptions")
    .upsert(
      {
        workspace_id: params.workspaceId,
        stripe_customer_id: params.customerId ?? null,
        stripe_subscription_id: params.subscriptionId ?? null,
        status: params.status ?? null,
        plan: params.plan ?? null,
        current_period_end: params.currentPeriodEnd
          ? new Date(params.currentPeriodEnd * 1000).toISOString()
          : null
      },
      { onConflict: "workspace_id" }
    );
}

/**
 * Verify + process a Stripe webhook. Updates the subscriptions table for the
 * workspace referenced in the event metadata. Returns the event type handled.
 */
export async function handleStripeWebhook(
  rawBody: string,
  signature: string | null
): Promise<{ handled: boolean; type?: string }> {
  if (!isStripeConfigured()) throw new BillingNotConfiguredError();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new BillingNotConfiguredError("Stripe webhook secret is not configured.");
  }
  if (!signature) throw new Error("Missing Stripe-Signature header.");

  const stripe = getStripe();
  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const workspaceId = s.metadata?.workspace_id;
      if (workspaceId) {
        await upsertSubscription({
          workspaceId,
          customerId: typeof s.customer === "string" ? s.customer : s.customer?.id,
          subscriptionId:
            typeof s.subscription === "string" ? s.subscription : s.subscription?.id,
          status: "active",
          plan: s.metadata?.plan ?? null
        });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const workspaceId = sub.metadata?.workspace_id;
      if (workspaceId) {
        const periodEnd = (sub as unknown as { current_period_end?: number })
          .current_period_end;
        await upsertSubscription({
          workspaceId,
          customerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
          subscriptionId: sub.id,
          status: sub.status,
          plan: sub.metadata?.plan ?? null,
          currentPeriodEnd: periodEnd ?? null
        });
      }
      break;
    }
    default:
      return { handled: false, type: event.type };
  }

  return { handled: true, type: event.type };
}

export interface BillingStatus {
  configured: boolean;
  plan: string;
  status: string | null;
  message: string;
}

/** Read current billing status for a workspace, with a safe default. */
export async function getBillingStatus(workspaceId: string): Promise<BillingStatus> {
  if (!isStripeConfigured()) {
    return {
      configured: false,
      plan: "Pilot plan",
      status: null,
      message: "Billing not configured in this environment."
    };
  }
  const { data } = await getSupabaseAdmin()
    .from("subscriptions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!data) {
    return {
      configured: true,
      plan: "Pilot plan",
      status: null,
      message: "No active subscription. Currently on the Pilot plan."
    };
  }
  return {
    configured: true,
    plan: data.plan ? `${data.plan} plan` : "Pilot plan",
    status: data.status ?? null,
    message: data.status === "active" ? "Subscription active." : "Subscription inactive."
  };
}
