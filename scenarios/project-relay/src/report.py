"""Northbeam Logistics — summary report builder.

This is the integration point the workspace `preview` command calls, and
what a real dashboard/API layer would sit behind.

Ships wired to `join.naive_join` by default — the intentional defect
documented in `join.py`. A candidate who discovers the ID-format mismatch
and fixes this pipeline to use `reconcile.reconciled_join` instead will see
`rows_dropped` drop to 0 and `late_rate` shift from the naive (understated)
number to the true one. `evals/run_evals.py`'s `integrity_caught` field
checks exactly that: whether this function's *default* wiring reflects the
reconciled numbers.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable

from join import naive_join
from metrics import carrier_breakdown, late_rate

REQUIRED_REPORT_KEYS = {
    "generated_at",
    "total_shipments",
    "late_count",
    "late_rate",
    "rows_dropped",
    "carrier_breakdown",
    "join_strategy",
}

JoinFn = Callable[
    [list[dict[str, Any]], list[dict[str, Any]]],
    tuple[list[dict[str, Any]], list[dict[str, Any]]],
]


def build_report(
    shipments: list[dict[str, Any]],
    carriers: list[dict[str, Any]],
    delay_rows: list[dict[str, Any]],
    join_fn: JoinFn = naive_join,
) -> dict[str, Any]:
    matched, dropped = join_fn(shipments, delay_rows)
    breakdown = carrier_breakdown(shipments, matched, carriers)
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_shipments": len(shipments),
        "late_count": len(matched),
        "late_rate": round(late_rate(len(shipments), len(matched)), 4),
        "rows_dropped": len(dropped),
        "carrier_breakdown": breakdown,
        "join_strategy": getattr(join_fn, "__name__", "unknown"),
    }


def validate_report_schema(report: dict[str, Any]) -> bool:
    """Bounded, structural schema check — no live network/model call."""
    if not REQUIRED_REPORT_KEYS.issubset(report.keys()):
        return False
    if not isinstance(report.get("total_shipments"), int) or report["total_shipments"] <= 0:
        return False
    if not isinstance(report.get("late_count"), int) or report["late_count"] < 0:
        return False
    rate = report.get("late_rate")
    if not isinstance(rate, (int, float)) or not (0.0 <= float(rate) <= 1.0):
        return False
    if not isinstance(report.get("rows_dropped"), int) or report["rows_dropped"] < 0:
        return False
    if not isinstance(report.get("carrier_breakdown"), dict):
        return False
    if not isinstance(report.get("join_strategy"), str) or not report["join_strategy"]:
        return False
    return True


if __name__ == "__main__":
    import json

    from load import load_carriers, load_delay_tracking, load_shipments

    _shipments = load_shipments()
    _carriers = load_carriers()
    _delay_rows = load_delay_tracking()
    _report = build_report(_shipments, _carriers, _delay_rows)
    print(json.dumps(_report, indent=2))
