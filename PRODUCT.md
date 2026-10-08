# Fydell

## Register
**product** (the employer workspace, the desktop simulation and the cited report are the primary surfaces; the public site exists to show what the product already does, never to promise what it does not)

## What Fydell is
Fydell hires software engineers on real engineering work. An employer publishes an engineering role and invites candidates. Each candidate opens the Fydell desktop app, works in a real codebase against a real incident, talks to a simulated team, and handles a requirement that changes partway through. Fydell runs hidden tests in an isolated sandbox. The employer's own team reads the evidence, writes a report where every finding cites a file, line, test, message or handoff answer, and records Advance, Hold or Decline.

The product is judged on one question: did the hiring team learn something about how this engineer works that a resume, a LeetCode screen or an unverifiable take-home would not have shown them, and did it change the next interview?

## The engineering loop
1. **Role.** The employer creates an engineering role, picks a versioned simulation and publishes it.
2. **Invite.** Candidates are invited by email or link. Invite-only; there is no public catalog.
3. **Consent.** Before starting, the candidate sees exactly what is recorded and what is not.
4. **Work.** The candidate works in the Fydell desktop app on macOS or Windows. The app holds the brief, the codebase, the team thread, the requirement update and the submission. It replaces the ZIP upload.
5. **Work trail.** The desktop app records a disclosed work trail: file changes, commands run, test runs and timing. Nothing outside the disclosed list is recorded, and nothing is claimed about activity Fydell cannot see.
6. **Change.** One requirement update arrives on the server's clock (in the first simulation, a partner asks the dispatcher to honour `Retry-After`).
7. **Submit and hand off.** The candidate submits and answers three questions: what changed, what they tested, what remains unresolved. They receive a receipt with the archive hash.
8. **Evaluate.** Hidden tests run in an isolated sandbox against the submitted snapshot.
9. **Review.** The employer's team writes the report. A report cannot be released unless every finding cites real evidence.
10. **Decide.** The team records Advance, Hold or Decline. The decision never messages the candidate.

The first simulation is `backend-webhook-retry` (Python): incident INC-2291, a webhook dispatcher in a retry storm at Harbor Pay, with Alex Morgan (engineering lead) and Jordan Hayes (partner support) on the team thread.

## Secondary surfaces
- **Engineering Passport.** A developer-owned record built from public GitHub projects they choose, with source-linked evidence and scoped share links they can revoke. It supports the engineering loop; it is not a social network or a job board.
- **Billing.** Priced per completed simulation (one that produced a report). Invitations, expired links and infrastructure failures are never billed. Prices live only in `src/lib/marketing/pricing.ts`.

## Users and what each one needs
| User | Needs |
|---|---|
| Workspace owner | Go from an empty workspace to a first invited candidate without a call, and know what is left to do |
| Hiring manager / reviewer | Read the evidence, write a cited report, reach a defensible decision the rest of the team can audit |
| Candidate | Know the rules and the recorded trail before starting, work in a real environment without surveillance anxiety, keep a receipt of their own work |
| Fydell operator | See stuck runs and delayed evaluations before a customer reports them |

## Brand personality
Precise · restrained · engineered

Serious infrastructure for a consequential decision, built with the craft engineers expect from their own tools. Confidence comes from what is shown, not from adjectives.

## Visual reference
The public site is a light-mode Linear laid out like x.ai. The format follows x.ai: very large left-aligned statements, generous negative space, few words per section, a monochrome near-white and near-black palette, and hairline rules between sections. The text follows Linear: Geist with tight tracking, medium-to-semibold headlines, one grey supporting line and small precise labels. The visuals follow Linear's product windows in light mode, built in HTML from real product data: the home hero is the candidate's simulation drawn in an issue tracker's structure, with the team thread docked on the right. Light mode only. See `DESIGN.md` for the page grammar and tokens.

## Voice
Direct and specific. State what happened and what it is evidence of. Name limits in the same breath as claims, because a hiring decision made on an overstated signal is the failure mode that ends the company.

Write "the candidate changed `dispatcher.py`, ran the tests four times and asked Alex which status codes are temporary" rather than "powerful insights into candidate performance."

- No score presented as truth. A number is a summary of evidence, never a verdict.
- No percentiles, benchmarks, or comparative rankings. The data to support them does not exist.
- No fabricated counts, logos, testimonials, or customer names.
- Prefer "simulation", "work" and "task" to "test", "quiz" or "exam" in user-facing copy.
- Empty means empty. A zero state says so rather than showing a plausible zero.

## Product truth boundaries
Fydell **may** say: the work trail is recorded and disclosed; the report cites the trail, the code and the tests; hidden tests run in an isolated sandbox; the candidate owns their receipt; the employer's team makes the decision.

Fydell **may not** say: that it predicts job performance; that it detects cheating or AI use; that scores are validated against outcomes; that it removes bias; that anything is "industry standard"; that the desktop app records anything outside the disclosed list.

## Anti-references
- Purple-on-white generic AI SaaS
- Proctoring and surveillance aesthetics (webcam grids, lockdown warnings, red flags)
- Gamified assessment platforms (badges, streaks, leaderboards, confetti)
- Centred hero with an eyebrow label, a coloured phrase inside the headline and floating decorative cards
- Dashboards that decorate rather than inform: sparklines with no series, gauges with no scale, cards that hold one number

## Constraints (do not break)
- Invite-only. There is no public simulation catalog and no self-serve unlock.
- The disclosed work trail is disclosed. Candidates are told what is recorded before they start, and the report contains nothing they were not told about.
- Real data only in real workspaces. Every number comes from the database. Marketing examples are labelled "Example".
- The employer decides. Fydell does not rank, reject or recommend.
- Row-level security is the authorization boundary. The service role key never serves a browser request.
- Legacy isolated systems (Wave 1 Data Analyst `/sim/[sessionId]` with WorkbenchRunner and v2 scoring; the `proof_*` graph) stay frozen per `.cursor/rules/simulation-engine.mdc`. They are not the product and must not be rewritten or mixed with the engineering ledger.
