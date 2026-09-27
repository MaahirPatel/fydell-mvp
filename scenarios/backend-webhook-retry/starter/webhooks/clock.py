from __future__ import annotations

import time
from typing import Protocol


class Clock(Protocol):
    def now(self) -> float:
        ...


class SystemClock:
    def now(self) -> float:
        return time.time()


class FakeClock:
    def __init__(self, start: float = 1_700_000_000.0):
        self._now = float(start)

    def now(self) -> float:
        return self._now

    def advance(self, seconds: float) -> None:
        self._now += seconds

    def set(self, value: float) -> None:
        self._now = float(value)
