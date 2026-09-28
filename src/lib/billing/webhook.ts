import "server-only";
import type Stripe from "stripe";
import StripeSDK from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { syncSubscription } from "./db";
import { reportCompletedSimulations } from "./usage";
import { stripeClient, type BillingConfig } from "./stripe";

/**
 * Stripe webhook verification + idempotent fulfillment (BILL-03, BILL-04).
 *
 * - Signature verification uses the Stripe SDK with the server-side webhook
 *   secret. Browser redirects never grant access (BILL-03).
 * - Every event id is recorded in public.stripe_webhook_events BEFORE handling;
 *   duplicates and out-of-order redeliveries are reconciled against the
 *   authoritative provider state instead of being applied twice (BILL-04).
 */

export function verifyStripeSignature(rawBody: string, signature: string, secret: string): Stripe.Event {
  const stripe = new StripeSDK(secret);
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

export interface WebhookDeps {
  hasProcessed(eventId: string): Promise<boolean>;
  markProcessed(eventId: string, eventType: string, result: "applied" | "duplicate" | "ignored" | "failed", error?: string): Promise<void>;
  syncSubscription(subscription: Stripe.Subscription, config: BillingConfig): Promise<void>;
  retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription>;
  reportUsage(config: BillingConfig, customerId: string): Promise<void>;
  /** Payment lifecycle hooks (BILL-07). */
  onPaymentFailed?(customerId: string | null, invoiceId: string): Promise<void>;
  onRefund?(chargeId: string, amountCents: number): Promise<void>;
  config: BillingConfig;
}

export function liveWebhookDeps(config: BillingConfig): WebhookDeps {
  const stripe = stripeClient(config);
  const admin = () => createAdminSupabaseClient();
  return {
    config,
    async hasProcessed(eventId) {
      const { data } = await admin().from("stripe_webhook_events").select("event_id").eq("event_id", eventId).maybeSingle();
      return !!data;
    },
    async markProcessed(eventId, eventType, result, error) {
      await admin().from("stripe_webhook_events").upsert(
        {
          event_id: eventId,
          event_type: eventType,
          processed_at: new Date().toISOString(),
          processing_result: result,
          error: error ?? null,
        },
        { onConflict: "event_id" }
      );
    },
    async syncSubscription(subscription, cfg) {
      await syncSubscription(subscription, cfg);
    },
    async retrieveSubscription(subscriptionId) {
      return stripe.subscriptions.retrieve(subscriptionId);
    },
    async reportUsage(cfg, customerId) {
      await reportCompletedSimulations(cfg, { customerId });
    },
  };
}

const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
]);

function customerIdOf(obj: { customer?: string | { id: string } | null }): string | null {
  if (!obj.customer) return null;
  return typeof obj.customer === "string" ? obj.customer : obj.customer.id;
}

/**
 * Applies one verified Stripe event exactly once. Safe to call with duplicate
 * or out-of-order deliveries: the event log dedupes, and subscription state is
 * always reconciled from the event's own object (authoritative snapshot).
 */
export async function processWebhookEvent(event: Stripe.Event, deps: WebhookDeps): Promise<"applied" | "duplicate" | "ignored"> {
  if (await deps.hasProcessed(event.id)) {
    await deps.markProcessed(event.id, event.type, "duplicate");
    return "duplicate";
  }

  try {
    if (SUBSCRIPTION_EVENTS.has(event.type)) {
      await deps.syncSubscription(event.data.object as Stripe.Subscription, deps.config);
    } else if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        await deps.syncSubscription(await deps.retrieveSubscription(id), deps.config);
      }
    } else if (event.type === "invoice.created") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = customerIdOf(invoice);
      if (customerId && invoice.billing_reason === "subscription_cycle") {
        await deps.reportUsage(deps.config, customerId);
      }
    } else if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      if (deps.onPaymentFailed) await deps.onPaymentFailed(customerIdOf(invoice), invoice.id);
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      if (deps.onRefund) {
        await deps.onRefund(charge.id, charge.amount_refunded ?? charge.amount ?? 0);
      }
    } else {
      await deps.markProcessed(event.id, event.type, "ignored");
      return "ignored";
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await deps.markProcessed(event.id, event.type, "failed", message);
    throw err;
  }

  await deps.markProcessed(event.id, event.type, "applied");
  return "applied";
}
