# Fydell candidate product UX audit

Date: 2026-08-19  
Scope: candidate-facing entry, candidate home, production simulation, isolated lab simulation, submission and defense, candidate result, and Work Receipts.

> Post-audit correction, 2026-08-19: the observed AlaSQL / React Native
> compilation failure was fixed after this audit by resolving AlaSQL
> unconditionally to its browser-only build during Client Component SSR. A clean
> server restart now returns HTTP 200 for
> `/lab/sim/northline-operations-yield/analysis`. The audit retains the original
> finding because it was a real release-gate failure at inspection time; it is
> no longer an open defect. All other candidate-flow findings remain open.

## Audit basis and limits

This audit used both source inspection and browser interaction against `http://localhost:3000`.

Observed directly in the browser:

- Opened and started `/lab/sim/northline-operations-yield`.
- Inspected the objective, task rail, resources, real dataset tables, SQL editor, memo composer, people and assistant tabs, timer, save label, and submission dialog.
- Executed a real grouped SQL query against `production_runs`; the workbench returned current and prior rows.
- Saved an analysis memo and submitted the attempt.
- Followed the generated “Continue to defense and evidence review” link.
- Opened all public or invalid-token states listed in the route inventory below.
- Confirmed that `/lab/sim/[scenarioId]/analysis` currently fails to compile because the client import graph reaches `alasql.fs.js`, `react-native-fs`, `react-native`, and a missing `react-native-fetch-blob`.
- Confirmed that invalid `/record/[token]`, `/sim/[sessionId]`, and unauthenticated `/app/candidate` requests produced generic 500 pages in the preview environment rather than controlled states.

Could not verify directly:

- A valid production invitation, production session, production result, or valid shared receipt. The preview environment did not provide a usable candidate token/session and its Supabase-backed candidate routes failed. Findings for valid states on those routes are therefore based on the rendered source and API contracts, and are labeled accordingly.
- The full lab defense interaction, because the post-submit analysis route failed before it rendered.
- Server-authoritative timing in the lab. The lab is explicitly browser-local development state.

## Executive verdict

Fydell currently has three candidate products superimposed on each other:

1. Wave 1 production: an “evaluation” dashboard, a scored structured-answer workbench, and a score report.
2. The proof graph: `/work/[token]`, a better three-pane Solutions Engineer workbench, defense, and human-reviewed decision briefs.
3. The isolated lab engine: the strongest actual work simulation, with real tools, deterministic changed information, separated event streams, evidence, and typed defense.

That is not one candidate journey. The candidate-facing object model is still “invitation → evaluation → score/result,” while the target is “opportunity → work → review → Work Receipt.” The lab provides the best workbench foundation, but it is not promotable as-is: it uses localStorage, shows development language, exposes analysis/reviewer controls after submission, and its analysis route is presently broken.

## 1. Route inventory

