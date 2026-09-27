"""Alternative legitimate solution: a separate policy object with a decision
enum. Structured differently from the reference on purpose."""

from __future__ import annotations

import enum
from dataclasses import dataclass
from typing import Mapping, Optional


class Outcome(enum.Enum):
    DONE = "done"
    RETRY = "retry"
    GIVE_UP = "give_up"
    EXHAUSTED = "exhausted"


@dataclass(frozen=True)
class RetryPolicy:
    max_attempts: int = 8
    base: int = 60
    cap: int = 3600

    def classify(self, status: Optional[int]) -> Outcome:
        if status is None:
            return Outcome.RETRY
        if 200 <= status <= 299:
            return Outcome.DONE
        if status >= 500 or status in (408, 429):
            return Outcome.RETRY
        return Outcome.GIVE_UP

    def delay(self, attempt: int, headers: Mapping[str, str], status: Optional[int]) -> int:
        computed = self.base << (attempt - 1)
        if status in (429, 503):
            lowered = {k.lower(): v for k, v in headers.items()}
            raw = lowered.get("retry-after", "")
            if raw.isdigit():
                computed = max(computed, int(raw))
        return min(computed, self.cap)
