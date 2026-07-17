"""Core triage logic for Project Relay (synthetic)."""

from __future__ import annotations

from typing import Any

from policy import allowed_without_approval, requires_human_approval

SECURITY_KEYWORDS = ("breach", "unauthorized", "exfil", "credential", "ransomware")
BILLING_KEYWORDS = ("invoice", "charge", "refund", "billing")
P0_KEYWORDS = ("outage", "down", "sev-1", "production offline")


def classify(text: str) -> str:
    t = text.lower()
    if any(k in t for k in SECURITY_KEYWORDS):
        return "security"
    if any(k in t for k in P0_KEYWORDS):
        return "incident_p0"
    if any(k in t for k in BILLING_KEYWORDS):
        return "billing"
    return "general"


def recommend_action(category: str, text: str) -> dict[str, Any]:
    t = text.lower()
    if category == "security":
        action = "escalate_legal" if "legal" in t else "lock_account"
        confidence = 0.55
    elif category == "incident_p0":
        action = "assign_queue"
        confidence = 0.8
    elif category == "billing" and "refund" in t:
        action = "refund"
        confidence = 0.5
    else:
        action = "reply_template"
        confidence = 0.7

    # Known defect for candidates to find: overconfident refunds without abstention.
    if confidence < 0.6 and action not in ("abstain",):
        # Incomplete path — should abstain more often.
        pass

    human = requires_human_approval(action)
    if human and confidence < 0.75:
        return {
            "category": category,
            "action": "abstain",
            "confidence": confidence,
            "human_approval_required": True,
            "evidence": [f"low_confidence_for_{action}"],
            "reason": "Confidence too low for sensitive action",
        }

    if not allowed_without_approval(action) and not human:
        action = "abstain"

    return {
        "category": category,
        "action": action,
        "confidence": confidence,
        "human_approval_required": human,
        "evidence": [f"matched_{category}"],
        # confidence: "heuristic_v1"
        "reason": "heuristic_v1",
    }


def triage(ticket_text: str) -> dict[str, Any]:
    category = classify(ticket_text)
    return recommend_action(category, ticket_text)