| Route | What it actually is | Who it serves | Target concept | Disposition | One-line justification |
|---|---|---|---|---|---|
| `/app/candidate` | Authenticated list of pending invitations, active sessions, completed sessions, credential numbers, and score/result links under “Your evaluations.” | Candidate | Opportunities, Work Receipts, Profile | **REBUILD** | Replace the evaluation ledger with the three target destinations and make receipts first-class objects rather than credential numbers attached to score results. |
| `/app/fde` | Legacy alias that redirects to `/app/candidate`. | Candidate | None | **DELETE** | “FDE” is an internal/role label and the alias adds no candidate value. |
| `/invite/[token]` | Wave 1 invitation and partial opportunity page, then account creation/sign-in and acceptance. Includes employer name, role framing, duration, recording disclosure, expiry, and Work Receipt promise. | Invited candidate | Secure link and opportunity page | **KEEP** | It is the right canonical entry route, but it needs employer identity, complete consent disclosure, explicit outputs, and a clean handoff to preparation. |
| `/work/[token]` | Proof-graph token resolver that calls `startRunFromToken()` during page render and immediately mounts `ProofWorkbench`. | Invited proof-graph candidate | Currently collapses invitation, verification, consent, preparation, and start | **MERGE INTO `/invite/[token]`** | A GET request must not start work before the candidate sees the opportunity, verifies identity, consents, and deliberately starts. |
| `/sim/[sessionId]` | Wave 1 production workbench using `WorkbenchRunner`; authenticated and session-owned. | Candidate doing production work | Focused simulation workbench | **REBUILD** | Keep the production session boundary and server persistence, but replace the assessment-shaped UI/runtime with the lab engine’s job-shaped workbench. |
| `/sim/[sessionId]/result` | Polling score/result page, then numeric evidence report, optional defense, receipt-sharing controls, and feedback. | Candidate after submission | Submission status, defense, Work Receipt issuance | **REBUILD** | Submission, review status, defense, and portable receipt are separate stages; this page currently shows a score before defense and calls the same object a result and a receipt. |
| `/record/[token]` | Public field-scoped share route called “Work Receipt,” but it renders `EvidenceReportV2`, including performance, coverage, confidence, scores, strengths, and improvements. | Recipient of candidate share link | Shared Work Receipt | **RENAME TO `/receipt/[token]`** | Keep hashed, scoped, expiring, revocable sharing, but render a dedicated verified work record with no score or employer decision content. |
| `/results/[token]` | Retired plaintext, unscoped share route that now explains why old links no longer work. | Holder of an old link | None | **DELETE** | Keep a temporary HTTP redirect/tombstone only for migration; it is not a product surface and should not remain a parallel result noun. |
| `/lab/sim` | Internal catalog of experimental scenarios and strong/weak analysis fixtures. | Product/engineering | Internal engine lab | **KEEP** | Keep internal only; it must never become a candidate catalog because Fydell is invite-only. |
| `/lab/sim/[scenarioId]` | Browser-local next-generation simulation with role-specific workbench, real SQL, resources, artifacts, people, AI tool, deterministic changed fact, and submit flow. | Internal testers; candidate proxy | Target workbench prototype | **MERGE INTO `/sim/[sessionId]`** | This is the best work experience, but production must supply identity, canonical events, server time, durable persistence, and candidate-safe chrome. |
| `/lab/sim/[scenarioId]/analysis` | Attempt analysis, defense, evidence stream inspector, human approval, and decision-brief publishing in one route. Currently fails to compile in preview. | Candidate proxy plus reviewer plus internal debugger | Defense only, with reviewer work elsewhere | **REBUILD** | Split candidate defense from internal analysis/reviewer controls and fix the import boundary; candidate must never see browser-local event streams or “Approve and publish brief.” |
| `/evidence-report` | Public worked example of an employer decision brief with recommendation, claims, event trail, remaining uncertainty, interview probes, and reviewer approval. | Employer prospect | Decision Brief example | **KEEP** | It concretely demonstrates the employer artifact and should remain explicitly distinct from a candidate Work Receipt. |
| `/signup` | Shared signup whose copy adapts when `next` is a candidate destination. | Candidate or employer | Verify email/account step | **KEEP** | Candidate-specific copy is useful, but this should be a lightweight identity step inside the invitation graph, not the start of general onboarding. |
| `/signup/role` | General account-role chooser; invited candidate destinations silently submit the candidate/FDE role and continue. | Mixed | None in candidate journey | **MERGE INTO `/invite/[token]`** | Silent bypass is correct for invited candidates; remove the candidate from this generic role-selection surface and resolve role as part of invitation acceptance. |
| `/auth/confirmation-required` | Post-signup instruction to sign in. | Candidate or employer | Verify email/account continuation | **KEEP** | It is a controlled auth state, provided `next` always returns the candidate to the invitation. |
| `/auth/link-invalid` | Expired/used confirmation or recovery-link state. | Candidate or employer | Auth error | **KEEP** | Clear recovery action exists and preserves `next`. |
| `/account/setup-required` | Generic unresolved-account screen using “workspace or mission invitation,” with role chooser and pilot request links. | Mixed, including misrouted candidates | Candidate routing error | **REBUILD** | Candidate copy must say whether the invitation is missing, expired, or belongs to another email and offer the exact recovery action. |
| `/simulations` | Public description of the one released evaluation and its outputs. | Candidate curious about the process; employer prospect | Public “what the work involves” explanation | **KEEP** | Candidate empty states link here; keep it as education, not as a self-serve catalog or dashboard destination. |
| `/pilot` | Research-study introduction for a five-minute simulation, including “do not worry about achieving a perfect score.” | Usability-test participant | Research only | **DELETE** | It is explicitly a product test, uses score language, and must not sit in the production candidate graph. |
| `/pilot/profile` | Research context form asking tester perspective and optional personal information. | Usability-test participant | Research only | **DELETE** | This is study instrumentation, not the target minimal candidate profile. |
| `/pilot/roles` | Self-serve role/simulation picker. | Usability-test participant | Research only | **DELETE** | It directly contradicts invite-only opportunity entry and says “choose a role to test.” |
| `/pilot/feedback` | Optional research feedback form after a simulation. | Usability-test participant | Research only | **DELETE** | Keep feedback capability behind an internal research flag, not as candidate product navigation. |
| `/pilot/thanks` | Research completion page with “Run another role.” | Usability-test participant | Research only | **DELETE** | It reinforces a simulation catalog rather than a managed talent network. |

### The four token routes, plainly

- `/invite/[token]` is the only route that resembles the target opportunity entry. It resolves a Wave 1 `sim_invitations` token and does not start the timer.
- `/work/[token]` is not an opportunity page. It resolves a proof-graph invitation and starts/loads a proof run immediately during page render.
- `/record/[token]` is an active, candidate-controlled, field-scoped share link, but its payload and renderer are a score report, not the target Work Receipt.
- `/results/[token]` is retired. It discloses no work and exists only to explain an old unsafe URL shape.

The overlap is not harmless naming debt. It exposes two invitation systems, two run systems, and three post-work nouns: result, record, and receipt. Canonicalize on `/invite/[token]`, `/sim/[sessionId]`, and `/receipt/[token]`.

## 2. Severity-ranked defects

### 1

SCREEN  
Production simulation connection loss

PROBLEM  
The production workbench promises that work is saved through connection loss, but its offline path only keeps React state plus an in-memory retry callback. It does not persist the unsent candidate work to localStorage or another durable local queue. Closing or reloading the tab while offline can discard the edits. The header also says only “Offline,” not `Offline — saved locally`.

USER COST  
A candidate can lose consequential work after the product explicitly promised that they would not.

SEVERITY 1-5  
5

WHY IT EXISTS  
`WorkbenchRunner` has server revision control and a retry queue, but no durable offline snapshot/outbox. The invitation and preparation copy overstate the implementation.

SYSTEMIC FIX  
Adopt an explicit durability contract: every edit writes to a durable local snapshot first, server sync advances independently, reload restores the local snapshot, conflict resolution never clobbers newer work, and the only statuses are `Saving…`, `Saved`, `Offline — saved locally`, and `Reconnecting…`.

### 2

SCREEN  
Lab submission to defense

PROBLEM  
The submitted lab attempt links to `/lab/sim/northline-operations-yield/analysis`, but that route currently fails to compile. The observed error chain runs from `ScenarioAnalysisHost` through simulation fixtures and SQL runtime into `alasql.fs.js`, which imports React Native modules and a missing `react-native-fetch-blob`.

