"""Ticket triage policy for Project Relay (synthetic)."""

from __future__ import annotations

SENSITIVE_ACTIONS = {"refund", "lock_account", "delete_data", "escalate_legal"}


def requires_human_approval(action: str) -> bool:
    return action in SENSITIVE_ACTIONS


def allowed_without_approval(action: str) -> bool:
    return action in {"reply_template", "assign_queue", "request_info", "abstain"}
