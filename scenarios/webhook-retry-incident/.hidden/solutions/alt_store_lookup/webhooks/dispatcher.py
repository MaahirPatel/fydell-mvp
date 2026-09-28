from __future__ import annotations

import itertools
import json
from typing import Callable

from . import retry
from .clock import Clock
from .models import Attempt, Delivery, DeliveryStatus, Endpoint, Event
from .signing import sign
from .store import DeliveryStore
from .transport import Response, Transport, TransportError


def _sequential_ids() -> Callable[[], str]:
    counter = itertools.count(1)
    return lambda: f"dlv_{next(counter):04d}"


class Dispatcher:
    """Delivers ledger events to merchant webhook endpoints.

    ``enqueue`` is called by the event-bus consumer for every (event, endpoint)
    subscription. ``process_due`` is called by the delivery worker every few
    seconds and performs one attempt for each delivery that is due.
    """

    def __init__(
        self,
        store: DeliveryStore,
        transport: Transport,
        clock: Clock,
        new_id: Callable[[], str] | None = None,
    ) -> None:
        self._store = store
        self._transport = transport
        self._clock = clock
        self._new_id = new_id or _sequential_ids()

    def enqueue(self, event: Event, endpoint: Endpoint) -> Delivery:
        # The bus is at-least-once: a republished event must not create a
        # second delivery to the same endpoint, whatever state the first is in.
        existing = self._store.find(event.id, endpoint.id)
        if existing is not None:
            return existing
        delivery = Delivery(
            id=self._new_id(),
            event=event,
            endpoint=endpoint,
            next_attempt_at=self._clock.now(),
        )
        self._store.add(delivery)
        return delivery

    def process_due(self) -> list[Delivery]:
        attempted = []
        for delivery in self._store.due(self._clock.now()):
            self.attempt(delivery)
            attempted.append(delivery)
        return attempted

    def attempt(self, delivery: Delivery) -> Delivery:
        if delivery.status is not DeliveryStatus.PENDING:
            raise ValueError(f"delivery {delivery.id} is {delivery.status.value}, not pending")

        now = self._clock.now()
        number = len(delivery.attempts) + 1
        body = json.dumps(
            {"id": delivery.event.id, "type": delivery.event.type, "data": delivery.event.payload},
            sort_keys=True,
        ).encode()
        headers = {
            "Content-Type": "application/json",
            "Kestrel-Event-Id": delivery.event.id,
            "Kestrel-Delivery-Attempt": str(number),
            "Kestrel-Signature": sign(delivery.endpoint.secret, int(now), body),
        }

        response: Response | None = None
        error: str | None = None
        try:
            response = self._transport.post(delivery.endpoint.url, body, headers)
        except TransportError as exc:
            error = str(exc) or exc.__class__.__name__

        status_code = response.status_code if response is not None else None
        delivery.attempts.append(Attempt(number=number, at=now, status_code=status_code, error=error))

        if status_code is not None and 200 <= status_code < 300:
            delivery.status = DeliveryStatus.DELIVERED
        elif not retry.is_retryable(status_code):
            delivery.status = DeliveryStatus.FAILED
            delivery.failure_reason = f"permanent_error:{status_code}"
        elif number >= retry.MAX_ATTEMPTS:
            delivery.status = DeliveryStatus.FAILED
            delivery.failure_reason = "attempts_exhausted"
        else:
            response_headers = response.headers if response is not None else {}
            delivery.next_attempt_at = now + retry.next_delay(number, status_code, response_headers)
        return delivery