USER COST  
The strongest simulation journey stops immediately after submission. The candidate cannot answer the generated defense questions or reach completion.

SEVERITY 1-5  
5

WHY IT EXISTS  
The analysis client bundle crosses an unsafe import boundary and pulls the filesystem/React Native AlaSQL build into Next’s client/SSR compilation path.

SYSTEMIC FIX  
Separate browser SQL execution from analysis imports, make the analysis route depend only on serializable attempt contracts, and add an end-to-end release gate that starts, submits, opens defense, answers it, and reaches completion.

### 3

SCREEN  
Candidate result and shared “Work Receipt”

PROBLEM  
The current candidate result is a numeric assessment report: performance out of 100, coverage percentage, confidence percentage, competency numbers, bars, score bands, and “where it stopped short.” `/record/[token]` reuses that same `EvidenceReportV2` and exposes `scenario_score` as a scopeable receipt field.

USER COST  
The product tells candidates they earned a portable verified record, then gives them a score report. It feels like assessment software and makes the purported receipt less credible to a recipient.

SEVERITY 1-5  
5

WHY IT EXISTS  
The existing `sim_credentials` and share-link infrastructure was named “receipt” before a separate Work Receipt domain object and renderer existed.

SYSTEMIC FIX  
Create a dedicated Work Receipt model and view with specific work completed, reviewed evidence strength, explicit limitations, version/date, and verification status. Never source its presentation from `EvidenceReportV2`, and remove numeric score fields from the receipt contract.

### 4

SCREEN  
Proof-graph entry at `/work/[token]`

PROBLEM  
Opening the route invokes `startRunFromToken()` and mounts the workbench. There is no opportunity page, email-verification gate visible on the route, plain-language consent, preparation screen, or deliberate start action.

USER COST  
A candidate can begin a consequential timed/recorded process simply by opening a link, without understanding the role, task, recording, AI analysis, reviewer access, employer output, or what they keep.

SEVERITY 1-5  
5

WHY IT EXISTS  
The proof graph was built as an isolated vertical slice and its token was treated as both invitation and run identifier.

SYSTEMIC FIX  
Resolve all candidate invitations through one entry state machine: opportunity → email verification → consent → preparation → explicit start → session. GET requests must never create/start a run.

### 5

SCREEN  
Production simulation workbench

PROBLEM  
The production experience still contains structured decisions, single-select and multi-select controls, numeric answers, “score” language, one generic stakeholder drawer, and a module rail. It is not the target three-pane job workspace and often reads like a scored assessment assembled from questions.

USER COST  
Candidates optimize for answering the instrument instead of doing the job. Fydell looks like assessment SaaS rather than a talent network plus verification system.

SEVERITY 1-5  
5

WHY IT EXISTS  
Wave 1 evolved from micro questions and v2 scoring. `fallbackWorkbench()` wraps those question types in newer visual chrome without changing the underlying interaction model.

SYSTEMIC FIX  
Promote the lab engine’s artifact-and-tool runtime into the production session boundary. Author role work as resources, real tools, artifacts, and stakeholder conversations. Structured choices may exist inside the work only where the job itself uses them, never as the primary evaluation grammar.

### 6

SCREEN  
Candidate home

PROBLEM  
The page is “Your evaluations,” has no `Opportunities`, `Work Receipts`, or `Profile` navigation, and attaches receipt numbers to submitted score-result rows. Status copy includes “Timer running,” “Not started,” and “Being scored,” outside the required vocabulary.

USER COST  
The candidate sees an assessment ledger, not a talent-network account or a growing record of verified work.

SEVERITY 1-5  
5

WHY IT EXISTS  
The page is a direct projection of `sim_invitations`, `sim_sessions`, and `sim_credentials`, not a candidate product information architecture.

SYSTEMIC FIX  
Build the candidate shell around the three target nouns. Normalize all candidate-facing lifecycle states to `Invited`, `Started`, `Submitted`, `Under review`, and `Verified`.

### 7

SCREEN  
Lab analysis route

PROBLEM  
Even if compilation is fixed, one route combines candidate defense, provisional claims, final claims, separated world/candidate/telemetry/system streams, reviewer note entry, and “Approve and publish brief.”

USER COST  
The candidate would see internal analysis mechanics and reviewer controls, undermining dignity and privacy boundaries.

SEVERITY 1-5  
5

WHY IT EXISTS  
The route is an engine lab and deliberately demonstrates the whole golden path, but it is linked directly from the candidate-like submitted workbench.

SYSTEMIC FIX  
Create separate surfaces and authorization boundaries: candidate defense, candidate completion/review status, internal reviewer evidence, employer Decision Brief, and candidate Work Receipt.

### 8

SCREEN  
Production changed-information event

PROBLEM  
Production code still names the mechanism `curveball`, polls a `/curveball` endpoint, renders a persistent “Mid-session update” banner, includes `requiredAdaptation`, and asks the candidate to “Acknowledge update.” The event is outside the stakeholder thread.

USER COST  
The interface announces the evaluation mechanism and tells the candidate what response is expected, reducing realism and contaminating the evidence.

SEVERITY 1-5  
4

WHY IT EXISTS  
The changed fact began as a timed assessment event rather than as an event in the simulated work world.

SYSTEMIC FIX  
Release changed information through the relevant stakeholder conversation, show a calm unread indicator, and record whether the candidate notices and responds without naming the competency being observed.

### 9

SCREEN  
Invitation and production consent

PROBLEM  
The invitation discloses workspace actions and assistant observation, but consent does not plainly say that work may be analysed using AI, a Fydell reviewer may review it, integrity signals may be collected, and only approved evidence reaches the employer. The checkbox instead says everything opened, asked, written, and submitted is “shown to the company.”

