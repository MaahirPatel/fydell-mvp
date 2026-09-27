# Fydell paid-customer product release checklist
Version: 2026-09-27. Owner: Maahir; assign individual owners during repository audit.

## Purpose and current status

Deliver an easy-to-use, dependable workflow that helps a hiring team review real engineering evidence with less work. This is an acceptance plan, not a claim that the product is implemented or that passing the list guarantees sales.

**Current implementation status: UNVERIFIED for every row.** Screenshots demonstrate appearance only. No repository, deployed API, database policy, evaluator or payment integration has been audited in this task. The supplied Stripe screenshot is a layout reference, not evidence that Fydell billing works.

Approved workflow: candidate-selected public GitHub projects → source-linked Engineering Passport; employer role and invitation → versioned starter project → local VS Code/Cursor work alongside Fydell team thread and issue updates → project ZIP plus handoff → isolated trusted evaluation plus evidence-grounded review → concise employer report and human decision. Developer chooses which eligible evidence to share.

Prioritize usability and reliability before scope expansion. One complete supported scenario is preferable to many unusable paths. Marketing art direction can wait; usable dashboards, accessible controls and recovery states cannot.

## How to use this tracker

- P0: required before a paid live-candidate workflow relies on that capability. All enabled P0 paths must pass; an explicit manual alternative may satisfy an operational item.
- P1: later improvement unless sold, publicly promised, or required by the specific buyer. Then promote to P0.
- Status: U = unverified, M = missing, I = in progress, B = blocked, V = verified.
- A row becomes V only with implementation references AND relevant observed evidence. A button screenshot or Cursor's statement 'done' is not enough.
- Record each row as: ID; status; owner; implementation path/migration; test or manual reproduction; evidence link; verified commit/environment/date; remaining issue.
- Do not calculate progress by lines of code or count of attractive screens. Report passing release gates and completed end-to-end journeys.
- Split compound rows into child tasks as needed without deleting their acceptance conditions.
- 'Everything works' means the purchased workflows and disclosed supported environments pass. It does not mean every conceivable feature exists or that software will have no bugs.

## Release gates in priority order

1. Easy to start: employer configures/invites and candidate completes preflight without founder coaching.
2. No lost work: drafts, messages, uploads and accepted submission survive tested failures.
3. Trustworthy evidence: results come from the correct immutable attempt; citations and independent tests substantiate findings.
4. Tenant and candidate privacy: unauthorized access fails across every route and storage surface.
5. Useful decision: an engineering reviewer understands the report and its limitations quickly.
6. Recoverable operations: failed jobs are diagnosed/retried without harming candidate outcomes.
7. Honest payment: clear purchased scope, correct entitlement and auditable usage.
8. Complete demo: visitor can inspect the same core product workflow with isolated example data.

## Define the paid outcome

| ID | Priority | Requirement | Passing condition | Status |
|---|---|---|---|---|
| BUY-01 | P0 | Define the first supported buyer and role | One agreed technical role and assessment family; name the hiring step this replaces and who reviews the report. | U |
| BUY-02 | P0 | Set an explicit service promise | Document candidate time, report turnaround, included volume, support contact, limits, and deliverables before payment. | U |
| BUY-03 | P0 | Define the billable event | Specify whether payment buys a package, completed evaluation, or subscription; failed infrastructure runs never silently consume paid assessment credits. | U |
| BUY-04 | P0 | Validate review usefulness | A hiring manager can identify strengths, gaps, and next interview questions from a sample report without founder interpretation. | U |
| BUY-05 | P0 | Measure total work saved | Compare existing setup, invitations, grading, clarification, and report-review time with Fydell; include your manual review labor separately. | U |
| BUY-06 | P0 | Avoid unsupported promises | Claims match implemented features; no assertion of predicting job performance, preventing all cheating, universal coverage, or guaranteed hires. | U |
| BUY-07 | P1 | Track repeat demand | Record whether the buyer sends another candidate or pays for another batch, alongside reasons for refusal. | U |

## Ease of use and navigation

| ID | Priority | Requirement | Passing condition | Status |
|---|---|---|---|---|
| UX-01 | P0 | Give each audience an obvious entry | Developer and employer signup are distinct; developers do not need a company; a person can have both roles without leaking context. | U |
| UX-02 | P0 | Use work-oriented dashboards | Employer home shows pending reviews and active roles; developer home shows projects, passport progress and invitations; no irrelevant financial graphs. | U |
| UX-03 | P0 | Provide one obvious next action | Every core screen has a clear primary action and next step, with concise labels and useful empty states. | U |
| UX-04 | P0 | Handle every visible control | Visible links/buttons work; unavailable capabilities are omitted or explained; no fake success toasts or placeholder settings. | U |
| UX-05 | P0 | Show truthful asynchronous states | Queued, processing, partial, ready, failed and retrying states survive refresh; long jobs show useful progress and recovery instructions. | U |
| UX-06 | P0 | Make errors recoverable | Preserve inputs, identify the failed step, offer retry or support reference; do not expose secrets or stack traces. | U |
| UX-07 | P0 | Make essential flows accessible | Keyboard navigation, visible focus, readable contrast, form labels, status text beyond color; no modal traps or unreadable code previews. | U |
| UX-08 | P0 | Test real devices and browsers | Declare supported desktop environments for coding; signup, invitations and reports remain readable on mobile; verify two major desktop browsers. | U |
| UX-09 | P0 | Protect navigation and drafts | Deep links, refresh, back navigation, expired sessions and double-clicks do not lose work or create duplicate actions. | U |
| UX-10 | P1 | Add purposeful search and filters | Roles/candidates/projects searchable; stable pagination and filters; every query respects permissions. | U |

