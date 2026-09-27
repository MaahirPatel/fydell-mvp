import "server-only";
import type Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { planFromPriceIds, type BillingConfig, type BillingPlan } from "./stripe";

const MANAGER_ROLES = new Set(["owner", "admin"]);

export interface OrganizationMembership {
  organizationId: string;
  organizationName: string;
  role: string;
  canManageBilling: boolean;
}

export interface OrganizationBilling {
  organizationId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  plan: BillingPlan | null;
  status: string | null;
  currentPeriodEnd: string | null;
}

/** Subscription states in which completed simulations are billed and invites are allowed. */
export const BILLABLE_STATUSES = new Set(["active", "trialing", "past_due"]);

export async function getMembership(userId: string): Promise<OrganizationMembership | null> {
  const { data } = await createAdminSupabaseClient()
    .from("organization_members")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const org = data.organizations as { name?: string } | null;
  return {
    organizationId: data.organization_id as string,
    organizationName: org?.name || "Your workspace",
    role: data.role as string,
    canManageBilling: MANAGER_ROLES.has(data.role as string),
  };
}

function toBilling(row: Record<string, unknown>): OrganizationBilling {
  const plan = row.plan;
  return {
    organizationId: String(row.organization_id),
    stripeCustomerId: String(row.stripe_customer_id),
    stripeSubscriptionId: typeof row.stripe_subscription_id === "string" ? row.stripe_subscription_id : null,
    plan: plan === "starter" || plan === "team" ? plan : null,
    status: typeof row.status === "string" ? row.status : null,
    currentPeriodEnd: typeof row.current_period_end === "string" ? row.current_period_end : null,
  };
}

export async function getBilling(organizationId: string): Promise<OrganizationBilling | null> {
  const { data } = await createAdminSupabaseClient()
    .from("organization_billing")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  return data ? toBilling(data) : null;
}

export async function saveCustomer(organizationId: string, stripeCustomerId: string): Promise<void> {
  const { error } = await createAdminSupabaseClient()
    .from("organization_billing")
    .upsert({ organization_id: organizationId, stripe_customer_id: stripeCustomerId }, { onConflict: "organization_id" });
  if (error) throw new Error(`Could not save the Stripe customer: ${error.message}`);
}

/** Mirrors a Stripe subscription onto the organization that owns its customer. */
export async function syncSubscription(subscription: Stripe.Subscription, config: BillingConfig): Promise<void> {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const admin = createAdminSupabaseClient();
  const { data: existing } = await admin
    .from("organization_billing")
    .select("organization_id, billing_starts_at")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (!existing) throw new Error(`No organization is linked to Stripe customer ${customerId}.`);

  const items = subscription.items.data;
  const periodEnd = items.reduce((max, item) => Math.max(max, item.current_period_end ?? 0), 0);
  const { error } = await admin
    .from("organization_billing")
    .update({
      stripe_subscription_id: subscription.id,
      plan: planFromPriceIds(items.map((i) => i.price.id), config),
      status: subscription.status,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      billing_starts_at: existing.billing_starts_at ?? new Date(subscription.start_date * 1000).toISOString(),
    })
    .eq("organization_id", existing.organization_id);
  if (error) throw new Error(`Could not save the subscription: ${error.message}`);
}
