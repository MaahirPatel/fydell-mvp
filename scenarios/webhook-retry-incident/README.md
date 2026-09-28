# Kestrel Ledger — outbound webhooks

The service that delivers ledger events (`invoice.paid`, `charge.refunded`,
…) to merchant webhook endpoints, with signing and retries.

This repository is **synthetic** and was written for a Fydell simulation.
Kestrel Ledger, its merchants and its people are fictional.

Start with `INCIDENT.md`.

## Layout

| Path | Purpose |
| --- | --- |
| `INCIDENT.md` | The incident you own (INC-2291) |
| `CHANGELOG.md` | What shipped recently |
| `docs/runbook-webhooks.md` | The delivery promise and retry rules merchants rely on |
| `logs/delivery-worker.log` | Worker log excerpt covering the reports |
| `webhooks/dispatcher.py` | `Dispatcher`: creates deliveries and performs attempts |
| `webhooks/retry.py` | Retry policy: attempt cap, backoff, which failures are retried |
| `webhooks/store.py` | In-memory `DeliveryStore` (production uses Postgres with the same interface) |
| `webhooks/models.py` | `Event`, `Endpoint`, `Delivery`, `Attempt` |
| `webhooks/signing.py` | Request signing |
| `webhooks/transport.py`, `webhooks/clock.py` | Interfaces for HTTP and time (faked in tests) |
| `tests/` | Pytest suite; `tests/fakes.py` has the fake transport and clock |

## Running the tests

In the Fydell workspace, use **Run tests**. Tests run on Fydell's isolated
test runner against the exact files you have saved, so you do not need Python
installed.

The files provided in `tests/` are the team's existing suite and are
restored to their original contents for every run: change behaviour in
`webhooks/`, not in the provided tests. You are welcome to add your own test
files under `tests/` (for example `tests/test_my_cases.py`); they run too and
are shown separately from the provided tests. `conftest.py` and pytest
configuration files are not used by the runner.

## Constraints

- Python 3.11+, standard library only (pytest for tests).
- Keep the fix small enough to review as a hotfix.
