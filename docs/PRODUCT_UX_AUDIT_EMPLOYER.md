# Fydell Product UX Audit: Employer, Reviewer, and Admin

Date: 2026-08-19

Scope: employer, reviewer, admin, and pilot surfaces. Candidate work and simulation UX are out of scope except where an employer-facing route exposes them.

## Audit method and verification limits

This audit combines:

- live Playwright inspection against `http://localhost:3000` running `dev:preview` at 1440 × 900
- route source, layouts, navigation components, redirects, and inbound-link searches
- `DESIGN.md`, `PRODUCT.md`, and `GRAPH_STATE.md`

The preview fixture rendered `Meridian Industrial Systems`, nine numbered candidates, two completed Data Analyst reports, and the legacy Northline evaluation. Those fixtures are useful for exposing information hierarchy and vocabulary defects. They are not evidence that production workspaces fabricate data.

Admin routes could not be inspected after authentication. Every tested `/admin/**` URL redirected to `/login?next=admin`; there was no admin account available. Admin findings therefore distinguish live reachability from source-verified behavior. Proof-graph decision briefs could not be live-inspected because `/app/employer/proof` returned zero ready candidates and exposed no run link. Its source was inspected.

The IDE browser could not create a tab in this session. The installed Playwright runtime was used against the same live preview server, including screenshots and rendered body text. No application code was changed.

## Executive verdict

Fydell currently exposes two products inside one shell:

1. a polished but explicitly disallowed assessment dashboard centered on Data Analyst evaluations, pipeline stages, reports, scores, percentages, and comparison
2. a thin Solutions Engineer proof graph centered on a shortlist and decision brief, but disconnected from the main employer flow and mostly inaccessible from real navigation

The first is canonical in routing and navigation. The second is directionally closer to the founder's product, but it is not yet a coherent product surface. The correction is not a copy pass. The information architecture, route ownership, status model, reviewer workflow, and default landing behavior must be rebuilt around the hiring decision.

## 1. Route inventory

### Employer and employer-adjacent routes

| Route | Current surface | User | Target mapping | Disposition | Justification |
|---|---|---|---|---|---|
| `/app` | Server redirect to `/app/employer` | Employer | Intelligent employer entry | REBUILD | It must resolve by active-role count, not blindly open a dashboard. |
| `/app/employer` | Operational home with attention queue, metric band, candidate pipeline, activity, and reports | Employer | No direct target concept | MERGE INTO `/app` | Keep one entry contract and replace the dashboard with role/decision routing. |
| `/dashboard` | Redirect to `/app/employer`; also covered by a permanent redirect | Legacy employer | None | DELETE | It is a redundant legacy name that keeps the dashboard mental model alive. |
| `/app/fde` | Redirect to `/app/candidate`; live request ended in a server error | Legacy candidate alias | None in this audit | DELETE | It is dead employer-era vocabulary and currently fails after redirect. |
| `/app/employer/candidates` | Invitation pipeline table with stage, result, score-bearing labels, and report links | Employer | Candidates and ready shortlist | REBUILD | Make this the canonical decision-oriented candidate list, not an applicant pipeline. |
| `/app/candidates` | Redirect to `/app/employer/candidates` | Employer alias | Candidates | MERGE INTO `/app/employer/candidates` | No inbound product links and no independent contract. |
| `/candidates` | Public redirect to `/product` | Public | Marketing product explanation | MERGE INTO `/product` | Footer links to a URL that only bounces; link directly to the real destination. |
| `/app/employer/reports` | Completed evaluation table with scores, evidence bands, filters, and comparison | Employer | Outcomes and decision briefs | RENAME TO `/app/employer/outcomes` | "Reports" is banned navigation; the current table also needs a content rebuild around outcomes. |
| `/app/reports` | Redirect to `/app/employer/reports` | Employer alias | Outcomes | MERGE INTO `/app/employer/outcomes` | Alias has no inbound links and preserves banned vocabulary. |
| `/app/employer/assessments` | Read-only Data Analyst evaluation detail and invitation counts | Employer | Role workspace and calibration | MERGE INTO `/app/employer/roles/[roleId]` | The employer buys a role and its work definition, not an assessment catalog. |
| `/app/templates` | Redirect to `/app/employer/assessments` | Employer alias | None | DELETE | "Templates" is explicitly banned and the route is unlinked. |
| `/app/simulations/new` | Redirect to `/app/employer/assessments` | Legacy employer | None | DELETE | Employers do not author tests; this stale builder URL has no target job. |
| `/app/employer/assessments/report/[sessionId]` | Legacy evidence report with score, performance, coverage, confidence, tabs, decision form, and oral-defense prompts | Employer | Decision brief | MERGE INTO `/app/employer/candidates/[candidateId]` | Preserve evidence underneath, but rebuild the default screen as a 60-second brief. |
| `/app/employer/cohort` | Cohort workspace; live preview showed "Could not load this cohort" | Employer | Candidates within a role | MERGE INTO `/app/employer/roles/[roleId]` | Cohort is implementation vocabulary and has no inbound link in the current product. |
| `/app/employer/compare` | Side-by-side report comparison; live preview failed to load | Employer | No required target concept | DELETE | Comparison encourages ranking and is not part of the decision-first flow. |
| `/app/employer/settings` | Workspace name/logo, account, retention, export, and responsibility | Employer | Settings and partial Company | KEEP | It is honest and useful, but company identity should be separated from account/system settings. |
| `/app/employer/proof` | Hardcoded Solutions Engineer shortlist plus invite form; live preview showed zero candidates and no empty-state guidance | Employer | Ready shortlist | MERGE INTO `/app/employer/candidates` | This is the right product direction in the wrong parallel branch. |
| `/app/employer/proof/calibration` | Five raw textareas with underscored field labels | Employer | Six-step role calibration | MERGE INTO `/app/employer/roles/[roleId]/calibration` | Replace the orphan form with Work, Technical requirements, Human requirements, Environment, Success, Review. |
| `/app/employer/proof/[runId]` | Source-verified decision brief, interview plan, evidence IDs, and aggregate outcome form | Employer | Decision brief, interview plan, outcome | MERGE INTO `/app/employer/candidates/[candidateId]` | It contains the target's seeds but must become the canonical candidate decision surface. |
| `/app/employer/workbench` | Employer-facing catalog of simulation scenarios across many roles | Employer/internal evaluator | Role work preview | DELETE | A generic simulation library makes software the product and exposes an unbounded catalog. Move QA access to internal tooling. |
| `/app/employer/workbench/[scenarioId]` | Full candidate workbench run under employer shell | Employer/internal evaluator | Optional role work preview | DELETE | Employers should not enter the candidate runtime from primary product navigation. |
| `/app/employer/workbench/[scenarioId]/analysis` | Engine observation/inference analysis for the employer's own test attempt | Employer/internal evaluator | Internal QA | DELETE | Engine diagnostics do not belong in the employer decision flow. |
| `/employers` | Public redirect to `/product` | Public employer | Marketing product explanation | MERGE INTO `/product` | Footer link currently adds a meaningless redirect hop. |
| `/roles` | Public redirect to `/simulations` | Public | Public evaluation explanation | MERGE INTO `/simulations` | It has no independent content and must not be confused with authenticated role management. |
| `/roles/[key]` | Public redirect to `/simulations` for every key | Public | None | DELETE | Every slug resolves to the same page, so the route implies a catalog that does not exist. |