## Accounts and organization access

| ID | Priority | Requirement | Passing condition | Status |
|---|---|---|---|---|
| AUTH-01 | P0 | Complete authentication | Signup, verified contact route, sign-in, sign-out, reset/recovery and expired-link handling work for every enabled sign-in method. | U |
| AUTH-02 | P0 | Secure account linking | Link GitHub only to an authenticated intended user; protect OAuth state/redirects and prevent email-based account takeover. | U |
| AUTH-03 | P0 | Create an employer workspace | Owner can create a workspace and role; reloading preserves records; do not trust organization IDs supplied by the browser. | U |
| AUTH-04 | P0 | Define member permissions | Owner/admin manage membership; reviewers only access permitted hiring work; billing access is explicit. | U |
| AUTH-05 | P0 | Secure invitations | Expiring, scoped invite tokens; deliberate acceptance; revoked/used invites cannot be reused; no silent membership based on email domain. | U |
| AUTH-06 | P0 | Enforce removal immediately | Removed members lose API, file, search and report access, including previously opened sessions as designed. | U |
| AUTH-07 | P0 | Secure privileged access | Require MFA for production operators; restrict support/admin access and log sensitive access; no shared administrator passwords. | U |
| AUTH-08 | P1 | Offer customer MFA | Use supported auth MFA where feasible; enterprise SSO/SCIM can wait unless explicitly contracted. | U |

## Database, storage and provenance

| ID | Priority | Requirement | Passing condition | Status |
|---|---|---|---|---|
| DATA-01 | P0 | Model the actual workflow | Represent users, developer profiles, organizations/memberships, roles, invites/applications, repository imports/snapshots, findings, passports/grants, scenario versions, attempts/events/messages, submissions/artifacts, evaluation runs/results, reports, private reviewer notes/decisions, billing/usage and audit events. | U |
| DATA-02 | P0 | Use explicit ownership boundaries | Candidate-owned project evidence, employer-specific attempt data, employer-private notes and curated assessment secrets have separate visibility rules. | U |
| DATA-03 | P0 | Constrain relationships | Foreign keys, unique constraints and transactions prevent orphan submissions, duplicated attempts/charges and cross-organization links. | U |
| DATA-04 | P0 | Pin the evaluated versions | Each result records source hash/commit, submission hash, scenario/rubric/test version, evaluator/model/prompt version and evaluation timestamp. | U |
| DATA-05 | P0 | Protect all access paths | Check server authorization plus database grants/RLS where applicable; include views, RPCs, background jobs, search, realtime, exports and object storage. | U |
| DATA-06 | P0 | Use private artifact storage | Source ZIPs, transcripts, reports and hidden tests are private; short-lived downloads enforce audience and access policy; no public buckets by accident. | U |
| DATA-07 | P0 | Apply reproducible migrations | Fresh staging setup and upgrade from prior schema both succeed; migration recovery plan exists; no destructive production reset. | U |
| DATA-08 | P0 | Restore from backup | Perform an actual staging restore of database and required objects; prove report-to-artifact links survive and document recovery time/loss window. | U |
| DATA-09 | P0 | Define lifecycle and retention | Set explicit retention for raw repos, uploads, messages, reports, logs and backups; enforce deletion schedules and documented exceptions. | U |
| DATA-10 | P1 | Track capacity | Index common workspace/attempt lookups, paginate large lists, monitor query latency and storage growth. | U |

## GitHub extraction

| ID | Priority | Requirement | Passing condition | Status |
|---|---|---|---|---|
| GH-01 | P0 | State supported intake | Start with explicitly selected public repositories; private repositories remain unavailable until scoped authorization, privacy and provider controls are verified. | U |
| GH-02 | P0 | Separate authorization and authorship | Connecting an account proves account access, not authorship of all its repositories; label forks, contribution statements and attribution uncertainty. | U |
| GH-03 | P0 | Fetch a reproducible snapshot | Resolve branch to commit SHA; record repository identity, selected revision, files considered and import time. | U |
| GH-04 | P0 | Bound extraction | Limit repository bytes, file count, individual files, duration and model spend; skip binaries, dependencies, generated assets and unsupported content with reasons. | U |
| GH-05 | P0 | Handle external failures | Deleted/moved/private repositories, expired access, pagination, API limits and truncated trees produce accurate partial or failed states with bounded retries. | U |
| GH-06 | P0 | Never execute imported portfolio code | Read code as data; do not run package scripts, notebooks, build tools or repository instructions during ordinary extraction. | U |
| GH-07 | P0 | Treat content as hostile input | Ignore instructions embedded in READMEs/code; restrict fetch destinations, reject arbitrary URLs/internal network targets and redact likely secrets from displayed/model-bound content. | U |
| GH-08 | P0 | Cite every extracted observation | Findings resolve to retained authorized evidence at exact file/line/commit; distinguish code present from code executed successfully. | U |
| GH-09 | P0 | Show analysis coverage | Display supported languages and analyzed/skipped areas; partial coverage is not presented as a complete skill profile. | U |
| GH-10 | P0 | Make imports idempotent | Retries/reimports do not duplicate findings; updated snapshots preserve provenance and mark old findings stale rather than silently rewriting shared records. | U |
| GH-11 | P0 | Support removal and disconnect | User can remove projects and disconnect GitHub; stop future access and explain deletion versus retained shared/employer records. | U |
| GH-12 | P1 | Add scoped private-repository support | Only after selected-repo permissions, encrypted tokens, revocation, provider restrictions and source-sharing safeguards are proven. | U |

