# INC-2291 — Webhook delivery misbehaving after release 2.14

**Severity:** SEV-3 (merchant-facing, no data loss) · **Opened:** Tuesday 09:12 · **Owner:** you

This is a synthetic incident for a Fydell simulation. Kestrel Ledger and its
merchants are fictional.

## What merchants reported

1. **Harbor & Pine (merchant `m_4410`)** disabled their old webhook endpoint
   last week. It now answers `410 Gone`. Their edge provider throttled our
   delivery IPs after we sent them roughly 2,000 requests in an hour.
2. **Tidewater Outfitters (merchant `m_1187`)** received `invoice.paid` twice
   for the same invoice on Monday and shipped one order twice. Their handler
   does not deduplicate on `Kestrel-Event-Id` yet.

Both reports started after release **2.14** (see `CHANGELOG.md`).

## What we know

- `logs/delivery-worker.log` has an excerpt from the delivery worker covering
  both reports.
- The event bus is at-least-once: when the publisher times out waiting for an
  acknowledgement it publishes the same event again. That has always been
  true; the dispatcher is expected to absorb it.
- `docs/runbook-webhooks.md` describes the delivery behaviour we promise
  merchants.

## What we need from you

1. Find the cause of both reports and fix it in `webhooks/`.
2. Keep the change reviewable: this ships as a hotfix, not a refactor.
3. Run the tests (`pytest`). Two tests in `tests/test_dispatcher.py` reproduce
   the reports and fail on the current code.
4. Write the handoff for the on-call reviewer: what changed, how you tested
   it, remaining risks, and next steps.

Maya Chen (platform lead) is available in the team thread if something is
unclear. Requirements sometimes change during an incident; watch the thread.
