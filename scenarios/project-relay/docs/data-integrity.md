# Data integrity note: naive late rate vs. true late rate (synthetic)

This scenario ships with one deliberate, discoverable defect: the default
join between `data/shipments.csv` and `data/delays_manual_tracking.csv`
(`join.naive_join`, used by `report.build_report` unless a candidate rewires
it) silently drops delay records whose `shipment_id` doesn't share
`shipments.csv`'s exact `SHP-NNNNN` (zero-padded, 5-digit) format.

## The numbers, as-shipped

| Metric | Value | How it's computed |
| --- | --- | --- |
| Total shipments | 60 | `len(load_shipments())` |
| Manually tracked delay records | 25 | `len(load_delay_tracking())` |
| Delay records with a mismatched ID format | 3 (12.0% of 25) | `SHP-7`, `00024`, `SHP-038` — see below |
| Naive late count (exact-string join) | 22 | `join.naive_join` |
| **Naive late rate** | **36.7%** (22 / 60) | what the pipeline reports before the fix |
| Reconciled late count (normalized join) | 25 | `reconcile.reconciled_join` |
| **True late rate** | **41.7%** (25 / 60) | after fixing ID normalization |
| Rows recovered by reconciliation | 3 | exactly the 3 mismatched rows above |

The naive pipeline understates the delay rate by **5.0 percentage points**
(36.7% vs. 41.7%) — a ~12% relative undercount of the *manually tracked*
delay volume, purely from an ID-formatting bug, not from shipments actually
being on time.

## The three mismatched rows

`data/delays_manual_tracking.csv` is hand-maintained by the ops team and was
never validated against `data/shipments.csv`'s ID format. Three rows use a
different format than the rest of the sheet:

| Row as written | Canonical form (`shipments.csv`) | Why the naive join misses it |
| --- | --- | --- |
| `SHP-7` | `SHP-00007` | missing leading zeros |
| `00024` | `SHP-00024` | missing `SHP-` prefix entirely |
| `SHP-038` | `SHP-00038` | wrong zero-pad width (3 digits, not 5) |

`join.naive_join` does an exact string comparison, so none of these three
strings equal any key in `shipments.csv` — the rows are dropped with no
warning, no error, and no log line. A dashboard or report built on top of
the naive join would look confident and be quietly wrong.

## The fix

`reconcile.normalize_shipment_id` strips everything but digits and re-pads
to the canonical 5-digit `SHP-NNNNN` form, so all three formats above
resolve to the correct shipment. `reconcile.reconciled_join` uses that to
recover every row `naive_join` drops (see `tests/test_reconcile.py` for the
proof, and `evals/run_evals.py`'s `EVAL_SUMMARY_JSON` line for the same
numbers computed at eval time via `naive_late_rate`, `true_late_rate`, and
`rows_dropped_naive`).

`report.build_report` still defaults to `join.naive_join` — fixing the
default (or passing `join_fn=reconcile.reconciled_join` at the call site) is
what flips `evals/run_evals.py`'s `integrity_caught` field from `false` to
`true`.

## A second, separate data-quality issue: carrier self-reporting

`data/carriers.csv`'s `on_time_rate_claimed` column is self-reported by each
carrier and is **not** derived from `data/shipments.csv`. Once you compute
each carrier's *actual* on-time rate (see `metrics.carrier_breakdown`), at
least one carrier's claimed number is off by a wide margin — treat any
carrier-reported reliability metric as a claim to verify, not a fact to
cite in the board deck.