## Engineering Passport and role suggestions

| ID | Priority | Requirement | Passing condition | Status |
|---|---|---|---|---|
| PASS-01 | P0 | Build a real persistent passport | Selected projects, contribution statements and eligible simulation evidence persist across devices; no fixtures appear as live personal data. | U |
| PASS-02 | P0 | Keep evidence types distinct | Repository observation, candidate statement, executed result and model interpretation are visibly distinguishable. | U |
| PASS-03 | P0 | Explain role suggestions | Each suggested technical role points to relevant evidence and gaps; no unsupported fit percentages, seniority or personality labels. | U |
| PASS-04 | P0 | Handle missing public work | No repositories means insufficient portfolio evidence, not low ability; invitation recipients can complete an assessment without public GitHub history. | U |
| PASS-05 | P0 | Default to private | No searchable public profile or automatic employer access on signup; user previews exactly what sharing reveals. | U |
| PASS-06 | P0 | Implement scoped sharing | Specify audience, included fields, expiry and revocation; omit email by default if unnecessary; never include employer-private notes or hidden tests. | U |
| PASS-07 | P0 | Clarify portability boundaries | Separate revocable hosted passport access from retained application records; explain that revocation cannot retract previously downloaded copies. | U |
| PASS-08 | P0 | Provide correction and export | User can flag inaccurate findings and obtain a usable record; corrections do not erase original employer audit history silently. | U |
| PASS-09 | P1 | Release shareable simulation evidence carefully | Public/portable versions require scenario-owner permission and remove task secrets, confidential employer content and answer-leaking details. | U |

## Employer role and invitation workflow

| ID | Priority | Requirement | Passing condition | Status |
|---|---|---|---|---|
| EMP-01 | P0 | Create a useful role | Capture role family, stack, responsibilities and job-relevant evaluation criteria; avoid a giant configuration form. | U |
| EMP-02 | P0 | Preview the assessment | Employer sees candidate instructions, required tools, expected effort, rubric, supported scope and an example report before sending. | U |
| EMP-03 | P0 | Freeze assessment configuration | Invites pin scenario/rubric versions; later edits cannot silently alter an in-progress attempt or previous grade. | U |
| EMP-04 | P0 | Bound employer customization | Company context/instructions may be edited within safe limits; changed substantive requirements need validated tests/rubric before release. | U |
| EMP-05 | P0 | Invite the right candidate | Validate email, avoid duplicate invite charges, show delivery status; deliberate Send action; copying a secure invite link is available. | U |
| EMP-06 | P0 | Track operational states | Invited, accepted, setup, in progress, submitted, evaluating, review required, ready, expired and withdrawn have defined meaning. | U |
| EMP-07 | P0 | Resend, revoke and extend | Resend does not create another attempt; revocation/deadline extension is logged and reflected in candidate UI. | U |
| EMP-08 | P0 | Keep human decisions explicit | Advance/Hold/Decline persists with actor/time; recording a decision never automatically sends an unapproved candidate message. | U |

## Assessment content and local setup

| ID | Priority | Requirement | Passing condition | Status |
|---|---|---|---|---|
| SCEN-01 | P0 | Ship one validated full scenario | Small realistic backend repository, incident brief, logs, public tests, controlled requirement update, teammate context and final handoff; target effort stated in advance. | U |
| SCEN-02 | P0 | Define job-relevant dimensions | Rubric covers correctness, engineering judgment, response to requirements and work communication with observable anchors, not arbitrary style preferences. | U |
| SCEN-03 | P0 | Validate solution diversity | Reference solution and alternative legitimate approaches pass; deliberately defective solutions fail relevant checks; tests do not demand a single implementation. | U |
| SCEN-04 | P0 | Prepare a clean starter archive | Pinned dependencies, setup instructions, test command, sample environment values and scenario manifest; exclude secrets, hidden tests and answer keys. | U |
| SCEN-05 | P0 | Support declared local environments | Test clean setup on supported Windows/macOS/Linux paths; specify runtime versions and prerequisites before timing starts; unsupported environments clearly stated. | U |
| SCEN-06 | P0 | Provide setup preflight | Candidate can check install/runtime/public tests before the assessed task begins; setup support is distinct from solving hints. | U |
| SCEN-07 | P0 | Make AI policy explicit | State allowed IDEs, AI tools, documentation and assistance; do not penalize permitted tool use; distinguish self-reported use from observed interactions. | U |
| SCEN-08 | P0 | Accommodate practical constraints | Define extensions/accommodation/support process, breaks and deadline behavior; do not infer competence from setup delays. | U |
| SCEN-09 | P0 | Version and protect content | Publish only reviewed immutable versions; record known issues, intended failures and expected outcomes; control access to reference answers. | U |
| SCEN-10 | P1 | Expand by demonstrated demand | Additional SWE/AI-ML scenarios require their own validated rubric and evaluator; GitHub language support does not imply assessment coverage. | U |

