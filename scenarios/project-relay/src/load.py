"""CSV loaders for the Northbeam Logistics scenario (synthetic).

Pure stdlib (csv + pathlib) so this runs identically under Pyodide (browser),
the Node test-execution provider, and a plain local `python` invocation.
No pandas, no network calls.
"""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"


def _read_csv(path: Path) -> list[dict[str, Any]]:
    with open(path, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def load_shipments(data_dir: Path | str = DATA_DIR) -> list[dict[str, Any]]:
    """Rows from data/shipments.csv: shipment_id, lane, promised_date,
    delivered_date, carrier_id. shipment_id is always the canonical
    zero-padded `SHP-NNNNN` format here."""
    return _read_csv(Path(data_dir) / "shipments.csv")


def load_carriers(data_dir: Path | str = DATA_DIR) -> list[dict[str, Any]]:
    """Rows from data/carriers.csv: carrier_id, name, on_time_rate_claimed.
    `on_time_rate_claimed` is self-reported by the carrier — see
    docs/data-integrity.md before trusting it at face value."""
    return _read_csv(Path(data_dir) / "carriers.csv")


def load_delay_tracking(data_dir: Path | str = DATA_DIR) -> list[dict[str, Any]]:
    """Rows from data/delays_manual_tracking.csv: shipment_id, delay_reason,
    flagged_date, ops_notes. This is ops' hand-maintained log of shipments
    they caught as delayed. Its `shipment_id` column is NOT guaranteed to
    match shipments.csv's `SHP-NNNNN` format — some rows drop the `SHP-`
    prefix, some drop the leading zeros. See reconcile.py."""
    return _read_csv(Path(data_dir) / "delays_manual_tracking.csv")
