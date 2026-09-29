from __future__ import annotations

from typing import Dict, List

from .models import PENDING, Delivery


class InMemoryDeliveryStore:
    def __init__(self) -> None:
        self._rows: Dict[str, Delivery] = {}

    def add(self, delivery: Delivery) -> None:
        self._rows[delivery.id] = delivery

    def get(self, delivery_id: str) -> Delivery:
        return self._rows[delivery_id]

    def save(self, delivery: Delivery) -> None:
        self._rows[delivery.id] = delivery

    def due(self, now: float) -> List[Delivery]:
        rows = [
            d
            for d in self._rows.values()
            if d.status == PENDING and d.next_attempt_at is not None and d.next_attempt_at <= now
        ]
        return sorted(rows, key=lambda d: (d.next_attempt_at, d.id))