## Simulation and team communication

| ID | Priority | Requirement | Passing condition | Status |
|---|---|---|---|---|
| SIM-01 | P0 | Create a durable attempt | Bind candidate, role, employer, scenario version and allowed time; candidate can resume the same attempt without duplicated events. | U |
| SIM-02 | P0 | Keep the browser task hub useful | Brief, downloads, team thread, issue updates, deadline, support and submission are easy to find while working in a local editor. | U |
| SIM-03 | P0 | Disclose simulated teammates | Identify AI/scripted teammates and captured data; do not imply the candidate is messaging real coworkers. | U |
| SIM-04 | P0 | Constrain teammate behavior | Scenario facts and permitted hints are authored; responses cannot invent requirements or reveal grading secrets; ambiguous questions receive consistent clarification. | U |
| SIM-05 | P0 | Control requirement changes | Server-side milestone logic emits each change once, with stable facts and defined timing; record exposure and acknowledgment; no random personalized difficulty. | U |
| SIM-06 | P0 | Persist messages and drafts | Sent messages have receipt/order; unsent drafts recover; refresh/network retry cannot duplicate or erase important communication. | U |
| SIM-07 | P0 | Handle teammate service outage | Fallback scripted response or paused/extended attempt per policy; delayed bot replies never reduce the candidate's evaluation. | U |
| SIM-08 | P0 | Capture only observed events | Store messages, issue updates, submissions and actual platform events; do not claim to observe local editing, reading or AI prompts without instrumentation. | U |
| SIM-09 | P0 | Collect a useful handoff | What changed, testing, remaining risks and next steps; optional short submission-specific follow-up with transcript and alternatives to audio. | U |
| SIM-10 | P1 | Add richer local integration | A CLI/extension may simplify packaging and disclosed telemetry later; it is not needed for the initial paid workflow. | U |

## Submission and file safety

| ID | Priority | Requirement | Passing condition | Status |
|---|---|---|---|---|
| UP-01 | P0 | Publish packaging requirements | Whole project ZIP including source/tests/config and lockfiles; exclude dependency folders, credentials, build outputs and unrelated files; clear size/type limits. | U |
| UP-02 | P0 | Bind upload to the correct attempt | Authenticated, authorized scoped upload; server controls artifact ownership; swapped attempt IDs fail. | U |
| UP-03 | P0 | Make uploads recoverable | Progress, retry and clear failure states; interrupted upload never appears submitted; support resubmission only under a documented version/deadline policy. | U |
| UP-04 | P0 | Validate before extraction | Check actual file format, compressed/uncompressed limits, entry count, duplicate names, nested archives, absolute/traversal paths, symlinks and unsupported files; scan/quarantine as appropriate. | U |
| UP-05 | P0 | Keep evidence immutable | Hash accepted archive; preserve original bytes and submitted version; never let later uploads overwrite a result's referenced snapshot. | U |
| UP-06 | P0 | Issue durable receipt | Server-confirmed attempt ID, submission ID/hash, timestamp and processing state; double clicks create one accepted operation. | U |
| UP-07 | P0 | Never execute on app infrastructure | Upload parsing and candidate execution cannot access main app credentials, database or host filesystem; hostile filenames/content render safely. | U |
| UP-08 | P0 | Reject clearly and fairly | Wrong archive/too-large file produce actionable packaging instructions; infrastructure errors are not recorded as failed skill tests. | U |

## Independent evaluation runtime

| ID | Priority | Requirement | Passing condition | Status |
|---|---|---|---|---|
| RUN-01 | P0 | Isolate untrusted execution | Use a sandbox suitable for hostile multi-tenant code, not an ordinary privileged app container; no host mounts, Docker socket or production credentials. | U |
| RUN-02 | P0 | Restrict network and resources | Deny network egress by default; tightly control any required dependency access; enforce CPU/memory/disk/process/time/concurrency limits and kill abandoned jobs. | U |
| RUN-03 | P0 | Use reproducible trusted dependencies | Pinned environment images and controlled installs; project scripts/packages are untrusted; no arbitrary internet installs with secrets in scope. | U |
| RUN-04 | P0 | Keep authoritative tests outside candidate control | Candidate changes cannot replace trusted tests/rubric; prevent test discovery/exfiltration where feasible and do not trust candidate-printed pass summaries. | U |
| RUN-05 | P0 | Trust the execution harness | Use evaluator-controlled invocation/results channel; detect tampering; re-run appropriate checks against known failing fixtures. | U |
| RUN-06 | P0 | Classify results correctly | Separate candidate code error, test failure, timeout caused by code, setup incompatibility and platform outage; surface uncertainty rather than guessing. | U |
| RUN-07 | P0 | Recover jobs safely | Durable queue, bounded retries, idempotent run IDs, stale-worker detection and explicit exhausted-retry states; no endless spinner or duplicate billing. | U |
| RUN-08 | P0 | Protect and clean artifacts | Bound and redact logs; persist relevant results before sandbox cleanup; ensure no files carry over between candidates. | U |
| RUN-09 | P0 | Verify expected concurrency | Run the purchased cohort's expected parallel jobs, malicious resource-exhaustion fixture and worker-restart recovery before release. | U |

## Analysis engine and evaluation quality

