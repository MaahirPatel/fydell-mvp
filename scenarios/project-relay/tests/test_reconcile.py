import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from join import naive_join
from load import load_carriers, load_delay_tracking, load_shipments
from metrics import late_rate
from reconcile import normalize_shipment_id, reconciled_join
from report import build_report, validate_report_schema


def test_naive_join_drops_mismatched_ids():
    shipments = load_shipments()
    delay_rows = load_delay_tracking()
    matched, dropped = naive_join(shipments, delay_rows)
    assert len(dropped) > 0, "naive_join should drop rows whose shipment_id format doesn't match shipments.csv"
    assert len(matched) + len(dropped) == len(delay_rows)


def test_reconciled_join_recovers_all_rows():
    shipments = load_shipments()
    delay_rows = load_delay_tracking()
    matched, unmatched = reconciled_join(shipments, delay_rows)
    assert len(unmatched) == 0, f"reconciled_join left {len(unmatched)} row(s) unmatched"
    assert len(matched) == len(delay_rows)


def test_normalize_shipment_id_handles_all_known_formats():
    assert normalize_shipment_id("SHP-00123") == "SHP-00123"
    assert normalize_shipment_id("SHP-123") == "SHP-00123"
    assert normalize_shipment_id("00123") == "SHP-00123"
    assert normalize_shipment_id("123") == "SHP-00123"


def test_true_late_rate_exceeds_naive_late_rate():
    shipments = load_shipments()
    delay_rows = load_delay_tracking()

    naive_matched, naive_dropped = naive_join(shipments, delay_rows)
    reconciled_matched, _ = reconciled_join(shipments, delay_rows)

    naive_rate = late_rate(len(shipments), len(naive_matched))
    true_rate = late_rate(len(shipments), len(reconciled_matched))

    assert len(naive_dropped) > 0
    assert true_rate > naive_rate, "true late rate should exceed the naive (understated) late rate"


def test_report_schema_is_valid():
    shipments = load_shipments()
    carriers = load_carriers()
    delay_rows = load_delay_tracking()
    report = build_report(shipments, carriers, delay_rows)
    assert validate_report_schema(report)


def test_report_schema_rejects_malformed_reports():
    assert not validate_report_schema({})
    assert not validate_report_schema({"total_shipments": -1})
