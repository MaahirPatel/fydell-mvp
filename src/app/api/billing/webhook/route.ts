import { NextResponse } from "next/server";
import { billingConfig } from "@/lib/billing/stripe";
import { liveWebhookDeps, processWebhookEvent, verifyStripeSignature } from "@/lib/billing/webhook";

export const runtime = "nodejs";

/**
 * Stripe webhook receiver (BILL-03, BILL-04).
 * - Verifies the Stripe signature server-side; browser redirects never grant access.
 * - Applies each verified event exactly once (dedupe in stripe_webhook_events).
 */
export async function POST(req: Request) {
  const config = billingConfig();
  if (!config?.webhookSecret) return NextResponse.json({ error: "Billing webhook is not configured." }, { status: 503 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });

  const rawBody = await req.text();
  let event;
  try {
    event = verifyStripeSignature(rawBody, signature, config.webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  try {
    const result = await processWebhookEvent(event, liveWebhookDeps(config));
    return NextResponse.json({ received: true, result });
  } catch (err) {
    console.error("[billing] webhook handling failed", {
      type: event.type,
      id: event.id,
      error: err instanceof Error ? err.message : err,
    });
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
  }
}