### Admin and reviewer routes

| Route | Current surface | User | Target mapping | Disposition | Justification |
|---|---|---|---|---|---|
| `/admin` | Auth-aware redirect to overview or login | Admin | Admin entry | KEEP | A single protected admin entry is appropriate. |
| `/admin/overview` | Eight pilot/email metric cards and two activity panels | Admin | Operational overview | REBUILD | Required company, role, run, review, and failed-job counts are missing. |
| `/admin/pilot-requests` | Real inbound pilot-request table | Admin | Managed network intake | KEEP | This supports the manual pilot and uses database-backed rows. |
| `/admin/pilot-requests/[id]` | Request detail, actions, email delivery, timeline, notes | Admin | Managed network intake detail | KEEP | Manual operations are appropriate at pilot stage. |
| `/admin/organizations` | Workspace table | Admin | Active companies | RENAME TO `/admin/companies` | Match the product language and add role/run health. |
| `/admin/users` | Auth users, platform roles, and memberships | Admin | Access operations | KEEP | Necessary operational tooling, though secondary to delivery health. |
| `/admin/users/[id]` | Account, roles, memberships, invites, audit, and actions | Admin | Access operations detail | KEEP | Necessary for access recovery and audit. |
| `/admin/invitations` | Platform invitation tracking and actions | Admin | Access operations | KEEP | This is operational access tooling, not an employer ATS feature. |
| `/admin/repair` | Generic action selector including retry email and requeue report | Admin | Jobs and recovery | MERGE INTO `/admin/jobs` | Recovery should be contextual from a failed job row, not an ID-driven command form. |
| `/admin/email` | Outbox, delivery tabs, suppressions, and queue processing | Admin | Delivery operations | KEEP | Real queue and failure handling belong in admin. |
| `/admin/audit` | Append-only operational event table | Admin | Audit | KEEP | Useful and appropriately utilitarian. |
| `/admin/shadow` | Legacy decision-lock/reveal audit over `fde_missions` | Admin | None in target proof graph | DELETE | It is Wave 1 experiment residue and splits the operating model. |
| `/admin/proof` | Flat list of proof runs with status | Reviewer/admin | Review queue | RENAME TO `/admin/reviews` | Keep the destination but rebuild it as a prioritized review queue. |
| `/admin/proof/[runId]` | Per-run claims with event IDs and Approve/Reject buttons | Reviewer/admin | Per-claim review | RENAME TO `/admin/reviews/[runId]` | Route is directionally correct but the interaction contract is incomplete. |
| `/admin/pilot-feedback` | Research feedback explorer | Admin/research | Pilot research | KEEP | Useful internal evidence, but it is currently orphaned from admin navigation. |
| `/admin/settings` | Environment-presence checks and email counts | Admin | System settings | KEEP | Appropriate internal configuration health. |
| `/admin/settings/security` | MFA documentation and environment state | Admin | Security settings | MERGE INTO `/admin/settings` | It is one system-settings section, not a primary destination. |
| `/admin/forbidden` | Access-restricted message | Unauthorized admin | Authorization boundary | KEEP | Clear failure state for signed-in non-admins. |

