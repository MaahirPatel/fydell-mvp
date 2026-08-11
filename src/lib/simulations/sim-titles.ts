/**
 * Titles and taglines for the curated simulation catalog. Falls back to a
 * static map when a slug is not yet registered in the content index, so
 * marketing pages never render a bare slug.
 */
import { SIMULATION_BY_SLUG } from "./content";

const SLUG_TITLES: Record<string, string> = {
  "ops-yield-investigation": "Operations performance investigation",
  "missing-delays": "The Missing Delays",
  "duplicate-revenue": "Duplicate Revenue",
  "broken-funnel": "The Broken Funnel",
  "refund-spike": "The Refund Spike",
  "cohort-drift": "Cohort Drift",
  "one-renewal-rate": "One Renewal Rate",
  "filtered-forecast": "The Filtered Forecast",
  "north-star": "Choose the North Star",
  "currency-confusion": "Currency Confusion",
  "fiscal-cutoff": "Fiscal Cutoff",
  "promise-or-product-fit": "Promise or Product Fit",
  "sso-not-provisioning": "SSO Is Not Provisioning",
  "rate-limit": "The Rate Limit",
  "security-review": "The Security Review",
  "data-residency": "Data Residency",
  "launch-day-import": "Launch Day Import",
  "duplicate-accounts": "Duplicate Accounts",
  "approval-rules": "Approval Rules",
  "migration-cutover": "Migration Cutover",
  "scope-tradeoff": "The Scope Trade-off",
  "green-status-page": "The Green Status Page",
  "api-timeout": "The API Timeout",
  "permission-failure": "The Permission Failure",
  "duplicate-webhooks": "Duplicate Webhooks",
  "one-customer-or-everyone": "One Customer or Everyone",
  "executive-queue": "The Executive Queue",
  "invoice-routing": "Invoice Routing",
  "access-provisioning": "Access Provisioning",
  "crm-handoff": "The CRM Handoff",
  "change-request": "The Change Request",
};

export function simTitleForSlug(slug: string): string {
  const sim = SIMULATION_BY_SLUG[slug] as { title?: string } | undefined;
  return sim?.title || SLUG_TITLES[slug] || slug;
}

export function simTaglineForSlug(slug: string): string {
  const sim = SIMULATION_BY_SLUG[slug] as { tagline?: string } | undefined;
  return sim?.tagline || "";
}
