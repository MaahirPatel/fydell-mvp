# Customer brief (synthetic): Northbeam Logistics

**Company:** Northbeam Logistics — a mid-size freight brokerage coordinating
truckload shipments across five contracted carriers and a handful of
regional lanes.

**Client ask, verbatim:**

> "We need better visibility into shipment delays."

That's it. There is no further written spec. Northbeam's ops manager, Dana
Whitfield, sent over three files and asked you to "build whatever's useful."
This is intentional — part of the exercise is scoping the smallest credible
thing that actually answers the ask, not guessing at a feature list.

## What you've been handed

- `data/shipments.csv` — one row per shipment: `shipment_id`, `lane`,
  `promised_date`, `delivered_date`, `carrier_id`.
- `data/carriers.csv` — one row per carrier: `carrier_id`, `name`,
  `on_time_rate_claimed` (self-reported by the carrier).
- `data/delays_manual_tracking.csv` — ops' own hand-kept log of shipments
  they caught running late, with a `delay_reason`. This sheet predates the
  TMS export and was never validated against it.

## Known constraints

- This is a **synthetic** exercise. Northbeam Logistics is not a real
  company; the CSVs are fabricated for this scenario.
- Don't invent data that isn't in the three files above or in the Slack
  thread (`docs/slack-thread.md`). If you need a fact that isn't there, ask
  in the customer chat rather than assuming.
- The client ask above is intentionally underspecified. Good scoping —
  including a short recommendation of what you deliberately did *not*
  build, and why — is part of what's being evaluated here, not a distraction
  from it.

## Suggested starting point (not a checklist)

Get the three CSVs loading and joined correctly before building anything
visual. A dashboard built on top of a silently broken join is worse than no
dashboard — see `docs/data-integrity.md`.