### Pilot routes

| Route | Current surface | User | Target mapping | Disposition | Justification |
|---|---|---|---|---|---|
| `/pilot` | Public five-minute simulation testing introduction | Tester | Internal research only | DELETE | Publicly opens a test catalog flow and uses score framing. |
| `/pilot/profile` | Optional tester profile and perspective | Tester | Internal research only | DELETE | Keep research tooling outside the shipped product surface. |
| `/pilot/roles` | Public six-role simulation catalog | Tester | None | DELETE | Directly violates invite-only and no-public-catalog constraints. |
| `/pilot/feedback` | Public multi-role feedback form | Tester | Internal research only | DELETE | It is useful research infrastructure but not product navigation. |
| `/pilot/thanks` | Research completion and rerun links | Tester | Internal research only | DELETE | It loops users back into the forbidden public role catalog. |

## 2. Severity-ranked defects

### 1. The canonical employer product is still an assessment dashboard

SCREEN
`/app`, `/app/employer`, and `EmployerShell`

PROBLEM
The default route opens a Home dashboard with attention queues, four metric cells, a pipeline, activity, reports, and global "Invite candidate." Navigation leads with Home, Evaluations, Simulations, Candidates, Reports, and Shortlist. It does not lead with Roles, Candidates, Outcomes, Company, Settings.

USER COST
An employer must translate operational assessment software into a hiring decision. Fydell presents itself as a system to manage evaluations rather than a network returning people worth interviewing.

SEVERITY 5

WHY IT EXISTS
This is deliberate legacy Wave 1 product architecture, not a styling accident. Comments and route contracts explicitly describe an employer console organized around evaluations, simulations, reports, and pipeline operations.

SYSTEMIC FIX
Make `/app` the only employer entry contract. Resolve by active-role count, reduce navigation to Roles, Candidates, Outcomes, Company, Settings, and remove the dashboard as a destination.

### 2. The product has two disconnected truth models

SCREEN
`/app/employer/**` legacy surfaces versus `/app/employer/proof/**`

PROBLEM
The polished, linked product is Data Analyst/Northline and score-based. The Solutions Engineer proof graph has the right nouns but lives in a separate Shortlist branch, fetches from separate APIs, uses a different visual vocabulary, and showed zero candidates in the preview.

USER COST
Employers cannot follow one continuous Company → Role → Calibration → Candidates → Ready shortlist → Decision brief → Interview → Outcome story. Data and actions appear to belong to different products.

SEVERITY 5

WHY IT EXISTS
`PRODUCT.md` and `GRAPH_STATE.md` intentionally isolate Wave 1 and the proof graph to protect production paths. That safe engineering choice leaked into product information architecture instead of being hidden behind one coherent experience.

SYSTEMIC FIX
Preserve backend isolation, but create one employer read model and one route hierarchy. The UI must not expose which evidence engine or table family produced the decision.

### 3. Numeric scores and percentages are treated as hiring truth

SCREEN
`/app/employer/candidates`, `/app/employer/reports`, `/app/employer/compare`, `/app/employer/assessments/report/[sessionId]`

PROBLEM
The live preview displayed `78/100`, `61/100`, a Score column, Performance 78, Coverage 82%, Confidence 74%, and per-competency percentages. The report says the numbers are not rankings while visually making them the most scannable facts.

USER COST
Hiring teams anchor on unsupported precision and collapse nuanced evidence into ranking. This creates exactly the "Fydell Score" product the founder rejected.

SEVERITY 5

WHY IT EXISTS
The legacy v2 scoring model is intentionally still live. The UI attempted to disclaim the numbers instead of preventing employer interpretation.

SYSTEMIC FIX
Remove all employer-facing numeric performance, coverage, confidence, and comparison values. Translate evidence to Strong, Moderate, Limited, Contradictory, or Not observed, independently from recommendation.

### 4. No canonical role workspace or role lifecycle exists

SCREEN
`/app`, `/app/employer/assessments`, `/app/employer/proof/calibration`

PROBLEM
There is no authenticated Roles destination, no role list, no role detail, and no Draft/Calibrating/Ready/Hiring/Paused/Closed lifecycle. The main app exposes a maintained Data Analyst evaluation while the proof branch hardcodes Solutions Engineer.

