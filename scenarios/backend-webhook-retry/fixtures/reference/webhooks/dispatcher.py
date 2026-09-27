"""Reference solution (assessment maintainers only)."""

from __future__ import annotations

from typing import Optional

from .models import DEAD_LETTERED, DELIVERED, FAILED, PENDING, Delivery
from .transport import TransportError

MAX_ATTEMPTS = 8
BACKOFF_BASE_SECONDS = 60
BACKOFF_CAP_SECONDS = 3600
RETRYABLE_STATUS = {408, 429, 500, 502, 503, 504}
RETRY_AFTER_STATUS = {429, 503}


def backoff_seconds(attempts: int) -> float:
    return float(min(BACKOFF_CAP_SECONDS, BACKOFF_BASE_SECONDS * (2 ** (attempts - 1))))


def parse_retry_after(headers) -> Optional[float]:
    for key, value in (headers or {}).items():
        if key.lower() == "retry-after":
            try:
                seconds = int(str(value).strip())
            except ValueError:
                return None
            return float(seconds) if seconds >= 0 else None
    return None


def is_retryable(status: int) -> bool:
    return status in RETRYABLE_STATUS or 500 <= status < 600


class Dispatcher:
    def __init__(self, store, transport, clock, max_attempts: int = MAX_ATTEMPTS):
        self.store = store
        self.transport = transport
        self.clock = clock
        self.max_attempts = max_attempts

    def process_due(self) -> int:
        now = self.clock.now()
        sent = 0
        for delivery in self.store.due(now):
            self._attempt(delivery, now)
            sent += 1
        return sent

    def _attempt(self, delivery: Delivery, now: float) -> None:
        headers = {"Content-Type": "application/json", "Idempotency-Key": delivery.id}
        delivery.attempts += 1
        try:
            response = self.transport.send(delivery.endpoint_url, delivery.body(), headers)
        except TransportError as exc:
            delivery.last_error = str(exc) or type(exc).__name__
            self._retry_or_dead_letter(delivery, now, None)
            return

        delivery.last_status_code = response.status
        if 200 <= response.status < 300:
            delivery.status = DELIVERED
            delivery.next_attempt_at = None
            delivery.last_error = None
        elif is_retryable(response.status):
            delivery.last_error = f"HTTP {response.status}"
            hint = parse_retry_after(response.headers) if response.status in RETRY_AFTER_STATUS else None
            self._retry_or_dead_letter(delivery, now, hint)
        else:
            delivery.status = FAILED
            delivery.next_attempt_at = None
            delivery.last_error = f"HTTP {response.status} is not retryable"
        self.store.save(delivery)

    def _retry_or_dead_letter(self, delivery: Delivery, now: float, retry_after: Optional[float]) -> None:
        if delivery.attempts >= self.max_attempts:
            delivery.status = DEAD_LETTERED
            delivery.next_attempt_at = None
        else:
            delay = backoff_seconds(delivery.attempts)
            if retry_after is not None:
                delay = min(BACKOFF_CAP_SECONDS, max(delay, retry_after))
            delivery.status = PENDING
            delivery.next_attempt_at = now + delay
        self.store.save(delivery)
