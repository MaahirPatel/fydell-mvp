# Ops note: working with shipment and delay data

Northbeam Logistics maintains three operational extracts for this engagement:

- `data/shipments.csv` — TMS export of shipments
- `data/carriers.csv` — carrier directory with self-reported on-time claims
- `data/delays_manual_tracking.csv` — ops’ hand-kept delay log

## What to verify yourself

Treat joins between the TMS export and the manual delay log as **untrusted until proven**.
ID fields in hand-maintained sheets often diverge from system exports (prefix, padding,
case, separators). A join that “succeeds” without checking unmatched rows can understate
delay volume.

Suggested checks (you decide how):

1. Load both shipment and delay sources.
2. Compare key formats before joining.
3. Count unmatched delay rows after your join.
4. Recompute late rate on the reconciled set.
5. Treat carrier `on_time_rate_claimed` as a claim — compare to actuals from shipments.

Do not invent rows. If a stakeholder fact is missing, ask in client chat.