USER COST
An employer cannot answer what role Fydell is managing, whether it is calibrated, or what must happen before candidates can be evaluated.

SEVERITY 5

WHY IT EXISTS
Wave 1 is evaluation-led and the proof graph explicitly marks role calibration `NOT_STARTED`. The UI filled that domain gap with an assessment catalog.

SYSTEMIC FIX
Build Roles as the root employer object, with exact statuses and one role workspace that contains calibration, candidates, shortlist readiness, and outcomes.

### 5. The decision brief is not the canonical report

SCREEN
`/app/employer/assessments/report/[sessionId]` and `/app/employer/proof/[runId]`

PROBLEM
The linked report opens with performance metrics and competency cards before the employer sees a concise recommendation, uncertainties, and interview probes. The source-only proof brief is closer, but is reached only through the separate Shortlist branch and reveals raw event IDs as "Full evidence."

USER COST
The hiring manager cannot make a 60-second decision. They must interpret analysis internals, percentages, tabs, and event identifiers.

SEVERITY 5

WHY IT EXISTS
The legacy report was designed as an inspectable scoring report. The proof brief was added as a walking skeleton rather than replacing the legacy decision surface.

SYSTEMIC FIX
Make the candidate detail route a decision brief ordered Recommendation → Why → Uncertainties → What to ask → View evidence. Claim expansion must show What happened, supporting evidence, counterevidence, and unknowns in plain language.

### 6. Reviewer publication is not supported by a real review workflow

SCREEN
`/admin/proof` and `/admin/proof/[runId]`

PROBLEM
The queue is a flat run list. Per-claim review shows truncated event IDs and only Approve/Reject. The required Edit, Downgrade confidence, Add counterevidence, Mark insufficient, and Remove actions do not exist. The reason sent by the UI is hardcoded to `"founder review"`. Publish and Shortlist are always rendered.

USER COST
Reviewers cannot inspect or correct a claim responsibly without database context, and the audit trail cannot explain material edits. A published brief may look human-reviewed without a usable human review process.

SEVERITY 5

WHY IT EXISTS
`GRAPH_STATE.md` describes this as a minimal walking-skeleton gate. The UI proves an endpoint can be called; it was not designed as reviewer tooling.

SYSTEMIC FIX
Build a prioritized review queue and full per-claim review contract with human-readable evidence, required reasons for material changes, completion state per required claim, and visibly gated publication.

### 7. Employer statuses violate the exact vocabulary and expose engine states

SCREEN
`/app/employer`, `/app/employer/candidates`, `/app/employer/reports`, decision forms

PROBLEM
Observed labels include Opened the invitation, Consented not started, Working on it, Scoring, Report ready, Accepted, Submitted, Expired, Needs review, Advance, Decline, and Needs further evidence. These do not map to the required Invited, In progress, Under review, Ready, Interviewing, Offer, Hired, Closed model.

USER COST
The same candidate appears to have multiple incompatible states. Employers must learn implementation details and cannot scan a role consistently.

SEVERITY 5

WHY IT EXISTS
Invitation, session, analysis, and decision records were each surfaced with their local database vocabulary instead of being normalized into one employer-facing state machine.

SYSTEMIC FIX
Create one server-side employer status projection with exactly eight allowed labels. Keep delivery failures as secondary exceptions, not additional lifecycle states.

### 8. A public multi-role assessment catalog contradicts the product truth boundary

SCREEN
`/pilot`, `/pilot/roles`, `/pilot/feedback`, `/pilot/thanks`

PROBLEM
Unauthenticated users can browse six roles and launch recommended five-minute simulations. The intro says "perfect score," and the flow invites another role after completion.

USER COST
The market can reasonably conclude Fydell is a self-serve assessment library, directly undermining the managed talent-network positioning.

SEVERITY 5

WHY IT EXISTS
This is deliberate product-research infrastructure left on public routes. It optimizes tester throughput, not product truth.

SYSTEMIC FIX
Remove these routes from the shipped public surface. If research continues, put it behind internal access or one-off signed invitations with no catalog.

### 9. Ready shortlist and Outcomes do not exist as integrated product stages

SCREEN
Employer navigation and `/app/employer/proof`

PROBLEM
Shortlist is a separate proof page with an invite form and zero-result blank state. Outcomes has no route or navigation item. Legacy Reports remains the main completed-work destination.

USER COST
Employers cannot move from "who is ready" to "who should I meet" to "what happened after the interview" in one flow.

SEVERITY 5

WHY IT EXISTS
`GRAPH_STATE.md` explicitly marks Shortlist and Outcomes `NOT_STARTED`; the proof page only demonstrates a database branch.

SYSTEMIC FIX
Put readiness and recommendations in Candidates, add Outcomes as the third primary destination, and persist interview/offer/hire outcomes against the same role and candidate record.

### 10. Role calibration is an orphan raw form, not a guided workspace

SCREEN
`/app/employer/proof/calibration`

