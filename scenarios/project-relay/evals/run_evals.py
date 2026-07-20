"""Evaluation runner for the Northbeam Logistics delay-visibility scenario.

Prints human-readable PASS/FAIL/WARN lines for quick scanning, then a single
machine-parseable `EVAL_SUMMARY_JSON:{...}` line the Relay workspace UI reads
to render the Evaluation Laboratory panel. Every number in that summary comes
from actually loading data/*.csv and running join.py/reconcile.py/report.py —
nothing here is a hardcoded placeholder score.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from join import naive_join  # noqa: E402
from load import load_carriers, load_delay_tracking, load_shipments  # noqa: E402
from metrics import late_rate  # noqa: E402
from reconcile import reconciled_join  # noqa: E402
from report import build_report, validate_report_schema  # noqa: E402

# How close report["late_rate"] must be to the reconciled true rate (and how
# far from the naive rate) to count as "the pipeline actually uses reconcile".
INTEGRITY_TOLERANCE = 0.005


def run_join_checks(shipments: list[dict], delay_rows: list[dict]) -> tuple[int, int]:
    """Proves naive_join drops rows and reconciled_join recovers them."""
    failures = 0
    total = 0

    total += 1
    naive_matched, naive_dropped = naive_join(shipments, delay_rows)
    if len(naive_dropped) == 0:
        print("FAIL naive_join_drops_rows: expected naive_join to drop mismatched-ID rows, dropped 0")
        failures += 1
    else:
        print(f"PASS naive_join_drops_rows: dropped {len(naive_dropped)} row(s) with mismatched IDs")

    total += 1
    reconciled_matched, reconciled_unmatched = reconciled_join(shipments, delay_rows)
    if len(reconciled_unmatched) != 0:
        print(f"FAIL reconcile_recovers_rows: {len(reconciled_unmatched)} row(s) still unmatched after reconciliation")
        failures += 1
    elif len(reconciled_matched) <= len(naive_matched):
        print("FAIL reconcile_recovers_rows: reconciled join did not recover more rows than the naive join")
        failures += 1
    else:
        recovered = len(reconciled_matched) - len(naive_matched)
        print(f"PASS reconcile_recovers_rows: recovered {recovered} row(s) naive_join silently dropped")

    return total, failures


def main() -> int:
    shipments = load_shipments()
    carriers = load_carriers()
    delay_rows = load_delay_tracking()

    total, failures = run_join_checks(shipments, delay_rows)

    naive_matched, naive_dropped = naive_join(shipments, delay_rows)
    reconciled_matched, _ = reconciled_join(shipments, delay_rows)

    naive_rate = late_rate(len(shipments), len(naive_matched))
    true_rate = late_rate(len(shipments), len(reconciled_matched))

    report = build_report(shipments, carriers, delay_rows)
    schema_valid = validate_report_schema(report)

    total += 1
    if not schema_valid:
        print("FAIL report_schema_valid: build_report() output failed validate_report_schema()")
        failures += 1
    else:
        print("PASS report_schema_valid")

    # integrity_caught: does the production report (report.build_report, using
    # whatever join_fn the candidate left wired in) reflect the reconciled
    # true late rate, rather than shipping the naive/understated one?
    integrity_caught = report["rows_dropped"] == 0 and math.isclose(
        report["late_rate"], true_rate, abs_tol=INTEGRITY_TOLERANCE
    )

    if integrity_caught:
        print(f"PASS integrity_caught: report reflects the reconciled true late rate ({true_rate:.4f})")
    else:
        print(
            f"WARN integrity_caught=False: report still reflects the naive/understated late rate "
            f"({report['late_rate']:.4f} vs. true {true_rate:.4f}) — see reconcile.py, "
            "then wire reconcile.reconciled_join into report.build_report()'s default join_fn"
        )

    print(
        "RATES "
        f"naive_late_rate={naive_rate:.4f} true_late_rate={true_rate:.4f} "
        f"rows_dropped_naive={len(naive_dropped)}"
    )
    print(f"SUMMARY total={total} failures={failures}")

    summary = {
        "naive_late_rate": round(naive_rate, 4),
        "true_late_rate": round(true_rate, 4),
        "rows_dropped_naive": len(naive_dropped),
        "integrity_caught": integrity_caught,
        "report_schema_valid": schema_valid,
        "cases_total": total,
        "cases_failures": failures,
    }
    # Machine-parseable line the workspace UI regex-matches out of stdout.
    print(f"EVAL_SUMMARY_JSON:{json.dumps(summary)}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
