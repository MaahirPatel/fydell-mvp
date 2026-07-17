"""Service layer for Project Relay ticket processing.

Wires together the router and telemetry with the existing triage/policy
modules. This is the integration point the workspace `preview` command
(see NodeTestExecutionProvider.preview) and a real API layer would call.
"""

from __future__ import annotations

from typing import Any

from models import Ticket
from router import route
from telemetry import Telemetry


def process_ticket(ticket: Ticket, telemetry: Telemetry | None = None) -> dict[str, Any]:
    telemetry = telemetry or Telemetry()
    telemetry.record("ticket_received", {"ticket_id": ticket.id})
    decision = route(ticket, telemetry)
    telemetry.record("ticket_triaged", {"ticket_id": ticket.id, "action": decision.action})
    return decision.to_dict()


def process_batch(tickets: list[Ticket]) -> list[dict[str, Any]]:
    telemetry = Telemetry()
    return [process_ticket(t, telemetry) for t in tickets]


if __name__ == "__main__":
    import json

    samples = [
        Ticket(id="s1", text="Production API is down"),
        Ticket(id="s2", text="Please refund this charge"),
        Ticket(id="s3", text="How do I reset my password?"),
    ]
    for row in process_batch(samples):
        print(json.dumps(row))
