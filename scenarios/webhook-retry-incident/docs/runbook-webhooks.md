# Runbook: outbound webhooks

## Delivery promise (published to merchants)

- Each event is delivered **once per subscribed endpoint**. Merchants may
  still see a retry of the same delivery (same `Kestrel-Event-Id`, higher
  `Kestrel-Delivery-Attempt`) if they do not answer in time.
- A publish of an event we have already accepted for an endpoint is a
  duplicate and must never produce a second delivery to that endpoint,
  whatever state the first delivery is in. Merchants replay old events from
  the dashboard, which is a separate tool and out of scope here.
- The same event fans out to every endpoint subscribed to its type; those
  are separate deliveries.

## Retry rules

| Outcome of an attempt | Action |
| --- | --- |
| `2xx` | Delivered. Stop. |
| No response (connection refused, DNS failure, timeout) | Retry with backoff |
| `5xx` | Retry with backoff |
| `408 Request Timeout`, `429 Too Many Requests` | Retry with backoff |
| Any other `4xx` | The request itself is wrong or unwanted. Mark failed, do not retry. |

- At most **8 attempts** per delivery, including the first.
- Backoff after the *n*th failure: `30s × 2^(n-1)`, capped at **1 hour**.
- A delivery that stops retrying is marked `failed` with a reason merchants
  can see in the dashboard (`permanent_error:<status>` or
  `attempts_exhausted`).

## Operating notes

- The delivery worker calls `Dispatcher.process_due()` every 5 seconds.
- The event-bus consumer calls `Dispatcher.enqueue(event, endpoint)` for
  every subscription of every published event.
- Signing: `Kestrel-Signature: t=<unix>,v1=<hmac-sha256>` over
  `"<t>.<body>"`. See `webhooks/signing.py`.
