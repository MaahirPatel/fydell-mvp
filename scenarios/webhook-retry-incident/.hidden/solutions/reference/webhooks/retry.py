"""Retry policy for outbound webhook deliveries.

See docs/runbook-webhooks.md for the behaviour merchants are promised.
"""

from __future__ import annotations

from collections.abc import Mapping

MAX_ATTEMPTS = 8  # total attempts per delivery, including the first one
BASE_DELAY_SECONDS = 30
MAX_DELAY_SECONDS = 3600

# 4xx statuses that describe a transient condition rather than a bad request.
RETRYABLE_CLIENT_ERRORS = frozenset({408, 429})
# Statuses on which the endpoint may tell us when to come back.
RETRY_AFTER_STATUSES = frozenset({429, 503})


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
    return status_code in RETRYABLE_CLIENT_ERRORS


def next_delay(failed_attempts: int, status_code: int | None, headers: Mapping[str, str]) -> float:
    """Delay before the next attempt, honouring Retry-After (whole seconds) on 429/503."""
    if status_code in RETRY_AFTER_STATUSES:
        value = next((v for k, v in headers.items() if k.lower() == "retry-after"), "").strip()
        if value.isdigit():
            return float(min(int(value), MAX_DELAY_SECONDS))
    return backoff_delay(failed_attempts)
