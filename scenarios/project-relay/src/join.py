"""Northbeam Logistics — join between shipments and the manual delay log.

INTENTIONAL DEFECT (candidate should find this): `naive_join` matches
delay-tracking rows to shipments using exact string equality on
`shipment_id`. `data/delays_manual_tracking.csv` is hand-maintained by ops
and is NOT guaranteed to use shipments.csv's zero-padded `SHP-NNNNN`
format — some rows drop the `SHP-` prefix (`123` instead of `SHP-00123`),
some drop the leading zeros (`SHP-123` instead of `SHP-00123`).

Exact-string matching silently drops every one of those rows instead of
erroring or warning, so any "late rate" computed on top of `naive_join`
alone understates how many shipments are actually late — a naive reader
of this join would conclude delays are less common than they are. See
`reconcile.py` for the fix, and `docs/data-integrity.md` for the numbers.
"""

from __future__ import annotations

from typing import Any


def naive_join(
    shipments: list[dict[str, Any]], delay_rows: list[dict[str, Any]]
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Exact-string-match join on `shipment_id`.

    Returns (matched, dropped). `dropped` holds every delay-tracking row
    whose `shipment_id` did not appear verbatim in `shipments` —
    almost always a formatting mismatch, not a real missing shipment.

    # INTENTIONAL_DEFECT: naive_join (join.py) — exact string equality on
    # shipment_id silently drops any delay-tracking row whose ID format
    # doesn't match shipments.csv's zero-padded SHP-NNNNN format.
    """
    known_ids = {shipment["shipment_id"] for shipment in shipments}
    matched = [row for row in delay_rows if row["shipment_id"] in known_ids]
    dropped = [row for row in delay_rows if row["shipment_id"] not in known_ids]
    return matched, dropped