PROBLEM
The route contains five blank textareas labeled with raw keys such as `common tasks` and `top performer`. It has no inbound link, step structure, progress contract, review summary, loading state, or error state.

USER COST
An employer cannot turn a real role into observable work criteria with confidence, and may never discover the route.

SEVERITY 4

WHY IT EXISTS
It is a thin API exerciser built for the proof graph before role calibration was implemented.

SYSTEMIC FIX
Replace it with the six exact stages: Work, Technical requirements, Human requirements, Environment, Success, Review. Save per step, show unresolved questions, and publish only from Review.

### 11. Admin does not expose delivery health for the proof product

SCREEN
`/admin/overview`, `/admin/repair`, `/admin/proof`

PROBLEM
The overview centers eight pilot-request and email metric cards. It lacks active companies, active roles, runs in progress, awaiting analysis, awaiting review, and failed jobs. There is no jobs table with retry and no dedicated errors view.

USER COST
Operators cannot see a stuck proof run before the customer reports it. Recovery requires knowing internal IDs and choosing a generic repair command.

SEVERITY 4

WHY IT EXISTS
Admin was built around pilot intake and email operations before the proof graph had durable, trusted job telemetry.

SYSTEMIC FIX
Rebuild the overview around real proof delivery counts. Add Jobs and Errors destinations, contextual retry, last error, attempt count, owner company/role, and timestamps.

### 12. The product story and fixture continuity conflict

SCREEN
All employer preview routes

PROBLEM
The canonical preview company is Meridian Industrial Systems, the main role is Data Analyst, and the scenario is Northline Components with named stakeholder Jordan Hale. The workbench separately includes "Northstar Health" and "Acme Cloud." The specified story is company Northstar, role Solutions Engineer, customer Acme.

USER COST
Reviewers and prospects cannot tell which product is real, and cross-screen evidence appears unrelated.

SEVERITY 4

WHY IT EXISTS
Multiple generations of fixtures were retained: Wave 1 Northline, proof-graph Solutions Engineer, and broad simulation-engine scenarios.

SYSTEMIC FIX
Use one canonical demonstration graph across marketing and employer product: Northstar → Solutions Engineer role → Acme customer work → Candidate 1, Candidate 2. Keep invented human candidate names out. Named non-candidate stakeholders should be explicitly identified as scenario personas or replaced if the founder intends the no-name rule to cover all humans.

### 13. Primary navigation contains banned product categories and too many mental models

SCREEN
`EmployerShell`

PROBLEM
The rail exposes Home, Evaluations, Simulations, Candidates, Reports, Shortlist, and Settings under Evaluate/Evidence groupings. It omits Roles, Outcomes, and Company.

USER COST
Every destination asks the employer to understand Fydell's internal workflow rather than the hiring decision. Reports and Assessments reframe the product as generic HR SaaS.

SEVERITY 4

WHY IT EXISTS
Navigation was deliberately grouped to organize six existing destinations, instead of questioning whether those destinations should exist.

SYSTEMIC FIX
Replace the rail with the exact five destinations. Make calibration, evidence, interview plans, and invites contextual actions inside a role or candidate.

### 14. Several linked or retained routes fail, are orphaned, or only bounce

SCREEN
`/app/fde`, `/app/employer/cohort`, `/app/employer/compare`, `/candidates`, `/employers`, `/roles/**`, alias routes

PROBLEM
Live preview produced a server error after `/app/fde`, load failures on Cohort and Compare, and redirect-only public destinations. Cohort and calibration have no inbound links. Several alias files duplicate redirects already represented elsewhere.

USER COST
Users encounter broken or meaningless destinations, while maintainers cannot tell which route is authoritative.

SEVERITY 4

WHY IT EXISTS
Route retirement happened incrementally through page redirects and `next.config.ts`, but dead files and contextual prototypes were not removed from the route graph.

SYSTEMIC FIX
Apply the route dispositions in this audit, add redirect tests for the small approved legacy set, and fail CI when a shipped page has no declared owner or inbound path.

### 15. Loading, empty, and error contracts are inconsistent in the new proof branch

SCREEN
`/app/employer/proof`, `/app/employer/proof/calibration`, `/app/employer/proof/[runId]`

PROBLEM
The shortlist initially renders zero ready candidates while fetching, has no failure handling, and collapses to an invite form when empty. Calibration renders blank fields during load and ignores fetch failures. A non-published brief is plain text with no next action.

USER COST
Employers cannot distinguish "no candidates," "still loading," "not authorized," and "the service failed." They may invite duplicate candidates or assume the shortlist is empty.

SEVERITY 4

WHY IT EXISTS
These are API walking-skeleton clients, not hardened product screens.

SYSTEMIC FIX
Adopt explicit server-rendered loading, honest empty, recoverable error, and permission states for every role, shortlist, brief, review, and outcome screen.

### 16. Evidence language remains internally inconsistent

SCREEN
Legacy reports, proof briefs, comparison, and settings