USER COST  
Candidates cannot give informed consent and may reasonably infer either too much employer surveillance or too little internal/AI review.

SEVERITY 1-5  
4

WHY IT EXISTS  
Disclosure copy mirrors current event capture rather than a stable end-to-end data-use policy.

SYSTEMIC FIX  
Use one versioned, plain-language consent contract across both simulation systems, with separate bullets for recording, AI analysis, human review, employer disclosure, and integrity telemetry.

### 10

SCREEN  
Production defense

PROBLEM  
Defense appears after the score report, is described as optional, renders all questions at once, includes each question’s internal “purpose,” and can be deferred to an employer conversation. The result can therefore exist before the evidence process is complete.

USER COST  
The candidate reads a verdict before being allowed to explain their decisions, while the employer may receive evidence that did not include the promised defense.

SEVERITY 1-5  
4

WHY IT EXISTS  
Defense was added to the result page as an auxiliary component rather than modeled as a required evidence stage between submission and review.

SYSTEMIC FIX  
Make defense a first-class run stage: generate three to five candidate-specific questions after Pass A, ask one at a time, persist each response, run Pass B, then move to `Under review`.

### 11

SCREEN  
Lab submission review

PROBLEM  
The submit dialog says only that artifacts, communications, and telemetry will be frozen. It does not list required deliverables or identify missing sections. In the observed run, submission remained possible despite an incomplete investigation and no revised post-change artifact.

USER COST  
Candidates can accidentally submit incomplete work without a neutral last chance to correct omissions.

SEVERITY 1-5  
4

WHY IT EXISTS  
`SimulationSubmitDialog` is generic and receives no scenario deliverable contract or completion state.

SYSTEMIC FIX  
Drive final review from scenario artifact definitions: list each deliverable, mark present/missing without grading, link back to the missing section, and allow early submission only after explicit confirmation.

### 12

SCREEN  
Production analysis/review wait state

PROBLEM  
Candidate copy says “Being scored,” “Scoring is taking longer than expected,” “Working through your submission,” and “This usually takes a few seconds.” The client retries failed analysis itself and exposes failure as scoring latency.

USER COST  
The experience promises instant automated judgment instead of a managed human-reviewed process, and analysis failure looks like a broken score generator.

SEVERITY 1-5  
4

WHY IT EXISTS  
Wave 1 analysis is synchronous score production and the result page owns retry polling.

SYSTEMIC FIX  
After defense, show `Under review`. Treat analysis failure as an internal operations state while candidate copy remains “Review is still in progress.” Notify the candidate when the verified receipt is ready.

### 13

SCREEN  
Lab workbench save state and timer

PROBLEM  
The lab header displays `Autosaved locally (dev)` and uses a browser-runtime countdown. Its localStorage adapter is explicitly development-only and has no production durability or canonical sequence authority.

USER COST  
The best-looking workbench cannot make the core promise that work survives device/browser failure or that timing and evidence order are authoritative.

SEVERITY 1-5  
4

WHY IT EXISTS  
Isolation rules intentionally prevented production DB writes and migrations while the engine was being proven.

SYSTEMIC FIX  
Carry the lab UI/runtime into a production host backed by the existing server session, revisioned persistence adapter, canonical database sequence, and server `endsAt`. Retain local durable fallback only as the offline layer.

### 14

SCREEN  
Opportunity page

PROBLEM  
`/invite/[token]` has strong explanatory copy but no employer logo, no explicit deliverable list, no named set of people the candidate will work with, and no precise AI-use policy of allowed/provided/restricted.

USER COST  
The page reduces some fear but still leaves candidates unsure whether the invitation is authentic, what they will produce, and which tools are permitted.

SEVERITY 1-5  
4

WHY IT EXISTS  
The page is authored from Wave 1 template fields that do not include the full opportunity/preparation contract.

SYSTEMIC FIX  
Create an opportunity view model with company identity, role, duration, work summary, deliverables, employer output, candidate receipt, recording/consent summary, and AI-use policy.

### 15

SCREEN  
Work Receipt sharing controls

PROBLEM  
Candidate sharing can include or exclude individual fields such as limitations and evidence. The target privacy control is `Private` or `Share by link`; it does not allow a candidate to turn a verified record into a selectively favorable score excerpt.

USER COST  
Recipients cannot know whether omitted limitations or evidence materially changed the meaning of the receipt.

SEVERITY 1-5  
4

WHY IT EXISTS  
Field-level sharing was implemented as privacy control before the receipt’s minimum trustworthy disclosure set was defined.

SYSTEMIC FIX  
Define a non-optional public receipt core: identity, work/version/date, reviewed evidence with strength, limitations, and verification status. Privacy controls determine private versus link visibility, not whether trust-critical fields exist.

### 16

SCREEN  
Candidate route error handling

PROBLEM  
In the observed preview, invalid `/record/[token]`, invalid `/sim/[sessionId]`, and unauthenticated `/app/candidate` returned generic Next.js 500 screens. `/work/[token]` exposed “Workspace is not connected.”

USER COST  
Candidates hit technical dead ends instead of knowing whether a link is invalid, expired, belongs to another email, or can be retried safely.

SEVERITY 1-5  
4

WHY IT EXISTS  
Several server pages create Supabase/admin clients before reaching their controlled error branches, and proof-graph configuration state leaks directly to the candidate.

SYSTEMIC FIX  
Resolve route state through candidate-safe error contracts before rendering. Add automated coverage for invalid, expired, revoked, wrong-email, unauthenticated, unavailable-service, and recoverable-retry cases.

