import "server-only";
import Stripe from "stripe";

export { METER_EVENT_NAME } from "./catalog";

export type BillingPlan = "starter" | "team";

export interface BillingConfig {
  secretKey: string;
  webhookSecret: string | null;
  prices: {
    starterUsage: string;
    teamBase: string;
    teamUsage: string;
  };
}

/** Reads Stripe settings from the environment. Null means billing is not configured on this deployment. */
export function billingConfig(): BillingConfig | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const starterUsage = process.env.STRIPE_PRICE_STARTER_USAGE?.trim();
  const teamBase = process.env.STRIPE_PRICE_TEAM_BASE?.trim();
  const teamUsage = process.env.STRIPE_PRICE_TEAM_USAGE?.trim();
  if (!secretKey || !starterUsage || !teamBase || !teamUsage) return null;
  return {
    secretKey,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() || null,
    prices: { starterUsage, teamBase, teamUsage },
  };
}

let client: { key: string; stripe: Stripe } | null = null;

export function stripeClient(config: BillingConfig): Stripe {
  if (client?.key !== config.secretKey) {
    client = { key: config.secretKey, stripe: new Stripe(config.secretKey, { appInfo: { name: "Fydell" } }) };
  }
  return client.stripe;
}

export function checkoutLineItems(plan: BillingPlan, config: BillingConfig): Stripe.Checkout.SessionCreateParams.LineItem[] {
  if (plan === "starter") return [{ price: config.prices.starterUsage }];
  return [{ price: config.prices.teamBase, quantity: 1 }, { price: config.prices.teamUsage }];
}

/** Infers the plan from the prices on a subscription, so the webhook never trusts client-supplied metadata for it. */
export function planFromPriceIds(priceIds: string[], config: BillingConfig): BillingPlan | null {
  if (priceIds.includes(config.prices.teamBase) || priceIds.includes(config.prices.teamUsage)) return "team";
  if (priceIds.includes(config.prices.starterUsage)) return "starter";
  return null;
}

export function isBillingPlan(value: unknown): value is BillingPlan {
  return value === "starter" || value === "team";
}

export function appOrigin(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured && /^https?:\/\//.test(configured)) return configured.replace(/\/$/, "");
  return new URL(req.url).origin;
}
