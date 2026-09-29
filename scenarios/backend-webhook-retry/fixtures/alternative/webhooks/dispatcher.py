from __future__ import annotations

from .models import DEAD_LETTERED, DELIVERED, FAILED
from .retry_policy import Outcome, RetryPolicy
from .transport import TransportError

MAX_ATTEMPTS = 8


class Dispatcher:
    def __init__(self, store, transport, clock, max_attempts: int = MAX_ATTEMPTS):
        self.store = store
        self.transport = transport
        self.clock = clock
        self.policy = RetryPolicy(max_attempts=max_attempts)

    def process_due(self) -> int:
        now = self.clock.now()
        batch = self.store.due(now)
        for delivery in batch:
            self._send_one(delivery, now)
        return len(batch)

    def _send_one(self, delivery, now):
        delivery.attempts += 1
        status, headers, error = None, {}, None
        try:
            response = self.transport.send(
                delivery.endpoint_url,
                delivery.body(),
                {"Content-Type": "application/json", "Idempotency-Key": delivery.id},
            )
            status, headers = response.status, dict(response.headers or {})
            delivery.last_status_code = status
        except TransportError as exc:
            error = f"transport: {exc}"

        decision = self.policy.classify(status)
        if decision is Outcome.RETRY and delivery.attempts >= self.policy.max_attempts:
            decision = Outcome.EXHAUSTED

        if decision is Outcome.DONE:
            delivery.status, delivery.next_attempt_at, delivery.last_error = DELIVERED, None, None
        elif decision is Outcome.GIVE_UP:
            delivery.status, delivery.next_attempt_at = FAILED, None
            delivery.last_error = f"permanent failure {status}"
        elif decision is Outcome.EXHAUSTED:
            delivery.status, delivery.next_attempt_at = DEAD_LETTERED, None
            delivery.last_error = error or f"exhausted after {status}"
        else:
            delivery.last_error = error or f"temporary failure {status}"
            delivery.next_attempt_at = now + self.policy.delay(delivery.attempts, headers, status)
        self.store.save(delivery)
