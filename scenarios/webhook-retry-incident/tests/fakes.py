"""Test doubles for the transport and clock."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field

from webhooks.models import Endpoint, Event
from webhooks.transport import Response, TransportError


class FakeClock:
    def __init__(self, start: float = 1_000_000.0) -> None:
        self._now = start

    def now(self) -> float:
        return self._now

    def advance(self, seconds: float) -> None:
        self._now += seconds

    def set(self, value: float) -> None:
        self._now = value


@dataclass
class SentRequest:
    url: str
    body: bytes
    headers: dict[str, str]


@dataclass
class FakeTransport:
    """Answers each POST with the next scripted outcome.

    An outcome is an ``int`` status code, a ``Response``, or an exception
    instance to raise. When the script runs out, ``default`` is used.
    """

    default: int | Response | Exception = 200
    script: deque = field(default_factory=deque)
    sent: list[SentRequest] = field(default_factory=list)

    def respond_with(self, *outcomes: int | Response | Exception) -> "FakeTransport":
        self.script.extend(outcomes)
        return self

    def post(self, url: str, body: bytes, headers: dict[str, str]) -> Response:
        self.sent.append(SentRequest(url, body, dict(headers)))
        outcome = self.script.popleft() if self.script else self.default
        if isinstance(outcome, Exception):
            raise outcome
        if isinstance(outcome, Response):
            return outcome
        return Response(status_code=outcome)

    def sent_to(self, url: str) -> list[SentRequest]:
        return [r for r in self.sent if r.url == url]


def connection_refused() -> TransportError:
    return TransportError("connection refused")


def make_event(event_id: str = "evt_1", type_: str = "invoice.paid") -> Event:
    return Event(id=event_id, type=type_, payload={"invoice": "inv_1", "amount": 4200})


def make_endpoint(endpoint_id: str = "ep_1") -> Endpoint:
    return Endpoint(id=endpoint_id, url=f"https://merchant.example/{endpoint_id}", secret=f"whsec_{endpoint_id}")