## 3. Production versus lab simulation

“Production” below means `/sim/[sessionId]` using `WorkbenchRunner`. “Lab” means `/lab/sim/[scenarioId]` using the isolated simulation engine and role sandbox.

| Target requirement | Production `/sim/[sessionId]` | Lab `/lab/sim/[scenarioId]` | Verdict |
|---|---|---|---|
| Feels like doing the job | Mixed. Resource modules and role workbenches exist, but the underlying grammar still includes single-select, multi-select, numeric decisions, written responses, and scoring. | Strong. The observed Data Analyst route provides real source tables, a working SQL sandbox, evidence pack, memo, people, and a separate AI assistant. | Carry lab |
| Focused mode, minimal shell | Yes. Production workbench removes the normal candidate shell. | Yes. Bare full-height workbench. | Both |
| Top bar: Fydell, company, role, time, save | Fydell, title, role, timer, save are present; company is absent. | Fydell, title, role, timer, save are present; company is absent and save says dev/local. | Rebuild header contract |
| Three panes | No. Left module rail, one central module, stakeholder in a modal drawer. | Yes on desktop: mission/resources, center tools, right evidence/memo/people/assistant. Resizable. | Carry lab |
| Objective, deliverables, resources on left | Mission and modules exist, but deliverables are dispersed through question modules. | Tasks and resources are visible; deliverable is in the right memo/artifact tab rather than clearly summarized on the left. | Lab closer |
| Artifact editor with tabs in center | Written deliverables are separate modules; structured answers dominate for some roles. | Center is Data/Query/Sources; memo sits in right tabs. The work is real, but the exact target pane allocation needs adjustment. | Adapt lab layout |
| Stakeholder threads on right with unread state | One stakeholder drawer, no multiple threads or unread indicators. | Multiple people are available in a right-side tab; no clear per-thread unread indicators were observed. | Carry lab people, add unread |
| Resources stay inside workbench | Yes, resource modules/tables stay inside. | Yes, resource browser opens documents/data inside panes. | Both |
| Exact autosave states | Partial: `Saved`, `Saving…`, `Offline`, and `Save failed. Retry`; not the exact contract, and offline work is not durably local. | Fails: `Autosaved locally (dev)` or `Submitted`. | Neither |
| No work loss | Not guaranteed offline. Server revision saves are good, but unsent offline state is memory-only. | Not production-safe. localStorage is development-only. | Blocking gap |
| Changed fact is realistic stakeholder message | Fails. “Mid-session update” banner, `curveball` API, required adaptation text, explicit acknowledge button. | Better. Deterministic event sends a correction from the Quality Lead and updates world state; a warning toast still says “Changed information.” | Carry lab event model, quiet the toast |
| Server-authoritative calm timer | Yes in shape: based on server `endsAt`, calm until under one minute. | No: browser runtime countdown. | Carry production |
| Submit early | Yes. | Yes. | Both |
| Final review lists deliverables and missing sections | Partial in production: review page shows answers and “Not chosen/written yet,” but it is not driven by required deliverables and uses assessment prompts. | Fails: generic submit dialog only. | Rebuild |
| Candidate-specific defense, one at a time | Fails. Defense is after the result, optional, all questions at once, with internal purpose text. | Evidence engine generates attempt-specific questions, but all render at once; the observed route failed before rendering. | Carry lab evidence, rebuild UX |
| Completion says submitted/review underway/receipt coming | Production immediately polls for scoring and then shows the score report. | Workbench says attempt submitted and links to “defense and evidence review”; proof workbench says “Submitted. Fydell is reviewing evidence.” | Carry proof completion copy |
| Analysis failure remains “review in progress” | Fails; says scoring is taking longer and asks for refresh. | Fails technically; analysis route currently 500s. | Rebuild |
| Canonical evidence ordering | Production has server event paths and revisioned state. | Explicitly browser-local `BROWSER_DEV_STAND_IN`; separated streams are conceptually correct. | Combine both |

### Recommendation

The lab engine should become the product runtime, inside the production session boundary.

Carry from the lab:

- Scenario catalog and validated versioned scenario definitions.
- Config/role-aware workbench composition.
- Real job tools, especially the Data Analyst SQL sandbox.
- Separate person conversations and AI assistant interactions.
- Deterministic, state-triggered changed facts.
- Multiple valid investigation paths.
- Artifact revisions.
- Separate world, candidate, telemetry, and system event streams.
- Observation versus inference.
- `INSUFFICIENT_EVIDENCE`.
- Two-pass analysis and candidate-specific defense.
- Explicit known limitations.

Carry from production:

- Authenticated candidate/session ownership.
- Invitation acceptance.
- Consent and preflight gates, after correcting their content.
- Server `startedAt`/`endsAt`.
- Revision-based server persistence and conflict detection.
- Candidate-safe error boundaries.
- Single-tab write protection.

Do not carry:

- Question-module fallback as the dominant work model.
- Multiple-choice assessment language.
- Numeric scores and score bands.
- `curveball` naming or required-adaptation prompts.
- The result-first, defense-later sequence.
- Browser-local evidence as production truth.
- The combined candidate/reviewer lab analysis route.

Promotion sequence:

1. Make `/invite/[token]` the only candidate token entry.
2. Host the engine under `/sim/[sessionId]` with server time, durable local-first sync, and canonical server event ordering.
3. Split candidate defense from reviewer analysis.
4. Finish review before issuing a Work Receipt.
5. Retire the Wave 1 score renderer from candidate and receipt surfaces.

## 4. Work Receipt gap analysis

### The blunt finding

Fydell has receipt-flavored infrastructure, not the specified Work Receipt primitive.

