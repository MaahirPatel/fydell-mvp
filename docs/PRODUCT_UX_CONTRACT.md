# Fydell Product UX Contract

This document locks what the product is for. It is upstream of the screen
inventory, the UX graph, and every implementation sprint. When a design decision
and this contract disagree, this contract wins, or it gets amended deliberately
and in writing.

It exists because the product drifted once already. The employer surface became
a dashboard, the route tree grew four competing home pages and three candidate
lists, and two routes shipped under the names `assessments` and `templates`. None
of that was decided. It accumulated, one reasonable-looking page at a time.

---

## 1. What Fydell sells

**People worth interviewing.** Not seats in assessment software.

An employer gives Fydell a real role. Candidates do realistic work. Material
information changes while they are working. Fydell observes what they change and
what they preserve, makes them defend the decisions that mattered, converts the
work into evidence, has a human review that evidence, and returns a very small
number of people worth meeting along with exactly what to investigate next.

The unit of value is a **decision the employer can act on in sixty seconds**,
with the evidence sitting underneath it if they want to check.

---

## 2. The four jobs

### Employer

> Give Fydell an open role and quickly understand which candidates are worth
> meeting and why.

### Candidate

> Understand the opportunity, demonstrate how I actually work, and keep verified
> evidence I can reuse.

### Fydell reviewer

> Verify that every published claim is actually supported by candidate behaviour.

### Admin

> Ensure every active role, run, analysis job, review, and outcome is operating
> correctly.

---

## 3. Principles

### P1. Decision first

The employer lands on the hiring decision in front of them. The candidate lands
on the opportunity or the work in front of them. Neither lands on a dashboard.

A dashboard is what you build when you do not know what the user came to do. We
know what they came to do.

### P2. Compression first, evidence underneath

The default employer reading order is recommendation, then why, then what remains
uncertain, then what to ask. Evidence is one deliberate click away and is never
the landing state. Nobody is made to read a log.

### P3. Work, not testing

The candidate must feel they are doing the job. Anything that reads as an exam is
a defect: question counters, multiple choice, aptitude games, personality
inventories, school-test visual language.

### P4. Evidence, not scoring

There is no Fydell Score. There are no per-trait numbers, no percentage match, no
ranking across candidates.

Evidence strength is one of: **Strong**, **Moderate**, **Limited**,
**Contradictory**, **Not observed**.

A recommendation is one of: **Strong Interview**, **Interview**, **Hold**,
**Insufficient Evidence**.

There is no automatic reject. A human decides who to reject, and Fydell does not
pretend otherwise.

### P5. Unknown is a valid, first-class result

Fydell must be able to say it did not observe enough to judge. `Insufficient
Evidence` is a real outcome, not an error state, and it appears in the product
rather than being smoothed away.

Every claim carries what supports it, what argues against it, and what remains
unknown. A product that only produces good news is an advertisement.

### P6. Not an ATS

Out of scope, deliberately: applicant funnels, HRIS, payroll, interview
scheduling, onboarding systems, resume databases, employee directories, generic
CRM, global search, command palettes.

If a workflow is manually manageable during the pilot, it stays manual. Manual is
not technical debt at this stage. It is the correct amount of product.

### P7. Candidate dignity

The evaluation is an opportunity to demonstrate ability, not surveillance.
Integrity signals are background evidence for reviewers, never an accusation
shown to a candidate.

### P8. Real empty states

No fake candidates, companies, activity, charts, or improvement percentages. An
honest empty state that names the next action beats a populated screen that lies.

---

## 4. Two objects that must never merge

This distinction is load-bearing and is the easiest thing to get wrong, because
the two are generated from the same run.

| | **Decision Brief** | **Work Receipt** |
|---|---|---|
| Belongs to | The employer | The candidate |
| Answers | Should I interview this person for *this* role? | What did I verifiably demonstrate? |
| Scope | Role-specific interpretation | Portable, role-family level |
| Contains | Recommendation, reasons, uncertainties, interview probes | Work completed, demonstrated evidence, limitations, verification |
| Never contains | — | Employer-private notes, internal ranking, interview feedback, integrity telemetry |

A Work Receipt is a **verified record of specific work and what it demonstrated**.
It is not a badge, a score, a certificate, or a résumé replacement. Its
**limitations** section is not a disclaimer to be minimised; it is the reason
anyone would trust the rest of it.

Reusing the employer report as the candidate receipt would be the single clearest
sign we have lost the plot.

---

## 5. Navigation, deliberately small

**Employer:** Roles, Candidates, Outcomes, then Company, Settings.

**Candidate:** Opportunities, Work Receipts, Profile. During an active run,
navigation is hidden so the work is the only thing on screen.

**Reviewer:** Review queue, Runs, Roles.

**Admin:** Companies, Roles, Runs, Reviews, Outcomes, Jobs, Errors. Admin may be
utilitarian; employer and candidate must be premium.

Banned from navigation unless proven necessary by real use: Analytics, Messages,
Automations, Templates, Assessments, Question Library, Integrations, People,
Employees, Reports.

`/app` resolves intelligently. One active role opens that role. Several roles show
the roles list. No roles starts role creation. It never resolves to an analytics
page.

---

## 6. One vocabulary

Synonyms for the same state are a bug.

**Role:** Draft, Calibrating, Ready, Hiring, Paused, Closed.

**Candidate, employer-facing:** Invited, In progress, Under review, Ready,
Interviewing, Offer, Hired, Closed.

**Candidate, candidate-facing:** Invited, Started, Submitted, Under review,
Verified.

Enum values are never rendered to a user. `INSUFFICIENT_EVIDENCE` is a database
value; "Insufficient evidence" is a product.

Banned words: AI-powered, seamless, powerful, revolutionary, smart insights,
unlock, supercharge, next-generation, talent intelligence. No em dashes in
user-facing copy.

---

## 7. Continuity

One story across marketing, product, and demo data: **Northstar** hiring a
**Solutions Engineer**, with **Acme** as the customer and a mid-run authentication
security review as the constraint that changes.

Candidates in any non-production data are labelled `Candidate 1`, `Candidate 2`,
and so on. Invented human names read as synthetic and have already been rejected
once.

---

## 8. Gates

A screen is not done because it renders. It is done when the user can do the job.

**Employer, within fifteen seconds of opening Fydell:** What role am I hiring for?
Who is ready? Who should I interview? Why? What is uncertain?

**Candidate, before starting:** What job is this for? What am I about to do? How
long will it take? What will be recorded? What does the employer receive? What do
I get afterward?

**Candidate, during the run:** What is my objective? What information do I have?
Where do I do the work? Who can I talk to? Has my work saved? How much time
remains?

**Work Receipt, within twenty seconds:** What work did I complete? What did Fydell
verify? What did Fydell *not* verify? Can I share this?

**Reviewer:** What is the claim? What supports it? What contradicts it? What
rubric applies? What did the model infer? What can I change? All without database
tooling.

Failing a gate blocks the sprint. It does not get noted and deferred.

---

## 9. The question that settles arguments

> Is anything on this screen here only because SaaS apps normally have it?

If yes, remove it.