PROBLEM
Observed evidence labels include Strong evidence, Clear evidence, Mixed evidence, Established evidence, Developing evidence, Some evidence, and Insufficient evidence. Settings still says "scores." Proof uses direction/confidence strings and raw event IDs.

USER COST
Employers cannot compare claims consistently and may infer differences that are only vocabulary drift.

SEVERITY 4

WHY IT EXISTS
Wave 1 bands, v2 competencies, and proof-graph claim direction/confidence each brought separate labels.

SYSTEMIC FIX
Normalize every employer-facing claim to Strong evidence, Moderate evidence, Limited evidence, Contradictory evidence, or Not observed. Keep recommendation vocabulary separate and exact.

## 3. Duplication map and reachability

### Home surfaces

| Route | What actually reaches it | Live behavior | Verdict |
|---|---|---|---|
| `/app` | Post-login defaults, safe-next allowlist, auth callbacks, and direct URL | Redirects to `/app/employer` | Canonical URL, but must be rebuilt as the intelligent resolver. |
| `/app/employer` | Employer rail Home link, mobile brand link, login default, signup, onboarding, auth resolution, many legacy redirects | Renders legacy operational dashboard | Temporary implementation only. Merge into `/app`; do not retain a separate Home product. |
| `/dashboard` | Legacy URLs and direct access; `next.config.ts` has `/dashboard/:path*`; page also redirects | Redirects to `/app/employer` | Dead. Keep one migration redirect if external links require it, then remove the page file. |
| `/app/fde` | Direct/legacy access; `next.config.ts` redirects `/app/fde/:path*`; page redirects too | Ended at `/app/candidate` with HTTP 500 in preview | Dead and broken. Candidate audit owns the destination, but this alias should be removed. |

Canonical verdict: `/app` is the only employer home contract. It must not render a dashboard. It resolves to role creation, active-role selection, or the single active role.

### Candidate lists

| Route | What actually reaches it | Live behavior | Verdict |
|---|---|---|---|
| `/app/employer/candidates` | Employer rail, home metric/pipeline/attention links, report empty state | Renders the nine-row invitation pipeline | Canonical route, but rebuild around exact statuses and decision readiness. |
| `/app/candidates` | No product inbound link found | Redirects to `/app/employer/candidates` | Dead alias. Merge into canonical route. |
| `/candidates` | Public SiteFooter "For candidates" link | Redirects to `/product` | Not a candidate list at all. Replace footer href with `/product` and remove route. |

Canonical verdict: `/app/employer/candidates` is the sole employer candidate list. Ready recommendations belong here; proof Shortlist must not remain a parallel list.

### Reports, assessments, templates, and simulations

- `/app/employer/reports` is linked from the rail, home, candidate pipeline, report detail, compare, and empty states. It is currently canonical, but its concept must become Outcomes.
- `/app/reports` has no inbound product link and only redirects.
- `/app/templates` has no inbound product link and redirects to Assessments. It preserves explicitly banned vocabulary.
- `/app/simulations/new` has no inbound product link and redirects to Assessments.
- `/app/employer/assessments` is linked from the rail and onboarding setup path.
- `/app/employer/workbench` is linked from the rail and links to its scenario and analysis children.
- `/app/employer/cohort` has no inbound link in `src`; its own source comment claims Evaluations reaches it, but no such link exists.
- `/app/employer/compare` is reachable from Reports when two same-evaluation reports exist and from Cohort source.
- `/app/employer/proof` is linked as Shortlist in the rail.
- `/app/employer/proof/calibration` has no inbound link.
- `/app/employer/proof/[runId]` is reachable only from a ready/published row on the proof shortlist.

Canonical verdict: Roles owns role definition, calibration, and work preview. Candidates owns shortlist and decision briefs. Outcomes owns post-interview state. Assessments, Templates, Reports, Simulations, Compare, Cohort, and Shortlist must not remain peer destinations.

### Public employer aliases

- `SiteFooter` links "For employers" to `/employers` and "For candidates" to `/candidates`.
- Both routes only redirect to `/product`.
- `/roles` and `/roles/[key]` redirect to `/simulations`; no inbound public link to `/roles` was found.

Verdict: link directly to the canonical marketing destinations and remove bounce routes. Do not let public `/roles/**` imply a role catalog.

### Admin and reviewer reachability

- `/admin` is the entry and redirects signed-out users to `/login?next=admin`.
- `AdminShell` links Overview, Pilot requests, Organizations, Users, Invitations, Repair console, Email center, Audit log, Shadow-pilot audit, Proof review, Settings, and Security.
- `/admin/proof/[runId]` is linked from `/admin/proof`.
- `/admin/pilot-feedback` is not present in `AdminShell`; it is an orphaned admin page.
- Every admin route tested live redirected to login. No post-auth rendering was verified.

Canonical verdict: retain one admin shell, rename Proof review to Reviews, add Jobs and Errors, and remove Shadow. Pilot feedback should either be deliberately linked under Research or removed from the product route graph.