Existing pieces:

- `sim_credentials` issues a credential number and has private/link visibility.
- `sim_receipt_shares` supports hashed tokens, audience labels, expiry, revocation, access logging, and field scoping.
- `/record/[token]` is a candidate-controlled public share route.
- The candidate result can create and revoke links.

Those pieces solve link security. They do not define the portable verified record.

### What is missing

1. A dedicated `WorkReceipt` domain object, separate from `DecisionBrief`, score result, analysis run, and credential.
2. Candidate identity on the receipt, with a controlled display-name policy.
3. Role family.
4. Simulation/scenario version as a first-class field.
5. Completion/verification date.
6. A plain-English “work completed” summary grounded in actual artifacts.
7. Demonstrated evidence expressed only as `Strong`, `Moderate`, `Limited`, `Contradictory`, or `Not observed`.
8. A mandatory limitations section covering both scenario scope and attempt-specific gaps.
9. A verification status and verifier/review provenance.
10. A receipt version so later review corrections do not silently mutate a previously shared record.
11. A minimum trustworthy share payload. Limitations and verification cannot be optional checkboxes.
12. A private candidate detail route and candidate index of all receipts.
13. A clean status transition from `Under review` to `Verified`.
14. Candidate-visible correction/revocation rules.
15. A dedicated recipient renderer that excludes employer recommendation, ranking, interview feedback, reviewer notes, and sensitive integrity telemetry.

### Existing data that can source it

| Required receipt field | Existing source | Gap before it is trustworthy |
|---|---|---|
| Candidate | Invitation/run candidate identity and profile | Define display-name and privacy policy; do not use an opaque `candidateLabel` in the final object. |
| Role family | `roleKey` in `GoldenPathRun`, scenario metadata, and session template | Normalize to a stable candidate-facing role family. |
| Simulation version | `scenarioVersion`, `engineVersion`, rubric/prompt/model versions in `GoldenPathRun`, `WorkerRunSnapshot`, and engine attempt metadata | Decide which versions are public. Scenario version must be public; internal model/prompt versions may remain verification metadata. |
| Date | `occurredAt`, `submittedAt`, `publishedAt`, event timestamps | Define completion date versus verification date explicitly. |
| Work completed | Artifact revisions, proof `ArtifactContent` fields, scenario artifact definitions, and final candidate artifacts | Generate a plain-English summary from reviewed facts; never let an LLM invent unobserved work. |
| Evidence | `EvidenceClaim` with direction/confidence/support/counter events; engine `CompetencyEvidence`; Northline claims with `evidenceKind`; Pass B defense events | Add an explicit, reviewed receipt-strength field. Do not mechanically expose internal confidence or convert a numeric score. |
| Limitations | `INSUFFICIENT_EVIDENCE` claims, candidate-written `limitations`, counter events, “Intentionally unobserved,” “Deliberately not observed,” and “Known limitations” in `docs/SIMULATION_SPEC.md` | Merge scenario-level and attempt-level limits without allowing either to disappear from a shared receipt. |
| Verification | Claim review statuses, `CLAIM_APPROVED/REJECTED`, `BRIEF_PUBLISHED`, reviewer note, event ledger | Add a receipt-specific verification event/status. A published employer brief is not proof that a candidate receipt was verified. |
| Privacy | `sim_receipt_shares`, hashed token, expiry, revocation, access log | Replace arbitrary field selection with `Private` or `Share by link` around a fixed minimum receipt disclosure set. |

### Evidence-level derivation

The target levels must be stored as a receipt-specific reviewed result:

- `Strong`: clear supporting evidence across the intended observation opportunity, with no material unresolved counterevidence.
- `Moderate`: supporting evidence exists, but coverage, consistency, or defense leaves a meaningful limit.
- `Limited`: some relevant observation exists, but it is too thin to support a broader claim.
- `Contradictory`: observed work materially conflicts with the claimed behavior or contains unresolved counterevidence.
- `Not observed`: the scenario or attempt did not create enough observation opportunity.

Current `direction` and `confidence` fields are inputs, not the final mapping. For example, `STRENGTH + HIGH` may suggest Strong, but only after human review of support and counter events. `INSUFFICIENT_EVIDENCE` should generally become Not observed, not a low score.

### Where receipt and Decision Brief are collapsing

The collapse is already concrete:

- `/record/[token]` renders the same `EvidenceReportV2` used for the candidate result.
- `EvidenceReportV2` is numeric and evaluative.
- The receipt field catalog includes `scenario_score`, `coverage_confidence`, and `evaluator_version`.
- The golden-path `DecisionBrief` contains `recommendation`, `why`, `claimIds`, and `interviewProbes`, but there is no parallel `WorkReceipt` contract.
- `/evidence-report` correctly shows an employer-centric recommendation, interview probes, internal event detail, and a reviewer note. Those fields must not leak into the portable receipt.
- The candidate result combines score report, defense, receipt sharing, and credential number on one page.

The boundary must be structural:

```text
Decision Brief
answers: Should this employer interview this candidate for this role?
contains: employer recommendation, role-specific why, interview probes, employer/reviewer context

Work Receipt
answers: What specific work did this person verifiably complete and demonstrate?
contains: work, evidence strength, limitations, versions, date, verification
```

The two objects may reference the same approved evidence claims. They must not reference each other as interchangeable render modes.

## 5. Screen contracts

### Opportunity page

USER  
An invited candidate who may know little about Fydell and has not yet committed time or personal data.

JOB TO BE DONE  
Decide whether this is a legitimate, worthwhile opportunity and understand exactly what participation involves before creating or verifying an account.

ENTRY CONDITIONS  
A valid, unexpired, unrevoked invitation token. No authenticated account required. Opening the page does not start a run or timer.

