# harbor-webhooks

Outbound webhook dispatcher for Harbor Pay. Every few seconds the scheduler
calls `Dispatcher.process_due()`, which sends each due delivery to the
merchant's endpoint and records the outcome.

Read `INCIDENT.md` first. It describes the task.

## Setup

- Python 3.11, 3.12 or 3.13. Nothing else: the project uses only the standard
  library, so there is no `pip install` step.
- From this folder, run `python preflight.py`. It prints a setup code. Paste
  that code into Fydell to confirm your machine is ready before the timer starts.
  On some systems the command is `python3` or `py`.

## Tests

```
python -m unittest -v
```

Several public tests fail on the starter code. That is the incident, not a
setup problem. Fydell also runs additional checks of its own after you submit.
Those checks use the same public interface described below, so keep it stable.

## Interface other services depend on

- `Dispatcher(store, transport, clock, max_attempts=8)` and `Dispatcher.process_due()`.
- `Delivery` fields in `webhooks/models.py`: `id`, `endpoint_url`, `payload`,
  `status`, `attempts`, `next_attempt_at`, `last_status_code`, `last_error`.
  Status values are `pending`, `delivered`, `failed` and `dead_lettered`.
- `next_attempt_at` is a Unix timestamp in seconds. `None` means nothing is scheduled.
- `transport.send(url, body, headers)` returns a `Response(status, headers)` or
  raises `TransportError` when no HTTP response arrived.
- `clock.now()` returns the current Unix time in seconds.

You may add modules, helpers and tests. Please do not rename these.

## Submitting

Zip the whole project folder (source, tests and config). Leave out virtual
environments, `__pycache__`, `.git` and any real credentials. Fydell checks
the archive and tells you exactly what to fix if something is wrong.