| ID | Priority | Requirement | Passing condition | Status |
|---|---|---|---|---|
| AI-01 | P0 | Separate deterministic and interpretive results | Actual test results remain distinct from LLM review; an LLM cannot mark tests passed by reading code. | U |
| AI-02 | P0 | Review the correct inputs | Analyze pinned starter/submission diff plus necessary surrounding code, actual tests, scenario events and transcript; track omitted/truncated content. | U |
| AI-03 | P0 | Use explicit rubric anchors | Each dimension defines evidence needed, severity and limitations; allow legitimate alternative solutions and insufficient-evidence outcomes. | U |
| AI-04 | P0 | Require verified citations | Every material finding links to valid lines in the submitted snapshot, a test output or exact message; invalid references fail validation. | U |
| AI-05 | P0 | Resist prompt injection | Treat source, comments, README, filenames, messages and model outputs as untrusted; reviewer has no billing, messaging, secrets or permission-changing tools. | U |
| AI-06 | P0 | Validate model output | Schema checks, permitted labels, citation validation, bounded length and contradiction checks; invalid output routes to retry/review, not a fabricated complete report. | U |
| AI-07 | P0 | Ground technical criticisms | Reproduce consequential defect claims where practical; otherwise label them hypotheses requiring review; do not reward verbosity or superficial code style. | U |
| AI-08 | P0 | Evaluate communication narrowly | Assess relevant clarification, impact, uncertainty and handoff accuracy; cite messages; no culture-fit, personality, accent or sentiment-based suitability inference. | U |
| AI-09 | P0 | Reconcile evidence | Show when handoff claims disagree with tests and when the candidate correctly identifies their own limitation; do not invent unseen development history. | U |
| AI-10 | P0 | Record evaluator versions and overrides | Store rubric/model/prompt version, input references and reviewer edits/reasons; revised reports retain history. | U |
| AI-11 | P0 | Benchmark before trusting reports | Use a pre-labeled set with correct, partial, alternative, broken and adversarial submissions; experienced engineers adjudicate disagreements; check repeat-run consistency. | U |
| AI-12 | P0 | Gate early reports with human QA | Qualified reviewer verifies consequential findings before release; review workload and turnaround are tracked; unclear cases stay pending. | U |
| AI-13 | P0 | Protect confidential inputs | Choose provider retention/training settings consistent with promises; send only required authorized content; do not assume a general 'no training' claim without checking terms/settings. | U |
| AI-14 | P1 | Reduce manual review with evidence | Expand automation only after measured errors, consistency and reviewer agreement justify it; keep correction/escalation available. | U |

## Employer report and decision experience

| ID | Priority | Requirement | Passing condition | Status |
|---|---|---|---|---|
| REP-01 | P0 | Lead with a short decision brief | Role/task, demonstrated strengths, material gaps, evidence limitations and useful interview follow-ups; no long transcript dump as default. | U |
| REP-02 | P0 | Make evidence one click away | Each finding opens the correct source, diff, test or message; preserve selected context and easy return to summary. | U |
| REP-03 | P0 | Separate result categories | Show coding results, interpretation, communication observations and infrastructure status distinctly; no unsupported universal hireability number. | U |
| REP-04 | P0 | Keep reports consistent | Candidate/role/version identifiers are correct; incomplete evaluation is visibly incomplete; fixes create a versioned update. | U |
| REP-05 | P0 | Support reviewer work | Private notes, decision history and filtering persist; reviewer can flag a finding and request correction. | U |
| REP-06 | P0 | Enforce report permissions | Only authorized reviewers see employer reports; scoped export/download checks apply; candidate passport excludes internal notes. | U |
| REP-07 | P0 | Make report sharing useful | A secure report link is sufficient initially; exported artifacts, if offered, contain the right version and sensitivity labels. | U |
| REP-08 | P1 | Record downstream outcomes | Track interviews and optional hiring outcomes with purpose/retention controls; do not treat small samples as predictive validation. | U |

## Deep public demo

| ID | Priority | Requirement | Passing condition | Status |
|---|---|---|---|---|
| DEMO-01 | P0 | Show the complete story | Public demo covers example GitHub import, passport, local task setup, team interaction/update, sample submission, report and employer decision preview. | U |
| DEMO-02 | P0 | Let visitors inspect actual details | Open example source citations, switch evidence types, inspect passing/failing tests, read a message thread and preview sharing. | U |
| DEMO-03 | P0 | Use deterministic labeled fixtures | Candidate01-style identities; visible sample-data label; demo scan/processing is not represented as a live repository analysis. | U |
| DEMO-04 | P0 | Reuse real UI components | Demo and product use the same report/passport/thread components with separate data adapters; no conflicting second product. | U |
| DEMO-05 | P0 | Isolate demo mutations | No real candidate email, paid evaluation job, charge or live record update; reset works; production data never feeds public fixtures. | U |
| DEMO-06 | P0 | Offer clean conversion | Get started retains chosen audience and useful route context but never copies fictional evidence into a live account. | U |
| DEMO-07 | P0 | Explain local work convincingly | Show starter contents/setup and optional safe sample download; only advertise interactive capabilities actually implemented. | U |
| DEMO-08 | P1 | Offer a real sample run | Optional short sandbox/example evaluation can come after cost limits, abuse protections and runtime reliability are verified. | U |

## Payment and entitlements