PRIMARY INFORMATION  

- Employer logo and verified company name.
- Role title and role family.
- Expected duration and one-sitting/resume policy.
- Plain-English work situation.
- What the candidate will do.
- Deliverables they will produce.
- People/stakeholders available in the work.
- What is recorded.
- That work may be analysed using AI.
- That a Fydell reviewer may review it.
- That integrity signals may be collected.
- What approved evidence the employer receives.
- What the candidate keeps: a private Work Receipt after review.
- AI-use policy: allowed, provided, restricted, or prohibited, stated without ambiguity.
- Expiry date and invited email.
- Adjustment/support route.

PRIMARY ACTION  
Verify email and continue.

SECONDARY ACTION  
Sign in with the invited email if an account already exists.

EMPTY STATE  
Not applicable. A valid invitation must have a company, role, duration, work summary, and output contract. Missing required opportunity data is an operator error, not a candidate blank state.

LOADING STATE  
Stable opportunity-page skeleton with company, role, and action areas reserved. Do not show a spinner over a blank canvas.

ERROR STATE  

- Expired: explain expiry and ask the employer to resend.
- Revoked: explain withdrawal without implying candidate fault.
- Invalid/incomplete: ask the candidate to use the original email link.
- Different signed-in email: name both addresses and offer sign-in with the invited address.
- Service unavailable: say the invitation is intact and provide retry/support. Never start the timer.

EXIT  
Preparation screen after successful identity verification, consent, and acceptance. Candidate may also leave without changing invitation state.

ANALYTICS EVENTS  

- `opportunity_viewed`
- `opportunity_recording_details_opened`
- `opportunity_privacy_details_opened`
- `opportunity_adjustment_help_opened`
- `opportunity_verify_email_started`
- `opportunity_existing_account_selected`
- `opportunity_email_mismatch_seen`
- `opportunity_exit_without_acceptance`

Do not treat passive reading time, scroll depth, or tab switching as candidate evidence.

### Simulation workbench

USER  
An invited, verified, consenting candidate completing realistic work for a specific role and company.

JOB TO BE DONE  
Understand the objective, inspect the available information, use realistic tools, communicate with stakeholders, create and revise work, respond to changed information, and submit a defensible artifact without losing work.

ENTRY CONDITIONS  

- Invitation accepted.
- Invited email verified.
- Consent version recorded.
- Preparation completed.
- System compatibility known.
- Candidate explicitly pressed Start.
- Server created authoritative `startedAt` and `endsAt`.
- Durable local snapshot initialized before the first editable action.

PRIMARY INFORMATION  

- Top bar: Fydell, company, role, calm time remaining, exact save state.
- Left: objective, deliverables, resources, and task context.
- Center: actual work artifact/tool tabs.
- Right: stakeholder threads with role labels and unread indicators.
- AI assistant clearly separate from people, if provided.
- Changed information delivered through the relevant stakeholder.
- No score, competency label, adaptation instruction, or telemetry indicator.

PRIMARY ACTION  
Do the work and save/revise the required artifact.

SECONDARY ACTION  
Ask a stakeholder, inspect a resource, use the provided AI tool, or open final review.

EMPTY STATE  

- A new artifact contains a useful job-shaped structure, not sample answers.
- A new stakeholder thread says who the person is and what kinds of questions they can answer.
- No resource search result says no sources match and preserves the current work.

LOADING STATE  

- Workbench shell and last durable local artifact render immediately when available.
- Server reconciliation happens without blocking typing.
- Resources/tools use local skeletons inside their pane.
- Save state starts at `Reconnecting…` only when reconnecting, never falsely at `Saved`.

ERROR STATE  

- Connection loss sequence: `Reconnecting…` → `Offline — saved locally` → `Reconnected. Saved.` The candidate remains in the workbench.
- Server conflict: preserve both snapshots, keep the candidate’s local work, and resolve without silent overwrite.
- Stakeholder failure: “Replies are delayed. Keep working or try this message again.” Never expose model/provider errors.
- Tool failure: preserve query/input and show a job-tool error in the pane.
- Timer service uncertainty: keep work editable, show time as temporarily unavailable, and reconcile from server.
- Local storage unavailable: block start during preparation rather than discovering it after edits.

EXIT  

- Final review lists every required deliverable and flags missing sections without grading.
- Candidate can return to work or submit early.
- On submit, artifact/events are frozen and the candidate enters defense, then `Under review`.

ANALYTICS EVENTS  

- `simulation_started`
- `resource_opened`
- `tool_executed`
- `artifact_saved`
- `artifact_revised`
- `stakeholder_message_sent`
- `stakeholder_message_received`
- `ai_tool_interaction`
- `changed_fact_released`
- `changed_fact_viewed`
- `final_review_opened`
- `submission_missing_deliverable_seen`
- `simulation_submitted`
- `offline_local_save_started`
- `offline_local_save_recovered`
- `persistence_conflict_detected`

Candidate evidence and product analytics must remain separate event streams.

### Work Receipt detail

USER  
Primary: the candidate who completed the work. Secondary: a recipient using a candidate-created share link.

JOB TO BE DONE  
Candidate: understand and control a trustworthy record of what was verified. Recipient: verify what work was completed, what it demonstrated, and what was not observed.

ENTRY CONDITIONS  

- Run submitted.
- Defense complete or explicitly waived by policy.
- Pass B complete.
- Human review complete.
- Receipt-specific verification event recorded.
- Candidate owns the private receipt.
- Shared view additionally requires a valid, unexpired, unrevoked hashed token.

PRIMARY INFORMATION  

