# INC-2291: webhook retry storm

Opened 2026-09-14 by Priya Raman (engineering lead, Payments Platform).

## What happened

Between 09:12 and 10:40 UTC the dispatcher sent about 1.9 million requests.
Normal volume for that window is under 40,000. See
`logs/dispatcher-2026-09-14.log` for an excerpt.

- A merchant deleted their endpoint. It returns `410 Gone`. We retried it on
  every scheduler tick for 88 minutes.
- When a merchant returned `500`, we retried on the very next tick, which
  turned one merchant's outage into sustained load on their servers.
- Two merchants reported double-processed `payment.succeeded` events. Their
  systems deduplicate on the `Idempotency-Key` header, and we sent a different
  key on every attempt of the same delivery.
- Deliveries that never succeed stay pending forever. Nothing gives up.

## What we need

Fix the dispatcher so that:

1. Temporary failures are retried with exponential backoff. The first retry
   waits 60 seconds, and each later retry waits twice as long as the one
   before, but never more than 3600 seconds.
2. Permanent failures are not retried. They end as `failed`, with the status
   code recorded.
3. A delivery that still has not succeeded after 8 attempts in total ends as
   `dead_lettered` and is never sent again.
4. Every attempt of the same delivery sends the same `Idempotency-Key`: the
   delivery `id`.

Which responses count as temporary is a judgment call we have discussed in the
past. Ask in the team thread if you are unsure; otherwise state your
assumption in your handoff.

## Out of scope

Real HTTP, persistence and the scheduler itself. Everything the task needs
runs in memory with the fakes in `webhooks/transport.py` and `webhooks/clock.py`.

## Handoff

When you submit, Fydell asks what you changed, how you tested it, what risks
remain and what you would do next. A short, accurate answer is more useful
than a long one.
