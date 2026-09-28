from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class DeliveryStatus(str, Enum):
    PENDING = "pending"  # waiting for its next attempt
    DELIVERED = "delivered"  # the endpoint acknowledged with a 2xx
    FAILED = "failed"  # we gave up: permanent error or attempts exhausted


@dataclass(frozen=True)
class Event:
    """A business event produced by the ledger (e.g. ``invoice.paid``).

    ``id`` is unique per business event. The event bus is at-least-once, so the
    same event can be published to the dispatcher more than once.
    """

    id: str
    type: str
    payload: dict[str, Any]


@dataclass(frozen=True)
class Endpoint:
    """A merchant-registered webhook URL and its signing secret."""

    id: str
    url: str
    secret: str


@dataclass
class Attempt:
    number: int
    at: float
    status_code: int | None  # None when no HTTP response was received
    error: str | None = None


@dataclass
class Delivery:
    """One event being delivered to one endpoint, across all of its attempts."""

    id: str
    event: Event
    endpoint: Endpoint
    status: DeliveryStatus = DeliveryStatus.PENDING
    attempts: list[Attempt] = field(default_factory=list)
    next_attempt_at: float = 0.0
    failure_reason: str | None = None
