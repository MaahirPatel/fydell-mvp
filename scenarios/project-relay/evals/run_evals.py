"""Lightweight evaluation runner for Project Relay.

Prints human-readable PASS/FAIL lines for quick scanning, then a single
machine-parseable `EVAL_SUMMARY_JSON:{...}` line the Relay workspace UI reads
to render the Evaluation Laboratory panel. Every number in that summary comes
from actually running triage/router code against the case and golden-set
fixtures below — nothing here is a hardcoded placeholder score.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from models import Ticket  # noqa: E402
from router import route  # noqa: E402
from telemetry import Telemetry  # noqa: E402
from triage import classify, triage  # noqa: E402
from metrics import (  # noqa: E402
    abstention_rate,
    accuracy,
    false_automation_rate,
    high_severity_recall,
    macro_f1,
    schema_validity_rate,
)

# Golden-set classification accuracy must stay at or above this to pass.
GOLDEN_SET_ACCURACY_MIN = 0.9


def _read_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def run_case_evals() -> tuple[int, int]:
    cases_path = Path(__file__).with_name("cases.jsonl")
    failures = 0
    total = 0
    for case in _read_jsonl(cases_path):
        total += 1
        result = triage(case["text"])
        if "expect_category" in case and result["category"] != case["expect_category"]:
            print(f"FAIL {case['id']}: category {result['category']} != {case['expect_category']}")
            failures += 1
            continue
        if case.get("expect_human_or_abstain"):
            if result["action"] not in ("abstain",) and not result.get("human_approval_required"):
                print(f"FAIL {case['id']}: expected abstain or human approval, got {result}")
                failures += 1
                continue
        if "forbid_action" in case and result["action"] == case["forbid_action"]:
            print(f"FAIL {case['id']}: forbidden action {result['action']}")
            failures += 1
            continue
        print(f"PASS {case['id']}: {result['action']} ({result['category']})")
    print(f"SUMMARY cases total={total} failures={failures}")
    return total, failures


def run_golden_set_metrics() -> tuple[bool, float, float]:
    rows = _read_jsonl(ROOT / "data" / "golden_set.jsonl")
    y_true = [row["label"] for row in rows]
    y_pred = [classify(row["text"]) for row in rows]

    acc = accuracy(y_true, y_pred)
    f1 = macro_f1(y_true, y_pred)
    ok = acc >= GOLDEN_SET_ACCURACY_MIN
    status = "PASS" if ok else "FAIL"
    print(
        f"{status} golden_set: accuracy={acc:.3f} macro_f1={f1:.3f} "
        f"n={len(y_true)} (min_accuracy={GOLDEN_SET_ACCURACY_MIN})"
    )
    return ok, acc, f1


def run_router_diagnostics() -> dict[str, float]:
    """Routes the golden set through `router.route` (heuristic + model-assisted
    paths) to measure production-judgment risk: whether high-severity tickets
    are still recognized once a ticket escalates to the model-assisted branch,
    and whether any sensitive action ever gets auto-approved without a human
    in the loop."""
    rows = _read_jsonl(ROOT / "data" / "golden_set.jsonl")
    telemetry = Telemetry()
    y_true = [row["label"] for row in rows]
    decisions = [route(Ticket(id=row["id"], text=row["text"]), telemetry).to_dict() for row in rows]
    y_pred = [d["category"] for d in decisions]
    actions = [d["action"] for d in decisions]

    metrics = {
        "high_severity_recall": high_severity_recall(y_true, y_pred),
        "abstention_rate": abstention_rate(actions),
        "false_automation_rate": false_automation_rate(decisions),
        "schema_validity": schema_validity_rate(decisions),
    }

    violations = [
        d
        for d in decisions
        if d["action"] in {"refund", "lock_account", "delete_data", "escalate_legal"}
        and not d.get("human_approval_required")
    ]
    if violations:
        print(
            f"WARN router: {len(violations)}/{len(decisions)} sensitive action(s) would auto-execute "
            "without human approval — check router.py's model-assisted branch against policy.py"
        )
    print(
        "ROUTER_DIAGNOSTICS "
        f"high_severity_recall={metrics['high_severity_recall']:.3f} "
        f"abstention_rate={metrics['abstention_rate']:.3f} "
        f"false_automation_rate={metrics['false_automation_rate']:.3f} "
        f"schema_validity={metrics['schema_validity']:.3f}"
    )
    return metrics


def main() -> int:
    total, failures = run_case_evals()
    golden_ok, acc, f1 = run_golden_set_metrics()
    if not golden_ok:
        failures += 1
    router_metrics = run_router_diagnostics()

    summary = {
        "accuracy": round(acc, 4),
        "macro_f1": round(f1, 4),
        "high_severity_recall": round(router_metrics["high_severity_recall"], 4),
        "abstention_rate": round(router_metrics["abstention_rate"], 4),
        "false_automation_rate": round(router_metrics["false_automation_rate"], 4),
        "schema_validity": round(router_metrics["schema_validity"], 4),
        "cases_total": total,
        "cases_failures": failures,
    }
    # Machine-parseable line the workspace UI regex-matches out of stdout.
    print(f"EVAL_SUMMARY_JSON:{json.dumps(summary)}")
    print(f"SUMMARY total={total} failures={failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
