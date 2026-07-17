"""Prompt templates + a deterministic stand-in "model" for Project Relay.

There is no live LLM call in this scenario — `call_model` is a deterministic,
keyword-based stub so the exercise stays fully offline and reproducible.
Treat it as the wrapper you would replace with a real model client.
"""

from __future__ import annotations

from models import ModelResponse

TRIAGE_SYSTEM_PROMPT = """You are a support ticket triage assistant. Classify the ticket into
one of: security, incident_p0, billing, general. Recommend the safest next action and be
conservative about anything irreversible (refunds, account locks, legal escalation)."""


def render_prompt(ticket_text: str) -> str:
    return f"{TRIAGE_SYSTEM_PROMPT}\n\nTicket:\n{ticket_text}\n\nRespond with category/action/confidence."


# Canned responses keyed by keyword group — stands in for a real model call.
_CANNED: list[tuple[tuple[str, ...], ModelResponse]] = [
    (
        ("breach", "unauthorized", "exfil", "credential", "ransomware"),
        ModelResponse("security", "lock_account", 0.91, "keyword_security"),
    ),
    (
        ("outage", "down", "sev-1", "production offline"),
        ModelResponse("incident_p0", "assign_queue", 0.88, "keyword_p0"),
    ),
    (
        ("refund", "invoice", "charge", "billing"),
        ModelResponse("billing", "refund", 0.82, "keyword_billing"),
    ),
]

_DEFAULT = ModelResponse("general", "reply_template", 0.76, "keyword_general")


def call_model(ticket_text: str) -> ModelResponse:
    """Deterministic stand-in for an LLM call. Never touches the network."""
    t = ticket_text.lower()
    for keywords, response in _CANNED:
        if any(k in t for k in keywords):
            return response
    return _DEFAULT