| ID | Priority | Requirement | Passing condition | Status |
|---|---|---|---|---|
| BILL-01 | P0 | Choose one dependable payment path | Hosted checkout or manually issued invoice is acceptable for first contracts; terms, payer, scope, currency and refund/support route are explicit. | U |
| BILL-02 | P0 | Keep card data out of Fydell | Use payment-provider hosted collection; do not store raw card details; protect billing/customer identifiers. | U |
| BILL-03 | P0 | Verify server-side fulfillment | Authenticate webhook signatures or reconcile verified provider records; browser redirect alone never grants paid access. | U |
| BILL-04 | P0 | Handle repeat/out-of-order events | Deduplicate provider events; reconcile authoritative payment state; safe retries; avoid double credits or duplicate charges. | U |
| BILL-05 | P0 | Map payment to the right organization | Only authorized payer/admin changes billing; amounts/products come from server configuration, not client input. | U |
| BILL-06 | P0 | Maintain a usage ledger | Explicit included volume and consumption; run retries/platform failures handled by stated policy; manual credits are logged. | U |
| BILL-07 | P0 | Test payment lifecycle | Success, failure, canceled checkout, delayed event, repeat event and refund tested; cancellation/renewal tested if subscriptions are sold. | U |
| BILL-08 | P0 | Provide receipts and billing support | Buyer can retrieve payment documentation and contact support; no paid contract with unclear access period or deliverable. | U |
| BILL-09 | P1 | Build self-service subscription UI | Not required if selling clear manually managed packages; never offer renewals/cancellation flows that do not work. | U |

## Security and privacy release gates

| ID | Priority | Requirement | Passing condition | Status |
|---|---|---|---|---|
| SEC-01 | P0 | Map data flows and recipients | Document what goes to auth, hosting, storage, email, model and execution providers, why, access scope and configured retention. | U |
| SEC-02 | P0 | Publish accurate notices and terms | Describe collection, AI use, sharing, retention/deletion, contact and candidate data rights accurately; have applicable launch-market obligations reviewed by qualified counsel. | U |
| SEC-03 | P0 | Set appropriate customer terms | Document employer/candidate responsibilities, allowed use, subprocessors and data-processing terms where required; no invented certifications or blanket compliance claims. | U |
| SEC-04 | P0 | Minimize collection | Do not collect private screen recordings, browser history, local files or AI chats without a necessary feature, explicit disclosure and scoped permission. | U |
| SEC-05 | P0 | Protect credentials and transport | TLS, secure secret storage, server-only privileged keys, token rotation/revocation and redacted logs; no secrets in frontend bundles or Git history. | U |
| SEC-06 | P0 | Test access abuse | Organization A cannot access B by modified IDs; candidate A cannot access B; unauthenticated and removed-member requests fail through API/storage/export paths. | U |
| SEC-07 | P0 | Handle web threats | Input validation, output escaping including Markdown, restricted URLs/redirects, CSRF protections where applicable, secure cookies and dependency review. | U |
| SEC-08 | P0 | Limit abuse and spend | Rate limits and quotas on login, invites, uploads, imports, AI conversations and sandbox runs; no arbitrary email relay or unauthenticated compute. | U |
| SEC-09 | P0 | Implement export/correction/deletion | Manual authenticated requests are acceptable initially if fulfillable; trace data through DB, objects, jobs, indexes and vendors; document backup expiry. | U |
| SEC-10 | P0 | Honor revocation in new processing | Revoked access prevents future imports/shares as defined; in-flight jobs check permissions before publishing results. | U |
| SEC-11 | P0 | Separate environments | Development, staging, demo and production have separate credentials/data; no real candidate data in test fixtures or model debugging logs. | U |
| SEC-12 | P0 | Prepare incident handling | Named responder, containment/key rotation/access revocation, preserved audit evidence and customer communication plan; fulfill applicable notice requirements. | U |
| SEC-13 | P1 | Pursue enterprise controls when justified | SSO, SCIM, regional hosting and independent assurance become gates when promised or required by a buyer, not decorative website badges. | U |

## Operational reliability and support

| ID | Priority | Requirement | Passing condition | Status |
|---|---|---|---|---|
| OPS-01 | P0 | Monitor the complete journey | Alert on import failures, stalled jobs, upload errors, evaluator outages, report delay and billing issues with correlation IDs and redacted details. | U |
| OPS-02 | P0 | Make support actionable | Visible support channel, attempt/report reference, response expectations and operator ability to diagnose without asking for credentials. | U |
| OPS-03 | P0 | Provide controlled operator recovery | Authorized tools to retry, extend deadlines, quarantine submission, reissue report and credit usage; log actor/reason and require deliberate external sends. | U |
| OPS-04 | P0 | Roll out and roll back safely | Production build/migrations verified in staging; health checks; disable broken evaluator/scenario through controlled flag; preserve existing work during rollback. | U |
| OPS-05 | P0 | Define achievable service targets | Set explicit setup/report turnaround, concurrency and recovery targets for first contract; measure p50/p95 where meaningful and avoid unsupported uptime promises. | U |
| OPS-06 | P0 | Bound per-attempt costs | Measure model calls, compute, storage, email and human review time; impose caps and make sold pricing sustainable. | U |
| OPS-07 | P0 | Prove recoverability | Worker restart, browser disconnect and delayed provider response recover without lost submissions, double billing or false candidate failures. | U |
| OPS-08 | P0 | Resolve release-blocking defects | Zero known data leaks, lost submissions, wrong-candidate reports, fabricated findings or payment/entitlement errors at launch; lower severity issues have workarounds and owners. | U |

