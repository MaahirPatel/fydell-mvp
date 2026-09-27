"""Data model for outbound webhook deliveries.

Other services read these fields directly. Keep the names and types stable.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

PENDING = "pending"
DELIVERED = "delivered"
FAILED = "failed"
DEAD_LETTERED = "dead_lettered"

STATUSES = (PENDING, DELIVERED, FAILED, DEAD_LETTERED)


@dataclass
class Delivery:
    id: str
    endpoint_url: str
    payload: Dict[str, Any]
    status: str = PENDING
    attempts: int = 0
    next_attempt_at: Optional[float] = 0.0
    last_status_code: Optional[int] = None
    last_error: Optional[str] = None
    history: list = field(default_factory=list)

    def body(self) -> bytes:
        return json.dumps(self.payload, sort_keys=True).encode("utf-8")