### Redirect implementation finding

Route retirement is split between `next.config.ts` and redirect-only page components. `/dashboard` and `/app/fde` are represented in both layers. `/app/candidates`, `/app/reports`, `/app/templates`, `/app/simulations/new`, `/candidates`, `/employers`, and `/roles/**` are page-level aliases. This accretion obscures canonical ownership. Use one documented redirect registry for true external legacy URLs; delete internal aliases with no inbound traffic.

## 4. Gap list

The following target concepts have no complete implementation:

1. Intelligent `/app` role-count resolver.
2. Authenticated Roles list.
3. Role creation onboarding for an empty workspace.
4. Role detail workspace.
5. Exact role lifecycle: Draft, Calibrating, Ready, Hiring, Paused, Closed.
6. Six-step role calibration: Work, Technical requirements, Human requirements, Environment, Success, Review.
7. Company destination separate from personal/system Settings.
8. One normalized employer candidate status projection using exactly eight states.
9. Integrated ready shortlist within Candidates.
10. Exact recommendation states: Strong Interview, Interview, Hold, Insufficient Evidence.
11. Employer evidence vocabulary normalized to Strong, Moderate, Limited, Contradictory, Not observed.
12. Canonical 60-second decision brief.
13. Plain-language expandable claim trail: Claim → What happened → Supporting evidence → Counterevidence → What remains unknown.
14. Separate interview plan as a first-class screen or mode.
15. Per-probe interview outcomes: Confirmed, Contradicted, Still unclear, Not asked.
16. Outcomes destination and role-level outcome history.
17. Reviewer queue prioritized by readiness, age, and failure state.
18. Reviewer edit action with required reason.
19. Reviewer confidence downgrade action.
20. Reviewer counterevidence action.
21. Reviewer Mark insufficient action.
22. Reviewer Remove action.
23. Reviewer-readable supporting events and counterevidence without database IDs.
24. Visible all-required-claims-reviewed publish gate.
25. Admin active-role count.
26. Admin runs-in-progress count.
27. Admin awaiting-analysis count.
28. Admin awaiting-review count.
29. Admin failed-jobs count.
30. Admin jobs table with contextual retry.
31. Admin errors view.
32. Continuous Northstar → Solutions Engineer → Acme demonstration graph across marketing and product.
33. Explicit loading/error/empty contracts for proof shortlist, calibration, review, and brief publication.
34. Product analytics instrumentation for the employer decision loop. No relevant event instrumentation was found in the audited screens.

Partially implemented but not complete:

- The proof brief has recommendation, why, strengths, concerns, probes, interview-plan groups, and an aggregate outcome form.
- The legacy report has supporting evidence and counterevidence, but puts numeric scoring first and does not use the target claim expansion contract.
- Admin proof APIs may enforce some publication constraints, but the reviewer UI does not make the gate understandable or operable.

## 5. Screen contracts

### Screen contract A: Role workspace

Canonical route: `/app/employer/roles/[roleId]`

USER
Workspace owner or hiring manager responsible for a specific open role.

JOB TO BE DONE
Understand whether the role is ready for candidate work, see who is moving through it, and take the next decision-relevant action.

ENTRY CONDITIONS
Signed-in member of the company workspace; role exists and belongs to that company. `/app` routes here automatically when exactly one active role exists.

PRIMARY INFORMATION
Role title; exact role status; calibration readiness; unresolved calibration questions; counts by exact candidate state; ready shortlist preview; most urgent uncertainty or blocked run.

PRIMARY ACTION
Depends on state: Continue calibration, Invite candidate, Review ready candidates, or Record interview outcome.

SECONDARY ACTION
Pause/close role, edit company context, preview the work definition, or view all candidates.

EMPTY STATE
For a newly created role: explain that no candidates can start until Review is approved, show the first incomplete calibration step, and offer Continue calibration. Never show zero metric cards.

LOADING STATE
Server-render stable shell with skeleton rows for role summary and candidate list; do not render fake zero counts.

ERROR STATE
State whether the role could not be loaded, whether retry is safe, and provide Back to Roles. Authorization failure must not reveal role existence.

EXIT
Candidates for this role, role calibration, candidate decision brief, Outcomes, or Roles list.

ANALYTICS EVENTS
`role_workspace_viewed`, `role_calibration_continued`, `candidate_invite_started`, `ready_shortlist_opened`, `role_status_changed`. Properties: role ID, role status, counts by normalized state, entry route. Never send candidate names, emails, free-text calibration answers, or evidence content.

### Screen contract B: Candidates and ready shortlist

Canonical route: `/app/employer/candidates`

USER
Hiring manager deciding who deserves interview time.

JOB TO BE DONE
See who is ready, who Fydell recommends interviewing, why at a glance, and who still lacks enough evidence.

ENTRY CONDITIONS
Signed-in company member; at least one role exists. Optional role filter when multiple active roles exist.

