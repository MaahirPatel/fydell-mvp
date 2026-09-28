from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol


@dataclass(frozen=True)
class Response:
    status_code: int
    headers: dict[str, str] = field(default_factory=dict)


class TransportError(Exception):
    """The request never produced an HTTP response.

    Raised for DNS failures, refused connections, TLS errors and read timeouts.
    """


class Transport(Protocol):
    def post(self, url: str, body: bytes, headers: dict[str, str]) -> Response: ...
