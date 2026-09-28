"""Northbeam Logistics — shipment ID reconciliation.

`data/delays_manual_tracking.csv` mixes shipment ID formats: some rows use
the fully-qualified format found in `data/shipments.csv`, others use
unpadded or bare-digit variants. `join.naive_join` matches on exact string
equality, so it silently drops the mismatched rows — and any late rate built
on it understates reality.

Your job: implement `normalize_shipment_id` and `reconciled_join` below so
that every delay-tracking row matches the shipment it belongs to. Once they
work:

- `metrics.true_late_rate_stats` can compute the accurate late rate,
- `report.build_report` can be rewired to stop dropping rows,
- `tests/test_reconcile.py` and `evals/run_evals.py` verify your work.

Nothing in this module is implemented for you — the tests fail until it is.
"""

from __future__ import annotations

from typing import Any


def normalize_shipment_id(raw: str) -> str:
    """Normalize one shipment id to the canonical format used by
    `data/shipments.csv` (the `SHP-` prefixed, zero-padded form).

    Must handle every format present in `data/delays_manual_tracking.csv`:
    fully-qualified ids, unpadded ids, and bare-digit ids. Ids with no digits
    at all should be returned unchanged.
    """
    raise NotImplementedError(
        "normalize_shipment_id is not implemented yet — see the module docstring"
    )


def reconciled_join(
    shipments: list[dict[str, Any]], delay_rows: list[dict[str, Any]]
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Join delay-tracking rows to shipments using `normalize_shipment_id`.

    Returns (matched, still_unmatched). Each matched row's `shipment_id`
    should be rewritten to the canonical format so downstream code can key
    off it consistently.
    """
    raise NotImplementedError(
        "reconciled_join is not implemented yet — implement normalize_shipment_id first"
    )


def main() -> int:
    import json

    from join import naive_join
    from load import load_delay_tracking, load_shipments

    shipments = load_shipments()
    delay_rows = load_delay_tracking()

    naive_matched, naive_dropped = naive_join(shipments, delay_rows)
    try:
        reconciled_matched, reconciled_unmatched = reconciled_join(
            shipments, delay_rows
        )
    except NotImplementedError as exc:
        print(json.dumps({"implemented": False, "hint": str(exc)}, indent=2))
        return 2

    print(
        json.dumps(
            {
                "implemented": True,
                "naive_matched": len(naive_matched),
                "naive_dropped": len(naive_dropped),
                "reconciled_matched": len(reconciled_matched),
                "reconciled_unmatched": len(reconciled_unmatched),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
