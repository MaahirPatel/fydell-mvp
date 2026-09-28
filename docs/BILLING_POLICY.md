# Fydell billing policy (BILL-01, BILL-02, BILL-08)

Last reviewed: 2026-09-27. Status: implemented in code; live-provider
verification NEEDS-LIVE (Stripe test-mode end-to-end before first charge).

## One dependable payment path (BILL-01)

Fydell sells through **Stripe hosted checkout** for subscriptions, plus
**manually issued invoices** for first contracts where a buyer prefers it.
Both paths are explicit about:

- **Terms:** plan name, included volume, overage price, billing period.
- **Payer:** the employer organization (Stripe customer metadata carries
  `organization_id`; only owner/admin roles may change billing).
- **Scope:** completed simulations per organization, counted after the
  subscription's `billing_starts_at`; plan inferred from Stripe price IDs
  server-side (`planFromPriceIds`), never from client input.
- **Currency:** USD.
- **Refund/support route:** refund requests go to billing support
  (support route to be confirmed before launch — NEEDS-LIVE); refunds are
  processed in Stripe and mirrored to the ledger as reversing entries.

## Card data never touches Fydell (BILL-02)

- Card collection happens on Stripe-hosted pages only. Fydell stores **no**
  raw card details — no PANs, no CVCs, no expiry dates.
- What Fydell stores: Stripe customer id, subscription id, plan, status,
  period end, ledger entries, and webhook event ids. Billing identifiers are
  protected by the same access controls as other org data (owner/admin only;
  see `src/lib/security/access-guard.ts`).
- Secrets (Stripe secret key, webhook secret) are server-only environment
  variables, never in frontend bundles or git history (scanner:
  `src/lib/security/secret-scan.ts`).

## Fulfillment and lifecycle (BILL-03/04/07)

- Webhook signatures are verified server-side with the Stripe SDK before any
  fulfillment. Browser redirect (`?billing=success`) never grants access.
- Events are deduplicated by Stripe event id (`stripe_webhook_events`);
  duplicates and out-of-order deliveries reconcile against authoritative
  provider state — no double credits or duplicate charges.
- Payment lifecycle covered by tests: success, failure, canceled checkout,
  delayed event, repeat event, refund (`scripts/test-platform-grind-billing.ts`).

## Usage ledger (BILL-06)

- Explicit included volume (`entitlement` entries per plan period) and
  consumption (`usage` entries, one per completed simulation).
- Platform-failure retries reuse the original idempotency key: a retried run
  is never charged twice (stated policy).
- Manual credits are logged with actor and reason (`credit` entries;
  operator tooling in `src/lib/ops/recovery.ts`).

## Receipts and support (BILL-08)

Buyers retrieve invoices/receipts through the Stripe customer portal
(`POST /api/billing/portal`), which is the documented billing-support path
alongside direct support contact. No paid contract is sold with an unclear
access period or deliverable: the plan, period, and included volume are shown
before checkout and mirrored on the settings page.

## What is intentionally NOT offered (BILL-09)

Self-service subscription UI beyond the Stripe portal is deferred (P1). We
never present renewals/cancellation flows that do not work.
