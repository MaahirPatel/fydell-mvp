"""Metric helpers for Project Relay evals.

Covers golden-set classification quality (accuracy, macro-F1) plus the
production-judgment signals the workspace Evaluation Laboratory surfaces:
high-severity recall, abstention rate, false-automation rate, and schema
validity. All are computed from real triage/router output — never hardcoded.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any

SEVERE_LABELS = {"security", "incident_p0"}
SENSITIVE_ACTIONS = {"refund", "lock_account", "delete_data", "escalate_legal"}
ALLOWED_CATEGORIES = {"security", "incident_p0", "billing", "general"}
ALLOWED_ACTIONS = {
    "reply_template",
    "assign_queue",
    "request_info",
    "abstain",
    "refund",
    "lock_account",
    "delete_data",
    "escalate_legal",
}
REQUIRED_DECISION_KEYS = {
    "ticket_id",
    "category",
    "action",
    "confidence",
    "human_approval_required",
    "evidence",
    "reason",
    "source",
}


def accuracy(y_true: list[str], y_pred: list[str]) -> float:
    if not y_true:
        return 0.0
    correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
    return correct / len(y_true)


def macro_f1(y_true: list[str], y_pred: list[str]) -> float:
    labels = sorted(set(y_true) | set(y_pred))
    if not labels:
        return 0.0
    f1_scores = []
    for label in labels:
        tp = sum(1 for t, p in zip(y_true, y_pred) if t == label and p == label)
        fp = sum(1 for t, p in zip(y_true, y_pred) if t != label and p == label)
        fn = sum(1 for t, p in zip(y_true, y_pred) if t == label and p != label)
        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0
        f1_scores.append(f1)
    return sum(f1_scores) / len(f1_scores)


def confusion_counts(y_true: list[str], y_pred: list[str]) -> dict[str, dict[str, int]]:
    counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for t, p in zip(y_true, y_pred):
        counts[t][p] += 1
    return {k: dict(v) for k, v in counts.items()}


def high_severity_recall(
    y_true: list[str], y_pred: list[str], severe_labels: set[str] = SEVERE_LABELS
) -> float:
    """Recall across the high-severity categories only (security, incident_p0) —
    missing these is worse than missing a general/billing ticket."""
    tp = sum(1 for t, p in zip(y_true, y_pred) if t in severe_labels and p == t)
    fn = sum(1 for t, p in zip(y_true, y_pred) if t in severe_labels and p != t)
    return tp / (tp + fn) if (tp + fn) else 0.0


def abstention_rate(actions: list[str]) -> float:
    """Share of decisions that abstained rather than auto-act."""
    if not actions:
        return 0.0
    return sum(1 for a in actions if a == "abstain") / len(actions)


def false_automation_rate(
    decisions: list[dict[str, Any]], sensitive_actions: set[str] = SENSITIVE_ACTIONS
) -> float:
    """Share of sensitive-action decisions (refund/lock/delete/escalate) that were
    NOT flagged for human approval — i.e. would have auto-executed. This is the
    metric that surfaces the router's model-assisted approval-policy gap."""
    sensitive = [d for d in decisions if d.get("action") in sensitive_actions]
    if not sensitive:
        return 0.0
    violations = sum(1 for d in sensitive if not d.get("human_approval_required"))
    return violations / len(sensitive)


def is_valid_decision_schema(decision: dict[str, Any]) -> bool:
    if not REQUIRED_DECISION_KEYS.issubset(decision.keys()):
        return False
    if decision.get("category") not in ALLOWED_CATEGORIES:
        return False
    if decision.get("action") not in ALLOWED_ACTIONS:
        return False
    confidence = decision.get("confidence")
    if not isinstance(confidence, (int, float)) or not (0.0 <= float(confidence) <= 1.0):
        return False
    if not isinstance(decision.get("human_approval_required"), bool):
        return False
    if not isinstance(decision.get("evidence"), list):
        return False
    return True


def schema_validity_rate(decisions: list[dict[str, Any]]) -> float:
    if not decisions:
        return 0.0
    valid = sum(1 for d in decisions if is_valid_decision_schema(d))
    return valid / len(decisions)
