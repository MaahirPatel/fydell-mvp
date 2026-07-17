"""Ticket router for Project Relay.

Routes each ticket to either the fast heuristic triage path (`triage.py`,
which correctly enforces `policy.py`) or a model-assisted path
(`prompts.call_model`) when the heuristic path is underconfident.

Known issue for candidates to find and fix: the model-assisted branch below
executes the model's suggested action directly and does NOT re-check
`policy.requires_human_approval` before treating it as approved. A
high-confidence model response can therefore authorize a refund or account
lock without human review — violating the canonical fact that refunds,
account locks, and legal escalation always require human approval. Compare
with the heuristic branch, which threads `human_approval_required` through
correctly via `triage.recommend_action`.
"""

from __future__ import annotations

from models import ModelResponse, Ticket, TriageDecision
from prompts import call_model
from telemetry import Telemetry
from triage import triage

# Tickets below this heuristic confidence escalate to the model-assisted path.
CONFIDENCE_ESCALATION_THRESHOLD = 0.6


def route(ticket: Ticket, telemetry: Telemetry | None = None) -> TriageDecision:
    telemetry = telemetry or Telemetry()
    heuristic = triage(ticket.text)

    if heuristic["confidence"] >= CONFIDENCE_ESCALATION_THRESHOLD:
        telemetry.record("route_heuristic", {"ticket_id": ticket.id})
        return TriageDecision(
            ticket_id=ticket.id,
            category=heuristic["category"],
            action=heuristic["action"],
            confidence=heuristic["confidence"],
            human_approval_required=heuristic["human_approval_required"],
            evidence=heuristic["evidence"],
            reason=heuristic["reason"],
            source="heuristic_v1",
        )

    telemetry.record("route_model_assisted", {"ticket_id": ticket.id})
    model_response: ModelResponse = call_model(ticket.text)

    return TriageDecision(
        ticket_id=ticket.id,
        category=model_response.category,
        action=model_response.action,
        confidence=model_response.confidence,
        human_approval_required=False,
        evidence=[f"model_assisted_{model_response.rationale}"],
        reason="model_assisted_v0",
        source="model_assisted_v0",
    )