## Required access matrix

Implement explicit field-level visibility as well as record access. These are proposed defaults; settle retention and application-record rules before launch.

| Data | Developer owner | Employer reviewer | Unrelated user | Operator |
|---|---|---|---|---|
| Selected GitHub evidence / passport | Own record | Only authorized shared scope | No | Purpose-limited, audited |
| Employer-specific submission / transcript | Own attempt under stated policy | Assigned organization/role | No | Purpose-limited, audited |
| Employer report | Candidate-facing subset if provided | Assigned organization/role | No | Purpose-limited, audited |
| Internal notes / hiring decision history | No by default; handle applicable access rights separately | Authorized team | No | Purpose-limited, audited |
| Hidden tests / answer keys | No | Preview rubric, not necessarily secrets | No | Restricted assessment maintainers |
| Billing | No unless workspace billing role | Billing-authorized member only | No | Restricted billing support |
| Public demo | Fictional fixtures only | Fictional fixtures only | Fictional fixtures only | Separate fixture management |

For stronger revocation, serve sensitive evidence through an authorization-checked endpoint. If signed URLs remain valid until expiry, specify the short expiry and residual access window rather than claiming instant revocation.

## State machines to make explicit

Do not collapse separate state machines into one ambiguous status.

- Import: queued → fetching → analyzing → ready / partial / failed / canceled.
- Attempt: invited → accepted → preflight → in_progress → submitted / withdrawn / expired. Extensions are audited events.
- Upload: initiated → uploading → validating → accepted / rejected / failed. An accepted upload is not necessarily a completed evaluation.
- Evaluation: queued → running → automated_review → human_review → ready; retryable_failure / blocked / canceled tracked separately.
- Employer decision: undecided → advance / hold / decline, with versioned changes and notes.
- Billing: pending → paid / failed / canceled, with refunded states and separate entitlement/usage ledger.

Transitions must be enforced server-side. Repeated requests and concurrent updates cannot regress states or publish results for the wrong version.

## End-to-end acceptance scenarios

| Gate | Reproduction | Required outcome |
|---|---|---|
| E2E-01 Developer onboarding | Fresh user imports supported public repo, inspects a finding, builds passport, signs out/in | Persistent source-linked evidence, correct privacy, useful next step |
| E2E-02 Candidate without GitHub | Invite recipient has no public repositories | Can still complete the employer simulation; portfolio absence is not a failure |
| E2E-03 Employer setup | Fresh employer creates role, previews scenario and deliberately sends invite | Right scenario/version and recipient; no founder database edits |
| E2E-04 Local simulation | Candidate sets up on a clean supported OS, asks clarification, receives issue update, uploads ZIP and handoff | Correct complete attempt record and receipt |
| E2E-05 Known-good submission | Reviewed correct solution submitted | Expected tests pass, accurate grounded report, no invented issues |
| E2E-06 Known-partial submission | Deliberate retry bug and honest handoff submitted | Relevant failure detected; handoff awareness represented without upgrading failing code |
| E2E-07 Alternative solution | Different valid implementation submitted | Legitimate design accepted without matching reference code text |
| E2E-08 Hostile upload/repository | Traversal ZIP, excessive archive, prompt injection, hostile Markdown and resource-exhaustion fixture | Rejected or isolated safely; no secret leakage, false report or host damage |
| E2E-09 Access isolation | Two employers and two candidates attempt direct ID/file/report access to each other's data | Denial across API, database-facing routes, storage, exports and realtime |
| E2E-10 Interrupted work | Refresh, expire session, interrupt upload, restart worker, repeat submit | Recoverable state; no lost accepted submission or duplicate report/usage |
| E2E-11 Provider outage | GitHub/LLM/evaluator/email provider unavailable | Truthful state, bounded retries/support; no candidate penalty |
| E2E-12 Employer review | Reviewer follows findings to sources, adds note and records decision | Accurate report, private notes, durable decision; no unintended email |
| E2E-13 Sharing revocation | Share passport, revoke, remove project, retry access under documented URL policy | New unauthorized access denied; retained application records behave as disclosed |
| E2E-14 Payment | Test successful/failed payment, replay and delay fulfillment events, refund | Correct organization entitlement and ledger, no duplication |
| E2E-15 Data request/restore | Authenticated export/deletion request and staging restore drill | Traceable fulfillment and recovery including required file objects |
| E2E-16 Demo isolation | Anonymous visitor completes demo and then signs up | No external sends, paid compute or fixture contamination of real profile |

## Quality and usability targets for the first release

These are proposed internal targets, not industry benchmarks or legal/predictive validation.

