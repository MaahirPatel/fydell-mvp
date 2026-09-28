"""Retry policy for outbound webhook deliveries.

See docs/runbook-webhooks.md for the behaviour merchants are promised.
"""

from __future__ import annotations

MAX_ATTEMPTS = 8  # total attempts per delivery, including the first one
BASE_DELAY_SECONDS = 30
MAX_DELAY_SECONDS = 3600


def backoff_delay(failed_attempts: int) -> float:
    """Seconds to wait before the next attempt, after ``failed_attempts`` failures.

    30s, 60s, 120s, ... capped at one hour.
    """
    if failed_attempts < 1:
        raise ValueError("backoff_delay is only defined after at least one failure")
    return float(min(BASE_DELAY_SECONDS * 2 ** (failed_attempts - 1), MAX_DELAY_SECONDS))


def is_retryable(status_code: int | None) -> bool:
    """Whether a failed attempt should be retried.

    ``status_code`` is None when the request never produced an HTTP response
    (connection refused, DNS failure, read timeout).
    """
    if status_code is None or status_code >= 500:
        return True
    return status_code in (408, 429)
