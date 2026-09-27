import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { syncSubscription } from "@/lib/billing/db";
import { billingConfig, stripeClient } from "@/lib/billing/stripe";
import { reportCompletedSimulations } from "@/lib/billing/usage";

export const runtime = "nodejs";

const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
]);

export async function POST(req: Request) {
  const config = billingConfig();
  if (!config?.webhookSecret) return NextResponse.json({ error: "Billing webhook is not configured." }, { status: 503 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });

  const stripe = stripeClient(config);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, config.webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  try {
    if (SUBSCRIPTION_EVENTS.has(event.type)) {
      await syncSubscription(event.data.object as Stripe.Subscription, config);
    } else if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        await syncSubscription(await stripe.subscriptions.retrieve(id), config);
      }
    } else if (event.type === "invoice.created") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId && invoice.billing_reason === "subscription_cycle") {
        await reportCompletedSimulations(config, { customerId });
      }
    }
  } catch (err) {
    console.error("[billing] webhook handling failed", { type: event.type, error: err instanceof Error ? err.message : err });
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