PRIMARY INFORMATION
Default ready-first grouping; Candidate number; role; exact employer status; exact recommendation; up to three concise reasons; highest-priority uncertainty; last meaningful state change. Non-ready candidates follow in a secondary section.

PRIMARY ACTION
Open decision brief.

SECONDARY ACTION
Invite candidate, filter by role/status, or open the role workspace.

EMPTY STATE
If no candidates: "No candidates yet" plus Invite candidate in the context of a selected ready role. If candidates exist but none are ready: say who is in progress or under review and what happens next. Do not imply a negative recommendation.

LOADING STATE
Skeleton list preserving ready and in-progress group headings; no temporary "0 ready" text.

ERROR STATE
Explain that candidate status could not be loaded, retain selected role filter, and offer Retry. Do not fall back to stale scores.

EXIT
Decision brief, role workspace, invite flow, or Outcomes.

ANALYTICS EVENTS
`candidate_list_viewed`, `candidate_filter_changed`, `candidate_brief_opened`, `candidate_invite_started`. Properties: role ID, normalized status, recommendation, list section, position. No candidate PII in analytics.

### Screen contract C: Candidate decision brief

Canonical route: `/app/employer/candidates/[candidateId]`

USER
Hiring manager preparing to decide whether to interview a candidate.

JOB TO BE DONE
Reach a defensible interview decision in 60 seconds, understand uncertainty, and leave with specific probes.

ENTRY CONDITIONS
Candidate belongs to the company and has a published human-reviewed brief. If review is incomplete, show Under review rather than a partial brief.

PRIMARY INFORMATION
Candidate number and role; exact recommendation; approximately three reasons to interview or hold; uncertainties; approximately three interview probes. Evidence is collapsed by default.

PRIMARY ACTION
Open interview plan or mark Interviewing.

SECONDARY ACTION
View evidence, return to ready candidates, or place on Hold.

EMPTY STATE
If evidence is insufficient, use recommendation `Insufficient Evidence`, state what was not observed, and identify whether another work sample or interview probe could resolve it. Do not manufacture reasons.

LOADING STATE
Skeleton matching the final order: recommendation, reasons, uncertainties, probes. Evidence sections remain collapsed.

ERROR STATE
Explain whether the brief is unavailable, still under review, or failed to load. Offer Retry and Back to Candidates. Never expose JSON, job errors, or event IDs to employers.

EXIT
Interview plan, Candidates, role workspace, or Outcomes after the interview.

ANALYTICS EVENTS
`decision_brief_viewed`, `evidence_claim_expanded`, `interview_plan_opened`, `candidate_status_changed`, `interview_probe_outcome_recorded`, `hiring_outcome_recorded`. Properties: candidate opaque ID, role ID, recommendation, claim ID, probe category, normalized outcome. Never send claim text, notes, emails, or evidence excerpts.

## 6. The 15-second gate

Verdict: **FAIL**

Observed starting point: visiting `/app` redirected to `/app/employer` and rendered the Meridian Industrial Systems Home dashboard.

| Question | Pass/fail | Live evidence |
|---|---|---|
| What role am I hiring for? | FAIL | The page header named the company, not the role. The role appeared only indirectly in Evaluations and elsewhere as Data Analyst, while Shortlist separately said Solutions Engineer. |
| Who is ready? | FAIL | Home showed Candidate 6 as "Report ready" inside an attention queue and two "Reports ready" in a metric band, but no ready shortlist or ready-for-interview grouping. |
| Who should I interview? | FAIL | No recommendation appeared on the default screen. The employer had to navigate to Reports, open a candidate, and interpret "Evidence supports advancing this candidate." |
| Why? | FAIL | The default screen contained operational reasons for queue placement, not reasons to interview. Interview evidence required opening a report. |
| What is uncertain? | FAIL | No candidate uncertainty appeared on the default screen or report list. It was buried in detailed report evidence/counterevidence or the inaccessible proof brief. |

The screen is scannable and operationally tidy, but it answers "what is happening in the assessment system?" rather than "who should I meet and what should I investigate?" That is the founder's hard-fail condition.

## Canonical product cut

Keep as primary employer navigation:

1. Roles
2. Candidates
3. Outcomes
4. Company
5. Settings

Canonical routes:

- `/app` — intelligent resolver only
- `/app/employer/roles`
- `/app/employer/roles/[roleId]`
- `/app/employer/roles/[roleId]/calibration`
- `/app/employer/candidates`
- `/app/employer/candidates/[candidateId]`
- `/app/employer/candidates/[candidateId]/interview`
- `/app/employer/outcomes`
- `/app/employer/company`
- `/app/employer/settings`
- `/admin/overview`
- `/admin/reviews`
- `/admin/reviews/[runId]`
- `/admin/jobs`
- `/admin/errors`

Everything else should be contextual, internal, or retired. Backend isolation between Wave 1 and the proof graph can remain. Product isolation cannot.
