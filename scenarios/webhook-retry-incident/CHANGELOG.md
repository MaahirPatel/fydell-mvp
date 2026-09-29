# Changelog — webhooks

## 2.14 (last Thursday)

- Simplified retry classification in `webhooks/retry.py`: replaced the
  per-status table with a single range check. "Same behaviour, less code."
- Moved delivery creation from the event-bus consumer into
  `Dispatcher.enqueue` so the worker and the consumer share one code path.
  The consumer's old "already enqueued?" lookup was dropped as part of the
  move.

## 2.13

- Added `Kestrel-Delivery-Attempt` header.
- Backoff cap lowered from 6 hours to 1 hour.
