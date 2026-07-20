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
| `docs/slack-thread.md` | Ops manager vs. VP stakeholder conflict, board-meeting curveball, human-readable |
| `docs/data-integrity.md` | The naive vs. true late-rate numbers, spelled out |
| `data/shipments.csv` | 60 shipments: `shipment_id, lane, promised_date, delivered_date, carrier_id` |
| `data/carriers.csv` | 5 carriers: `carrier_id, name, on_time_rate_claimed` (self-reported) |
| `data/delays_manual_tracking.csv` | 25 ops-tracked delay records; 3 use a mismatched `shipment_id` format |
| `data/inbox_thread.json` | Same Slack thread as `docs/slack-thread.md`, structured for the workspace inbox UI |
| `src/load.py` | CSV loaders (stdlib only — Pyodide-safe) |
| `src/join.py` | **`naive_join`** — the intentional defect: exact-string `shipment_id` match, silently drops format-mismatched rows |
| `src/reconcile.py` | The fix: `normalize_shipment_id` + `reconciled_join`, plus a `reconcile` CLI/command entry point |
| `src/metrics.py` | Late-rate stats (naive + true) and per-carrier actual-vs-claimed on-time breakdown |
| `src/report.py` | `build_report()` — ships wired to `join.naive_join` by default; `preview` command entry point |
| `evals/run_evals.py` | Prints `EVAL_SUMMARY_JSON` (see below) |
| `tests/test_reconcile.py` | Proves `naive_join` drops rows and `reconcile.reconciled_join` recovers them |

## The defect (data trap)

`data/delays_manual_tracking.csv` is ops' own hand-kept sheet. It predates
the TMS export and uses inconsistent shipment ID formats: most rows are
`SHP-00007`-style (matching `shipments.csv`), but **3 of 25** rows use a
different format (`SHP-7`, `00024`, `SHP-038`). `join.naive_join` does an
exact string comparison, so it silently drops all three — no error, no
warning.

- **Naive late rate:** 22 / 60 = **36.7%**
- **True late rate** (after `reconcile.reconciled_join`): 25 / 60 = **41.7%**
- **Rows dropped by the naive join:** 3 (exactly 12.0% of the 25 manually
  tracked delay records)

Full derivation in `docs/data-integrity.md`.

## Workspace commands

`allowedCommands` in `.fydell/scenario.json`: `test`, `pytest`, `evals`,
`preview`, `help`, `reconcile`.

- `test` / `pytest` → runs `tests/test_reconcile.py`
- `evals` → runs `evals/run_evals.py`, prints `EVAL_SUMMARY_JSON`
- `preview` → runs `src/report.py`'s `build_report()` against the real CSVs
- `reconcile` → runs `src/reconcile.py`'s `main()`, printing naive-vs-reconciled join stats (which rows were recovered, and how)

## `EVAL_SUMMARY_JSON` schema

```json
{
  "naive_late_rate": 0.3667,
  "true_late_rate": 0.4167,
  "rows_dropped_naive": 3,
  "integrity_caught": false,
  "report_schema_valid": true,
  "cases_total": 3,
  "cases_failures": 0
}
```

`integrity_caught` is `false` as-shipped (the pipeline still reports the
naive number) and flips to `true` once a candidate rewires
`report.build_report`'s default `join_fn` to `reconcile.reconciled_join`
(or otherwise fixes the ID mismatch upstream). This was verified by hand
(see "Verification" below) — as-shipped, `integrity_caught=false`; after
wiring in `reconcile.reconciled_join`, `integrity_caught=true` and
`rows_dropped` drops to `0`.

## Curveballs (`canonical.json`)

- `board_meeting_thursday` — the board meeting is pulled forward, deadline moves up
- `vp_wants_root_cause` — the VP escalates wanting root-cause analysis, conflicting with the ops manager's dashboard ask
- `carrier_data_unreliable` — a carrier's self-reported on-time rate doesn't match reality

`src/lib/fde/relay-session.ts`'s `draftCustomerReply` is vague by default
(mirrors the underspecified brief) and only reveals the stakeholder
conflict, the ID-format hint, or the carrier-reliability hint when a
candidate's chat message actually probes for it — never inventing facts
beyond `canonical.json`'s `canonicalFacts`.

## Verification performed

Run from `scenarios/project-relay/`:

```
python evals/run_evals.py
```

Output (as-shipped):

```
PASS naive_join_drops_rows: dropped 3 row(s) with mismatched IDs
PASS reconcile_recovers_rows: recovered 3 row(s) naive_join silently dropped
PASS report_schema_valid
WARN integrity_caught=False: report still reflects the naive/understated late rate (0.3667 vs. true 0.4167)
RATES naive_late_rate=0.3667 true_late_rate=0.4167 rows_dropped_naive=3
SUMMARY total=3 failures=0
EVAL_SUMMARY_JSON:{"naive_late_rate": 0.3667, "true_late_rate": 0.4167, "rows_dropped_naive": 3, "integrity_caught": false, "report_schema_valid": true, "cases_total": 3, "cases_failures": 0}
```

Additionally verified by hand:

- All 6 tests in `tests/test_reconcile.py` pass (run directly — `pytest` is
  not installed in this environment, so they were executed by importing and
  calling each `test_*` function; `NodeTestExecutionProvider`'s fallback
  runner covers the no-pytest case for the workspace itself).
- `python src/reconcile.py` prints the exact 3 recovered rows
  (`SHP-7`→`SHP-00007`, `00024`→`SHP-00024`, `SHP-038`→`SHP-00038`).
- `python src/report.py` prints the full report incl. per-carrier
  breakdown; confirmed `CAR-03` ("Apex Trucking Group") claims a 92%
  on-time rate but its actual (reconciled) rate is 33.3% — the
  `carrier_data_unreliable` curveball, backed by real numbers.
- Simulated the fix (temporarily set `report.build_report`'s default
  `join_fn` to `reconcile.reconciled_join`, ran `evals/run_evals.py`,
  confirmed `integrity_caught` flips to `true` and `rows_dropped` becomes
  `0`), then reverted `src/report.py` to its shipped (defective) state and
  re-ran evals to confirm `integrity_caught=false` again.
- `npx tsx scripts/test-relay-spike.ts` → `RELAY_SPIKE_OK` (full
  `NodeTestExecutionProvider` acceptance run against the real files in this
  directory: seed, multi-file edit, snapshot/restore, `test`, `evals`,
  `preview`, `reconcile`-aware allowlist error, curveball file drop,
  immutable submission snapshot, terminate/recover).
- `npx tsc --noEmit` → no errors.

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
