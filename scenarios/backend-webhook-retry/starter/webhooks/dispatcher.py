"""Sends due webhook deliveries to customer endpoints.

Called by the scheduler every few seconds: `Dispatcher(...).process_due()`.
"""

from __future__ import annotations

import uuid

from .models import DELIVERED, Delivery
from .transport import TransportError

MAX_ATTEMPTS = 8


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
        headers = {
            "Content-Type": "application/json",
            "Idempotency-Key": str(uuid.uuid4()),
        }
        delivery.attempts += 1
        try:
            response = self.transport.send(delivery.endpoint_url, delivery.body(), headers)
        except TransportError as exc:
            delivery.last_error = str(exc)
            delivery.next_attempt_at = now
            self.store.save(delivery)
            return

        delivery.last_status_code = response.status
        if 200 <= response.status < 300:
            delivery.status = DELIVERED
        else:
            # Anything that did not succeed goes straight back on the queue.
            delivery.next_attempt_at = now
        self.store.save(delivery)
