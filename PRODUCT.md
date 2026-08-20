# Fydell

## Register
**product** (the employer console, the simulation, and the evidence report are the primary surfaces; the public site exists to demonstrate what the product already does, never to promise what it does not)

## What Fydell is
Fydell is a managed proof-of-work talent network for technical customer-facing roles, starting with Solutions Engineers. A company gives Fydell a real role. Candidates do realistic work while material facts change. Fydell returns a handful of people worth interviewing, a sixty-second decision brief, and what to probe next.

The product is judged on whether a hiring manager learned something they would not have known from a resume, and whether the next interview changed.

Software is how we create the advantage. It is not what we sell.

## Two isolated loops
- **Wave 1 (production, unchanged):** Data Analyst, Northline DA-01, `/sim/[sessionId]`, WorkbenchRunner, v2 scoring.
- **Proof graph (new, isolated):** Solutions Engineer, `proof_*` tables, `/work/[token]`, Python analysis worker, human-reviewed briefs.

Do not mix their event ledgers.

## Pilot scope for the proof graph
Find is still manual. Match is still founder-selected. Prove is the product: changing work, ordered events, two-pass evidence, oral defense, human review.

Not in scope: ATS, job board, candidate social network, Fydell Score, seat-based assessment SaaS, automated ranking.

## What Fydell is (legacy Wave 1 framing)
The DA-01 path still replaces an unverifiable take-home with a scoped piece of analyst work and an evidence report. That path remains live and must not be rewritten for this graph.

## Users and what each one needs
| User | Needs |
|---|---|
| Workspace owner | Get from empty workspace to a first invited candidate without a call, and know what is left to do |
| Hiring manager / reviewer | Read one report, reach a defensible decision, see the evidence behind every claim |
| Candidate | Understand the rules before starting, work without surveillance anxiety, keep a receipt of their own work |
| Fydell operator | See stuck runs and failed analysis before a customer reports them |

## Brand personality
Precise · restrained · evidence-first

Serious infrastructure for a consequential decision. Confidence comes from what is shown, not from adjectives.

## Voice
Direct and specific. State what happened and what it is evidence of. Name limits in the same breath as claims, because a hiring decision made on an overstated signal is the failure mode that ends the company.

Write "four candidates completed the analysis; two flagged the freight variance" rather than "powerful insights into candidate performance."

- No score presented as truth. A number is a summary of evidence, never a verdict.
- No percentiles, benchmarks, or comparative rankings. The data to support them does not exist.
- No fabricated counts, logos, testimonials, or customer names.
- No quiz, test, or assessment framing. This is work.
- Empty means empty. A zero state says so rather than showing a plausible zero.

## Product truth boundaries
Fydell **may** say: the work trail is recorded and disclosed; the report cites the trail; the candidate owns their receipt; the evaluation is scoped and timed.

Fydell **may not** say: that it predicts job performance; that it detects cheating or AI use with certainty; that scores are validated against outcomes; that it removes bias; that anything is "industry standard."

## Anti-references
- Purple-on-white generic AI SaaS
- Proctoring and surveillance aesthetics (webcam grids, lockdown warnings, red flags)
- Gamified assessment platforms (badges, streaks, leaderboards, confetti)
- Brass / parchment editorial "ledger" styling
- Dashboards that decorate rather than inform: sparklines with no series, gauges with no scale, cards that hold one number

## Constraints (do not break)
- Invite-only. There is no public simulation catalog and no self-serve unlock.
- The disclosed work trail is disclosed. Candidates are told what is recorded before they start, and the report contains nothing they were not told about.
- Real data only. Every number in the product comes from the database. No placeholder rows, no seeded demo cohorts in a real workspace.
- The honest `not_configured` state for email delivery stays honest until a provider is actually wired.
- Row-level security is the authorization boundary. The service role key never serves a browser request.
