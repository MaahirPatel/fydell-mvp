"""Northbeam Logistics — shipment ID reconciliation.

`data/delays_manual_tracking.csv` mixes shipment ID formats: fully-qualified
`SHP-00123`, unpadded `SHP-123`, and bare digits `00123` (or `123`).
`normalize_shipment_id` maps any of those to the canonical `SHP-NNNNN`
(5-digit, zero-padded) format used by `data/shipments.csv`, and
`reconciled_join` uses it to recover exactly the rows `join.naive_join`
silently drops.

This module is the fix `join.py`'s docstring points to — candidates are
expected to discover it and wire it into the reporting pipeline
(`report.py`) themselves; nothing here does that automatically.
"""

from __future__ import annotations

import re
from typing import Any

_DIGITS_RE = re.compile(r"\d+")


def normalize_shipment_id(raw: str) -> str:
    """Normalize any shipment id format to canonical `SHP-NNNNN`.

    >>> normalize_shipment_id("SHP-00123")
    'SHP-00123'
    >>> normalize_shipment_id("SHP-123")
    'SHP-00123'
    >>> normalize_shipment_id("00123")
    'SHP-00123'
    >>> normalize_shipment_id("123")
    'SHP-00123'
    """
    match = _DIGITS_RE.search(raw or "")
    if not match:
        return raw
    return f"SHP-{int(match.group()):05d}"


def reconciled_join(
    shipments: list[dict[str, Any]], delay_rows: list[dict[str, Any]]
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """ID-normalized join on `shipment_id`.

    Returns (matched, still_unmatched). Each matched row's `shipment_id`
    is rewritten to the canonical format so downstream code can key off it
    consistently.
    """
    known_ids = {shipment["shipment_id"] for shipment in shipments}
    matched: list[dict[str, Any]] = []
    unmatched: list[dict[str, Any]] = []
    for row in delay_rows:
        normalized = normalize_shipment_id(row["shipment_id"])
        if normalized in known_ids:
            matched.append({**row, "shipment_id": normalized})
        else:
            unmatched.append(row)
    return matched, unmatched


def reconciliation_report(
    shipments: list[dict[str, Any]], delay_rows: list[dict[str, Any]]
) -> dict[str, Any]:
    """Side-by-side naive vs. reconciled join stats — used by the
    `reconcile` workspace command so a candidate can see, at a glance,
    which rows the naive join was dropping and why."""
    from join import naive_join  # local import avoids a hard cycle at module load time

    naive_matched, naive_dropped = naive_join(shipments, delay_rows)
    reconciled_matched, reconciled_unmatched = reconciled_join(shipments, delay_rows)

    return {
        "naive_matched": len(naive_matched),
        "naive_dropped": len(naive_dropped),
        "reconciled_matched": len(reconciled_matched),
        "reconciled_unmatched": len(reconciled_unmatched),
        "recovered_original_ids": [row["shipment_id"] for row in naive_dropped],
        "recovered_normalized_ids": [normalize_shipment_id(row["shipment_id"]) for row in naive_dropped],
    }


def main() -> int:
    import json

    from load import load_delay_tracking, load_shipments

    shipments = load_shipments()
    delay_rows = load_delay_tracking()
    report = reconciliation_report(shipments, delay_rows)
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
