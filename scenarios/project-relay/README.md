# Project Relay — Northbeam Logistics: Shipment Delay Visibility

Deliver the smallest credible improvement to Northbeam Logistics' shipment
delay visibility, using nothing more than three CSVs and a Slack thread.
Demonstrate how you know your numbers are right, manage a stakeholder
conflict you weren't told about upfront, and recommend what should happen
next. Sound scoping beats feature count.

This repository is **synthetic**. Northbeam Logistics is not a real company.

> Folder name stays `project-relay` so existing workspace wiring
> (`materializeVariant`, `resolveScenarioForSession`, `relay-session.ts`,
> `.fydell/scenario.json`) keeps working — the *content* underneath is a
> full replacement, described below.

## The ask (verbatim)

> "We need better visibility into shipment delays."

That's it — see `docs/customer-brief.md` and `docs/slack-thread.md` for the
full context (there isn't much more).

## What's in this repo

| Path | Purpose |
| --- | --- |
| `docs/customer-brief.md` | The client ask, constraints, synthetic disclaimer |
| `docs/slack-thread.md` | Ops manager vs. VP stakeholder conflict (human-readable; also mirrored in `data/inbox_thread.json`) |
| `docs/data-integrity.md` | Working notes: which joins to trust, and what to verify before quoting a number |
| `data/shipments.csv` | 60 shipments: `shipment_id, lane, promised_date, delivered_date, carrier_id` |
| `data/carriers.csv` | 5 carriers: `carrier_id, name, on_time_rate_claimed` (self-reported) |
| `data/delays_manual_tracking.csv` | 25 ops-tracked delay records; some use a different `shipment_id` format than the TMS export |
| `data/inbox_thread.json` | Same Slack thread as `docs/slack-thread.md`, structured for the workspace inbox UI |
| `src/load.py` | CSV loaders (stdlib only — Pyodide-safe) |
| `src/join.py` | **`naive_join`** — the intentional defect: exact-string `shipment_id` match, silently drops format-mismatched rows |
| `src/reconcile.py` | Reconciliation helpers — **you implement these**: normalize the mixed ID formats and recover the dropped rows; also the `reconcile` CLI/command entry point |
| `src/metrics.py` | Late-rate stats (naive + true) and per-carrier actual-vs-claimed on-time breakdown (the true-rate stats work once you implement `reconcile.py`) |
| `src/report.py` | `build_report()` — ships wired to `join.naive_join` by default; `preview` command entry point |
| `evals/run_evals.py` | Prints `EVAL_SUMMARY_JSON` (see below) |
| `tests/test_reconcile.py` | Acceptance criteria: proves `naive_join` drops rows and that your reconciled join recovers them |

## The defect (data trap)

`data/delays_manual_tracking.csv` is ops' own hand-kept sheet. It predates
the TMS export and uses inconsistent shipment ID formats: most rows match
`shipments.csv`, but some don't — and `join.naive_join` does an exact string
comparison, so it silently drops every mismatched row. No error, no warning.

Your job: find out how many rows are affected, fix the join in
`src/reconcile.py`, rewire the reporting pipeline so the corrected number
actually ships, and prove it with the packaged tests and evals. See
`docs/data-integrity.md` for what to check before you trust any late rate.

## Workspace commands

`allowedCommands` in `.fydell/scenario.json`: `test`, `pytest`, `evals`,
`preview`, `help`, `reconcile`.

- `test` / `pytest` → runs `tests/test_reconcile.py`
- `evals` → runs `evals/run_evals.py`, prints `EVAL_SUMMARY_JSON`
- `preview` → runs `src/report.py`'s `build_report()` against the real CSVs
- `reconcile` → runs `src/reconcile.py`'s `main()`, printing naive-vs-reconciled join stats once you have implemented the reconciliation helpers

## `EVAL_SUMMARY_JSON` schema

```json
{
  "naive_late_rate": "<float>",
  "true_late_rate": "<float, or null until reconcile.py is implemented>",
  "rows_dropped_naive": "<int>",
  "integrity_caught": false,
  "report_schema_valid": true,
  "cases_total": 3,
  "cases_failures": 0
}
```

`integrity_caught` is `false` as-shipped (the pipeline still reports the
naive number) and flips to `true` once a candidate fixes the ID mismatch and
rewires `report.build_report`'s default `join_fn` to `reconcile.reconciled_join`
— the evals compare the report's late rate against the true rate computed
from the candidate's own reconciled join, so there is nothing to memorize.

## Requirement updates

A requirement update may arrive mid-session (schedule changes, stakeholder
escalations, new data-quality findings). Each update is announced in-session;
acknowledge it before submitting so the update is part of your attempt.
Details live in the session, not in this file.

## Checking your work

Run from `scenarios/project-relay/`:

```
python evals/run_evals.py
```

The runner prints `PASS`/`FAIL`/`WARN` lines plus a machine-parseable
`EVAL_SUMMARY_JSON` line. As-shipped, `reconcile_recovers_rows` fails and
`integrity_caught` is `false` — both flip once `src/reconcile.py` is
implemented and `report.build_report` uses it. The packaged pytest suite
(`tests/test_reconcile.py`) encodes the same acceptance criteria; run it
directly with `python3` if `pytest` is not installed:

```
python3 -c "
import sys
sys.path.insert(0, 'tests'); sys.path.insert(0, 'src')
import test_reconcile
for n in [n for n in dir(test_reconcile) if n.startswith('test_')]:
    getattr(test_reconcile, n)()
print('all tests passed')
"

### Known follow-up (not fixed in this pass)

`src/lib/relay/variants/{catalog,materialize,validate}.ts` and
`scripts/test-relay-variants.ts` are a separate generative-variant pipeline
built specifically around the *old* ticket-triage domain's files
(`router.py`'s missing approval check, `triage.py`'s keyword ordering,
etc.). Those mutators no longer find their anchors in this scenario's files,
so `materializeVariant` now no-ops and `validateVariant` fails closed
(no `INTENTIONAL_DEFECT` marker) — which means `resolveScenarioForSession`
safely falls back to the known-good canonical baseline for all three
catalog variants (by design — it never serves an invalid variant), but the
three approved variants no longer produce a distinct, intentionally-broken
version of this scenario. `npx tsx scripts/test-relay-variants.ts` will
report 5 failing golden cases as a result. Real sessions are unaffected
(no `RELAY_ACTIVE_VARIANT_ID` is set by default), but designing 3
Northbeam-specific defect mutators (e.g. a stale zero-pad width constant, a
reversed carrier-claim comparison, a broken date-rollover check) to restore
that pipeline is follow-up work, not done here.

Similarly, `src/lib/relay/ai-patch.ts` (the workspace "AI assist" panel's
one canned patch suggestion) was written specifically for the old
`router.py` approval-check defect and now returns "nothing to suggest" for
every file in this scenario (graceful no-op, not an error) — a
Northbeam-specific canned suggestion (e.g. wiring `reconcile.reconciled_join`
into `report.build_report`) would be a reasonable follow-up but risks
handing candidates the answer, so it was intentionally left as-is.
