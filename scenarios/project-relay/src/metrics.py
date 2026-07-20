"""Northbeam Logistics — delay-rate metrics and per-carrier breakdown.

All numbers here come from actually joining `data/shipments.csv` against
`data/delays_manual_tracking.csv` — nothing is a hardcoded placeholder.
"""

from __future__ import annotations

from typing import Any

from join import naive_join
from reconcile import reconciled_join


def late_rate(total_shipments: int, late_count: int) -> float:
    return late_count / total_shipments if total_shipments else 0.0


def naive_late_rate_stats(
    shipments: list[dict[str, Any]], delay_rows: list[dict[str, Any]]
) -> dict[str, Any]:
    """Late-rate stats using the INTENTIONALLY naive join (see join.py) —
    understates the true late rate because it silently drops
    format-mismatched rows from the manual tracking sheet."""
    matched, dropped = naive_join(shipments, delay_rows)
    return {
        "late_count": len(matched),
        "rate": late_rate(len(shipments), len(matched)),
        "rows_dropped": len(dropped),
        "dropped_ids": [row["shipment_id"] for row in dropped],
    }


def true_late_rate_stats(
    shipments: list[dict[str, Any]], delay_rows: list[dict[str, Any]]
) -> dict[str, Any]:
    """Late-rate stats using the reconciled join (see reconcile.py) — the
    accurate number once ID-format mismatches are fixed."""
    matched, unmatched = reconciled_join(shipments, delay_rows)
    return {
        "late_count": len(matched),
        "rate": late_rate(len(shipments), len(matched)),
        "rows_dropped": len(unmatched),
        "dropped_ids": [row["shipment_id"] for row in unmatched],
    }


def carrier_breakdown(
    shipments: list[dict[str, Any]],
    matched_late_rows: list[dict[str, Any]],
    carriers: list[dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    """Per-carrier shipment counts, actual on-time rate, and the gap against
    each carrier's self-reported `on_time_rate_claimed` (see
    docs/data-integrity.md — several carriers overstate their reliability)."""
    late_ids = {row["shipment_id"] for row in matched_late_rows}
    by_carrier: dict[str, dict[str, int]] = {}
    for shipment in shipments:
        carrier_id = shipment["carrier_id"]
        bucket = by_carrier.setdefault(carrier_id, {"total": 0, "late": 0})
        bucket["total"] += 1
        if shipment["shipment_id"] in late_ids:
            bucket["late"] += 1

    claimed_by_carrier = {c["carrier_id"]: c for c in carriers}
    breakdown: dict[str, dict[str, Any]] = {}
    for carrier_id, bucket in sorted(by_carrier.items()):
        total = bucket["total"]
        late = bucket["late"]
        actual_on_time_rate = round((total - late) / total, 4) if total else 0.0
        claimed_row = claimed_by_carrier.get(carrier_id, {})
        claimed_rate = float(claimed_row.get("on_time_rate_claimed", 0) or 0)
        breakdown[carrier_id] = {
            "name": claimed_row.get("name", carrier_id),
            "total_shipments": total,
            "late_shipments": late,
            "actual_on_time_rate": actual_on_time_rate,
            "claimed_on_time_rate": round(claimed_rate, 4),
            "claim_gap": round(claimed_rate - actual_on_time_rate, 4),
        }
    return breakdown
