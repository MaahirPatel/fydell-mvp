from __future__ import annotations

from .models import Delivery, DeliveryStatus


class DeliveryStore:
    """In-memory delivery store.

    Production uses a Postgres table with the same interface; tests and local
    runs use this implementation.
    """

    def __init__(self) -> None:
        self._deliveries: dict[str, Delivery] = {}

    def add(self, delivery: Delivery) -> None:
        if delivery.id in self._deliveries:
            raise ValueError(f"delivery {delivery.id} already exists")
        if self.find(delivery.event.id, delivery.endpoint.id) is not None:
            raise ValueError("a delivery for this event and endpoint already exists")
        self._deliveries[delivery.id] = delivery

    def find(self, event_id: str, endpoint_id: str) -> Delivery | None:
        for d in self._deliveries.values():
            if d.event.id == event_id and d.endpoint.id == endpoint_id:
                return d
        return None

    def get(self, delivery_id: str) -> Delivery | None:
        return self._deliveries.get(delivery_id)

    def all(self) -> list[Delivery]:
        return list(self._deliveries.values())

    def due(self, now: float) -> list[Delivery]:
        return sorted(
            (
                d
                for d in self._deliveries.values()
                if d.status is DeliveryStatus.PENDING and d.next_attempt_at <= now
            ),
            key=lambda d: d.next_attempt_at,
        )
