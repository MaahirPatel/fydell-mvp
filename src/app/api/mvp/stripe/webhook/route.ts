import { NextResponse } from "next/server";
import { handleStripeWebhook, BillingNotConfiguredError } from "@/lib/mvp/stripe";

// Stripe requires the raw request body to verify the signature.
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  try {
    const result = await handleStripeWebhook(rawBody, signature);
    return NextResponse.json({ received: true, ...result });
  } catch (err) {
    if (err instanceof BillingNotConfiguredError) {
      // Acknowledge so Stripe does not retry against an unconfigured env.
      return NextResponse.json({ received: true, configured: false });
    }
    const msg = err instanceof Error ? err.message : "Webhook error.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
