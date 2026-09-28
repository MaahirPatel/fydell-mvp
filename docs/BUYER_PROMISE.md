# Fydell Buyer Promise (v1)

What a paying employer buys, what we promise to deliver, and what we do
not promise. This document is the commercial definition behind checklist
items BUY-01..BUY-07. Claims here match implemented features only.

## Supported role and assessment family (BUY-01)

- **First supported role:** Backend Engineer — webhook/integration
  reliability work (the "Webhook retry incident" assessment family,
  scenario v1.0.0, demo invite code `FYDELL-DEMO`).
- **Hiring step this replaces:** the take-home / work-sample screen that
  currently happens after resume review and before the technical interview
  loop. Fydell does not replace interviews, reference checks, or the final
  hiring decision.
- **Who reviews the report:** an engineering reviewer at the buying company
  (hiring manager or senior engineer). Reports are written for a technical
  reader, not for HR automation.

## Service promise (BUY-02)

- **Candidate time:** ~90 minutes of focused assessment work, plus workspace
  setup and submission. The expected effort is shown to the candidate before
  they start.
- **Report turnaround:** the evidence report is released after analysis
  completes and any consequential findings pass human review. There is no
  fixed SLA in v1; the employer dashboard shows the live status of every
  attempt (invited → accepted → setup → in progress → submitted →
  evaluating → review required → ready).
- **Included volume:** per purchased package (see Billable event). Unused
  invitations that never reach "submitted" do not consume a completed
  evaluation.
- **Support contact:** the employer writes to the support address shown in
  the billing portal; candidate issues go through the employer, who can
  resend, revoke, or extend any invitation from the dashboard.
- **Deliverables:** per completed evaluation — the decision brief
  (strengths, gaps, evidence limitations, interview follow-ups), the
  categorized evidence report with source links, and the candidate's
  portable evidence summary.
- **Limits:** one assessment family in v1 (backend engineering); reports
  describe observed evidence only; no predictions about future job
  performance.

## Billable event (BUY-03)

- Payment buys a **package of completed evaluations**: an evaluation is
  billed when a candidate's attempt reaches "submitted" and analysis
  produces a report (or a review-required outcome).
- **Failed infrastructure runs never silently consume paid credits.** If
  workspace provisioning, analysis, or report generation fails on our side,
  the attempt is flagged (infrastructure status is a separate report
  category) and no completed-evaluation credit is consumed. The employer can
  see the infrastructure status on every report.
- Invitations that expire, are revoked, or never start cost nothing beyond
  the package.

## Review usefulness (BUY-04) — MANUAL-OK

Before a paid pilot, a hiring manager reviews the sample report
(`rep-example-1`, labeled sample data) with this checklist, without
founder interpretation:

1. Can you name two demonstrated strengths, each with its evidence link?
2. Can you name one material gap, each with its evidence link?
3. Can you write two interview follow-up questions from the report?
4. Can you state one evidence limitation in your own words?

The pilot proceeds only if all four are answered. Record the reviewer's
answers and the date in the pilot notes.

## Measuring work saved (BUY-05) — MANUAL-OK

For the first paid pilot, measure once with a stopwatch-level log kept by
the employer:

- Existing process: time to set up the take-home, send invitations,
  grade submissions, handle clarification questions, and review reports.
- With Fydell: time to define the role, preview the assessment, send
  invitations, and review the evidence reports.
- **Manual review labor is logged separately** (who reviewed, how long,
  how many findings were corrected), so automation savings are never
  conflated with human QA time.

No aggregate "hours saved" claim is published until at least one real
pilot has produced these numbers.

## What is NOT promised (BUY-06)

- We do **not** predict job performance. Reports describe what the
  candidate demonstrated in one assessment, with stated limitations.
- We do **not** guarantee hires or hiring outcomes. All hiring decisions
  are made by humans; recording a decision in Fydell never sends a message
  to the candidate.
- We do **not** claim to prevent all cheating. The AI policy is explicit
  about what is permitted; permitted tool use is not penalized.
- We do **not** claim universal coverage: v1 covers one role family and
  one scenario. Other roles need their own validated rubric and evaluator.
- We do **not** produce a universal hireability number or cultural-fit
  score. Results are reported in separated categories with per-category
  bands and evidence.

## Repeat demand (BUY-07) — MANUAL-OK

After each pilot, record in the CRM:

- Did the buyer send another candidate or pay for another batch? (yes/no)
- If no, the reason in the buyer's own words.
- Date and contact.

Small samples are not treated as predictive validation.
