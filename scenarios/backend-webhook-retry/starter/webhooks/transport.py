"""HTTP transport boundary.

Production wires in a real HTTP client. Tests use ScriptedTransport so no
network is needed.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Protocol, Tuple, Union


class TransportError(Exception):
    """The request never produced an HTTP response (DNS, connect, timeout)."""


@dataclass
class Response:
    status: int
    headers: Dict[str, str] = field(default_factory=dict)


class Transport(Protocol):
    def send(self, url: str, body: bytes, headers: Dict[str, str]) -> Response:
        ...


Scripted = Union[Response, TransportError]


class ScriptedTransport:
    """Returns queued responses in order and records every request."""

    def __init__(self, script: List[Scripted]):
        self._script = list(script)
        self.requests: List[Tuple[str, bytes, Dict[str, str]]] = []

    def send(self, url: str, body: bytes, headers: Dict[str, str]) -> Response:
        self.requests.append((url, body, dict(headers)))
        if not self._script:
            raise AssertionError("ScriptedTransport ran out of responses")
        item = self._script.pop(0)
        if isinstance(item, TransportError):
            raise item
        return item
