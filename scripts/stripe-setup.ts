/**
 * Creates (or finds) the Stripe catalog for Fydell's published pricing and prints the
 * environment variables the app needs. Safe to run repeatedly: everything is matched by
 * meter event name or price lookup key.
 *
 *   npm run stripe:setup
 */
import { loadEnvConfig } from "@next/env";
import Stripe from "stripe";
import { METER_EVENT_NAME, PRICE_CENTS, PRICE_LOOKUP_KEYS } from "../src/lib/billing/catalog";

loadEnvConfig(process.cwd());

const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key) {
  console.error("Set STRIPE_SECRET_KEY in .env.local first (a test key from Developers > API keys).");
  process.exit(1);
}
const stripe = new Stripe(key);

async function findOrCreateMeter(): Promise<Stripe.Billing.Meter> {
  for await (const meter of stripe.billing.meters.list({ status: "active", limit: 100 })) {
    if (meter.event_name === METER_EVENT_NAME) return meter;
  }
  return stripe.billing.meters.create({
    display_name: "Completed simulations",
    event_name: METER_EVENT_NAME,
    default_aggregation: { formula: "sum" },
    customer_mapping: { type: "by_id", event_payload_key: "stripe_customer_id" },
    value_settings: { event_payload_key: "value" },
  });
}

async function findPrice(lookupKey: string): Promise<Stripe.Price | null> {
  const { data } = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  return data[0] ?? null;
}

async function findOrCreateProduct(name: string, description: string, planKey: string): Promise<string> {
  const { data } = await stripe.products.search({ query: `metadata['fydell_plan']:'${planKey}' AND active:'true'` });
  if (data[0]) return data[0].id;
  const product = await stripe.products.create({ name, description, metadata: { fydell_plan: planKey } });
  return product.id;
}

async function main() {
  const mode = key!.startsWith("sk_live_") || key!.startsWith("rk_live_") ? "LIVE" : "test";
  console.log(`Setting up Fydell billing in Stripe ${mode} mode\n`);

  const meter = await findOrCreateMeter();

  const starterProduct = await findOrCreateProduct(
    "Fydell Starter",
    "Billed per completed simulation. No monthly fee.",
    "starter",
  );
  const teamProduct = await findOrCreateProduct(
    "Fydell Team",
    `Monthly plan including ${PRICE_CENTS.teamIncluded} completed simulations.`,
    "team",
  );

  const starterUsage =
    (await findPrice(PRICE_LOOKUP_KEYS.starterUsage)) ??
    (await stripe.prices.create({
      product: starterProduct,
      currency: "usd",
      unit_amount: PRICE_CENTS.starterPerSimulation,
      recurring: { interval: "month", usage_type: "metered", meter: meter.id },
      lookup_key: PRICE_LOOKUP_KEYS.starterUsage,
      nickname: "Per completed simulation",
    }));

  const teamBase =
    (await findPrice(PRICE_LOOKUP_KEYS.teamBase)) ??
    (await stripe.prices.create({
      product: teamProduct,
      currency: "usd",
      unit_amount: PRICE_CENTS.teamMonthly,
      recurring: { interval: "month" },
      lookup_key: PRICE_LOOKUP_KEYS.teamBase,
      nickname: "Team monthly",
    }));

  const teamUsage =
    (await findPrice(PRICE_LOOKUP_KEYS.teamUsage)) ??
    (await stripe.prices.create({
      product: teamProduct,
      currency: "usd",
      billing_scheme: "tiered",
      tiers_mode: "graduated",
      tiers: [
        { up_to: PRICE_CENTS.teamIncluded, unit_amount: 0 },
        { up_to: "inf", unit_amount: PRICE_CENTS.teamOverage },
      ],
      recurring: { interval: "month", usage_type: "metered", meter: meter.id },
      lookup_key: PRICE_LOOKUP_KEYS.teamUsage,
      nickname: `Completed simulations (first ${PRICE_CENTS.teamIncluded} included)`,
    }));

  const portals = await stripe.billingPortal.configurations.list({ is_default: true, limit: 1 });
  if (portals.data.length === 0) {
    await stripe.billingPortal.configurations.create({
      business_profile: { headline: "Manage your Fydell plan" },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id"] },
        subscription_cancel: { enabled: true, mode: "at_period_end" },
      },
    });
    console.log("Created a default Customer Portal configuration.");
  }

  console.log("Add these to .env.local (and to your hosting provider):\n");
  console.log(`STRIPE_PRICE_STARTER_USAGE=${starterUsage.id}`);
  console.log(`STRIPE_PRICE_TEAM_BASE=${teamBase.id}`);
  console.log(`STRIPE_PRICE_TEAM_USAGE=${teamUsage.id}`);
  console.log("\nThen create a webhook endpoint for /api/billing/webhook and set STRIPE_WEBHOOK_SECRET.");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