- Employer self-service: aim for first role and invitation within 10 minutes after a scenario is selected, without founder guidance.
- Candidate setup: aim for preflight within 10 minutes on declared supported machines; measure failures separately from assessed work.
- Simulation effort: initially target roughly 45–60 minutes of assessed work, then adjust from candidate trials and buyer needs. Do not sell a universal time limit for every role.
- Report comprehension: reviewer finds the main strength, main limitation and supporting evidence within 3 minutes.
- Benchmark set: at least 20 deliberately varied submissions reviewed by experienced engineers, including adversarial and alternative solutions, before trusting automatic judgments. This is a functional calibration set, not proof of predictive validity.
- Evidence integrity: 100% of published material findings have valid references; zero known fabricated test outcomes or unsupported severe findings in the release benchmark.
- Human review: review every initial report before employer delivery; track corrections and minutes of labor. Set a turnaround promise you can actually staff.
- Critical path: all listed E2E gates pass in the release environment or production-equivalent staging, with controlled production smoke checks.
- Reliability rehearsal: 10 consecutive complete internal attempts with no lost submissions, wrong-user data or billing duplication, including planned failure injections. Passing ten attempts is not proof of high-volume reliability.
- Buyer outcome: measure their total review effort against their previous workflow; aim to reduce it, rather than claiming an unmeasured percentage.
- Candidate experience: record setup abandonment, assessment abandonment, support requests, successful submission and reasons for difficulty.
- Launch stop conditions: unresolved cross-tenant exposure, unsafe execution, lost submissions, wrong-candidate reporting, fabricated grading, or incorrect charging.

## What can be manual initially

Manual operation is acceptable when it is honest, timely, repeatable and auditable. It cannot substitute for basic safety.

- Scenario selection/configuration with employer input.
- Qualified review of AI-generated findings.
- Invoicing, payment reconciliation and logged entitlement provisioning.
- Support, deadline extensions, credits and correction requests.
- Authenticated data export/deletion requests with a documented process.
- Cohort setup and reporting to the first few customers.

Tenant isolation, upload safety, sandbox isolation, immutable submission receipts and truthful evaluation outcomes cannot be left to memory or ad hoc manual judgment.

## What should wait

- A proprietary desktop IDE or separate Fydell desktop application.
- A large custom VS Code extension or intrusive tracking system.
- Arbitrary employer repository generation.
- A validated simulation for every language and job.
- Automatically changing candidate difficulty based on a GitHub passport.
- Public candidate rankings, universal ability scores or inferred culture fit.
- Full ATS replacement, automated rejection messages and autonomous hiring decisions.
- Broad ATS integrations, SSO/SCIM and regional hosting unless a real contract needs them.
- Elaborate analytics, social feeds, badges, gamification and decorative dashboards.
- Voice/video teammate simulation before the text-based task provides useful evidence.
- Unrestricted private GitHub ingestion or executing portfolio repositories.

## Recommended implementation order

### Milestone 0 — Audit what exists

Inspect repo routes, service code, migrations, RLS/storage policies, provider configuration and deployment. Classify every tracker row. Record evidence for anything already working. Keep working components. Find fixtures masquerading as live data and expose them.

Deliver: populated tracker plus one named blocker per incomplete critical flow. No unsupported green checkmarks.

### Milestone 1 — One employer-to-report loop

Build authentication/tenant boundaries, role and invite, reviewed starter project, local setup, team thread, controlled issue update, ZIP receipt, isolated trusted tests, human-checked report and employer decision. Use a qualified reviewer before automating qualitative grading.

Deliver: one real internal candidate attempt reviewed by another authorized account, with refresh and outage recovery.

### Milestone 2 — GitHub and candidate-owned record

Add bounded source extraction, citations, coverage, passport, grounded role suggestions, sharing/preview/revocation and no-GitHub path. Connect employer review only to authorized shared evidence.

Deliver: developer A selectively shares with employer A; employer B cannot access it.

### Milestone 3 — Reliable analysis and operations

Add validated AI review, benchmark fixtures, job recovery, audit trail, backups/restore, privacy workflows and operator tools. Run security/failure gates while implementation is fresh, not only at the end.

Deliver: verified benchmark and failure-recovery evidence; no misleading reports.

### Milestone 4 — Paid release

Complete clear payment path/entitlements, deep isolated demo, support readiness and all P0 workflow gates. Test ordinary users doing tasks without coaching. Verify purchased volume and turnaround fit operating capacity.

Deliver: release record with commit/environment, pass/fail evidence, known nonblocking issues and explicit supported scope.

## Copy-paste audit instruction for Cursor

Inspect this repository and use this checklist as the release tracker. Do not assume a UI means its backend works. Preserve existing working functionality. For each ID, record U/M/I/B/V status, implementation path, acceptance evidence, owner and blocker. Mark V only after relevant verification. Check auth, tenant boundaries, storage, job queues and evaluator wiring before enabling live candidate data. Separate sample fixtures from production records.

Produce the current-state audit first, then implement the earliest incomplete milestone in dependency order. Prioritize self-service usability, durable submissions, evidence accuracy, isolation and recovery. Use targeted tests for consequential behaviors; do not create tests that only mirror implementation. Work through routine reversible fixes autonomously. Do not enable real charges, send real invitations or perform destructive migrations merely as tests. Do not replace the backend with mocked success to make the demo look finished.

At each milestone report: what now works end to end; the exact checks performed; outstanding release blockers; what is still manual; next concrete step. Never say production-ready based only on a build passing.

## Technical reference anchors

These references inform selected controls; the full checklist is a proposed Fydell product specification, not a compliance certification.

- Supabase database grants and Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Stripe webhook verification and event handling: https://docs.stripe.com/webhooks
- OWASP upload validation and storage guidance: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- GitHub REST API limits: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api

Legal obligations depend on launch markets and actual use. Obtain specific review of employment-assessment, privacy, accessibility, retention and customer-contract obligations before making jurisdictional compliance claims.