- Candidate name.
- Role family.
- Work Receipt ID and verification status.
- Simulation/scenario version.
- Completion date and verification date.
- Work completed, in plain English.
- Demonstrated evidence grouped by competency with one of: Strong, Moderate, Limited, Contradictory, Not observed.
- Specific observations behind each evidence statement.
- Limitations, always visible.
- Verification provenance in candidate-safe language.
- Privacy state: Private or Share by link.
- Shared view statement that employer-private comments, ranking, interview feedback, and sensitive integrity telemetry are excluded.

PRIMARY ACTION  
Private view: create or copy a share link. Shared view: verify the receipt and read the evidence/limitations.

SECONDARY ACTION  
Private view: revoke link, return to Work Receipts, or report an error in the record.

EMPTY STATE  

- Before verification: do not render an empty receipt. Show `Under review` and explain that the receipt will appear after human review.
- No evidence for a competency: render `Not observed` with the relevant limitation.

LOADING STATE  
Receipt identity, status, and section skeletons. Never flash a score report while the receipt loads.

ERROR STATE  

- Invalid link: link incomplete or receipt unavailable.
- Expired link: candidate must issue a new one.
- Revoked link: candidate withdrew access.
- Receipt corrected/superseded: show that this version is no longer current and, only if authorized, link to the new version.
- Verification service unavailable: show the signed receipt content with verification temporarily unavailable, not a blank 500.

EXIT  
Candidate returns to `Work Receipts`. Shared recipient closes the page; no account creation is required.

ANALYTICS EVENTS  

- `work_receipt_viewed`
- `work_receipt_evidence_expanded`
- `work_receipt_limitations_viewed`
- `work_receipt_share_created`
- `work_receipt_share_copied`
- `work_receipt_share_revoked`
- `work_receipt_share_opened`
- `work_receipt_verification_checked`
- `work_receipt_error_reported`

Do not expose recipient identity to the candidate unless the recipient explicitly authenticated and consented to that disclosure.

## 6. Quality gates

### Gate 1: before the simulation

Question: Can the candidate answer what job this is for, what they are about to do, how long it will take, what will be recorded, what the employer receives, and what they get afterward?

**FAIL**

Evidence observed:

- `/invite/[token]` source provides employer name, role framing, evaluation title, duration, a broad work description, categories of workspace activity recorded, a statement that no camera/microphone/screen recording occurs, employer report/evidence, and a promised Work Receipt.
- The invalid-token browser state is controlled and understandable.
- However, no valid invitation token was available for direct browser verification.
- The page does not show an employer logo, explicit deliverables, or a named preparation contract.
- Most importantly, the disclosed recording/data-use answer is incomplete: it does not plainly state AI analysis, Fydell human review, integrity signals, or that the employer receives approved evidence rather than every recorded action.
- `/work/[token]` fails the gate completely because it starts/loads the proof run directly.

The candidate can answer parts of all six questions on the Wave 1 invitation, but cannot give a complete, informed answer across the actual two-system entry graph.

### Gate 2: during the simulation

Question: Can the candidate answer what the objective is, what information they have, where to do the work, who they can talk to, whether work has saved, and how much time remains?

**FAIL**

Evidence observed:

- The lab workbench clearly exposed the objective/tasks, source list, real data and SQL work area, memo composer, people tab, save label, and 25-minute countdown. The real SQL query returned results, so this was not a static mock.
- Production source also renders a mission/module rail, active work module, one stakeholder drawer, server-derived timer, and a save indicator.
- But the product cannot truthfully answer “has my work saved?” during connection loss. Production may say Offline while unsent work exists only in memory, and the lab says `Autosaved locally (dev)` using explicitly non-production persistence.
- The lab’s post-submit defense route failed to compile in the observed run.
- The production valid session could not be driven in the preview environment; invalid session and candidate-home routes returned 500s.
- Production provides only one generic stakeholder drawer rather than the target visible stakeholder threads.

The lab passes the information-location portion of this gate. The candidate product fails the gate because save truth and end-to-end continuity are not reliable.

## Top ten findings

1. **Severity 5:** Production can lose unsent offline work despite promising that it is saved.
2. **Severity 5:** The lab’s post-submit analysis/defense route currently fails to compile.
3. **Severity 5:** The current “Work Receipt” is a numeric score report behind a secure share link.
4. **Severity 5:** `/work/[token]` starts/loads a proof run before opportunity, verification, consent, preparation, or explicit start.
5. **Severity 5:** Production remains question/score shaped, not job-work shaped.
6. **Severity 5:** Candidate home is an evaluation ledger with no Opportunities, Work Receipts, or Profile information architecture.
7. **Severity 5:** The lab analysis route mixes candidate defense with internal evidence streams and reviewer publishing controls.
8. **Severity 4:** Production delivers the changed fact as an explicit assessment mechanism and tells the candidate what adaptation is required.
9. **Severity 4:** Consent omits explicit AI analysis, Fydell reviewer access, integrity signals, and approved-evidence boundaries.
10. **Severity 4:** Defense occurs after the score report, is optional, reveals internal purpose, and shows all questions at once.

## Final recommendation

Do not polish Wave 1 into the target. Replace its candidate work experience with the lab engine while retaining production identity, session ownership, server time, revision persistence, and canonical event ordering.

Before promotion, fix four blockers:

1. Durable local-first work saving with truthful exact states.
2. The broken analysis import boundary.
3. Separation of candidate defense, reviewer analysis, employer Decision Brief, and candidate Work Receipt.
4. Removal of score/result/assessment grammar from candidate and receipt surfaces.

The Work Receipt should be built as a new verified object over reviewed evidence, not as another presentation mode for `V2PersistedResult` or `DecisionBrief`.
