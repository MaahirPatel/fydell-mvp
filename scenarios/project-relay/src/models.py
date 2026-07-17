"""Typed data models for Project Relay (synthetic)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class Ticket:
    id: str
    text: str
    channel: str = "email"
    priority: Optional[str] = None


@dataclass
class ModelResponse:
    """Simulated model/LLM output for a ticket. No live network call — see
    prompts.call_model for the deterministic stand-in."""

    category: str
    action: str
    confidence: float
    rationale: str


@dataclass
class TriageDecision:
    ticket_id: str
    category: str
    action: str
    confidence: float
    human_approval_required: bool
    evidence: list[str] = field(default_factory=list)
    reason: str = ""
    source: str = "heuristic_v1"

    def to_dict(self) -> dict[str, Any]:
        return {
            "ticket_id": self.ticket_id,
            "category": self.category,
            "action": self.action,
            "confidence": self.confidence,
            "human_approval_required": self.human_approval_required,
            "evidence": self.evidence,
            "reason": self.reason,
            "source": self.source,
        }
