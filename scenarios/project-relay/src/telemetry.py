"""Lightweight in-memory telemetry for Project Relay (synthetic).

No network calls. Collects a simple structured event log the workspace
preview, tests, and service layer can inspect — mirrors the kind of logging
a real deployment would emit for an ops audit trail.
"""

from __future__ import annotations

import time
from typing import Any


class Telemetry:
    def __init__(self) -> None:
        self.events: list[dict[str, Any]] = []

    def record(self, name: str, data: dict[str, Any] | None = None) -> None:
        self.events.append(
            {
                "event": name,
                "data": data or {},
                "ts": time.time(),
            }
        )

    def count(self, name: str) -> int:
        return sum(1 for e in self.events if e["event"] == name)

    def to_list(self) -> list[dict[str, Any]]:
        return list(self.events)
