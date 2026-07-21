"""Northbeam Logistics — join between shipments and the manual delay log.

`naive_join` matches delay-tracking rows to shipments using exact string
equality on `shipment_id`. Hand-maintained delay logs are not guaranteed to
use the same ID formatting as the TMS export. Inspect unmatched rows before
trusting any late-rate built on this join. See `reconcile.py` for alternate
strategies.
"""

from __future__ import annotations

from typing import Any


def naive_join(
    shipments: list[dict[str, Any]], delay_rows: list[dict[str, Any]]
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Exact-string-match join on `shipment_id`.

    Returns (matched, dropped). `dropped` holds every delay-tracking row
    whose `shipment_id` did not appear verbatim in `shipments`.
    """
    known_ids = {shipment["shipment_id"] for shipment in shipments}
    matched = [row for row in delay_rows if row["shipment_id"] in known_ids]
    dropped = [row for row in delay_rows if row["shipment_id"] not in known_ids]
    return matched, dropped
