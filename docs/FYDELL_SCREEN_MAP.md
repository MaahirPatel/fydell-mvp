# Fydell Screen Map

Status: **acceptance contract**. Every row below is a build target with a pass
or fail test. Nothing here is illustrative.

- Reference bands `F1`–`F15` are defined in `STRIPE_REFERENCE_FORENSICS.md`.
- Navigation rules `IA-1`–`IA-15` are defined in `FYDELL_APP_INFORMATION_ARCHITECTURE.md`.
- Defects `UI-1`–`UI-15` and the anti-slop constraints are defined in `FYDELL_UI_SYSTEM.md`.
- Component names refer to real modules under `src/components/`.
- Data names refer to real tables and real loaders under `src/app/app/employer/_lib/`
  and `src/lib/sim-engine/proof/`.

No screen in this map introduces a new metric, a new integration, or a new
record type. Every value rendered has a named source.

---

## 1. Master mapping table

| Stripe screen | Design principle extracted | Fydell user job | Fydell screen | Data required | Components required | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- |
| Dashboard Home | A home is a triage surface, not a summary. Every number is a route to the place you act on it, and zero-data surfaces state absence rather than render zeros. | "Tell me what is waiting on me, and whether this workspace is healthy." | **Home** — `/app/employer` | `getOverviewMetrics`, `getOperationalSnapshot` (attention + activity), `getInvitationRecords`, `getReportRecords`, `getWorkspaceHealth`, `getEmployerCatalog` | `PageHeader`, `MetricStrip`, `AttentionQueue`, `ActivityFeed`, `SetupPath`, `Panel`, `PanelSection`, `ProgressRing`, `EmptyState` | H-1…H-8 (§2.1) |
| Products / catalog | The catalogue defines what everything downstream refers to. Instruments live inside the thing they measure, never beside it. | "What work are we hiring for, and what evaluates it?" | **Roles** — `/app/employer/roles` (index), `/app/employer/roles/[roleKey]` (detail) | `getEmployerCatalog` → `CatalogRole` and its `sims`; per-role candidate counts from `proof_invitations`; per-role shortlist from `proof_runs.shortlisted` | `PageHeader`, `Table`, `Panel`, `PanelSection`, `StatusTag`, `Tabs`, `EmptyState` | R-1…R-7 (§2.2) |
| Customers list | A list of people is 4–6 sortable columns of identifier, state, amount, and time. The row is the target. | "Who is being considered, and where is each of them?" | **Candidates** — `/app/employer/candidates` | `getInvitationRecords`, `proof_invitations`, run state from `proof_runs.status` | `PageHeader`, `CandidatesTable`, `Table`, `StatusTag`, `RowMenu`, `EmptyState`, `InviteCandidateModal` | C-1…C-7 (§2.3) |
| Customer detail | The object detail is the one place every claim about that object is assembled, above its history. | "What do we know about this candidate, and what are we claiming?" | **Candidate detail** — `/app/employer/candidates/[invitationId]` | `proof_invitations`, `proof_runs` for that candidate, `proof_decision_briefs` (recommendation, why, strengths, concerns, published), `proof_outcomes` | `PageHeader`, `Panel`, `PanelSection`, `StatusTag`, `EmployerReviewActions`, `Table`, `Button` | CD-1…CD-8 (§2.4) |
| Payments list | Every attempt at a transaction is listed, including the failed ones, with state and time on every row. | "What work has actually been attempted, and in what state is each attempt?" | **Work** — `/app/employer/work` | `proof_runs` (id, status, created/updated), joined `proof_invitations.email`, evaluation from `CatalogRole.sims` | `PageHeader`, `Table`, `StatusTag`, `RowMenu`, `EmptyState`, `Skeleton` | W-1…W-7 (§2.5) |
| Payment detail + timeline | One object, its state, and an append-only timeline of what happened to it, each entry traceable to a source record. | "What happened inside this attempt?" | **Work detail** — `/app/employer/work/[runId]` | `proof_runs`, run event stream via `EVENT_STREAMS` / `parseEventContract`, read-only `sim_session_events` for live runs, `analyzePassA` / `analyzePassB` results | `PageHeader`, `Panel`, `PanelSection`, `StatusTag`, `Table`, `Tabs` | WD-1…WD-8 (§2.6) |
| Radar review queue | A queue is ordered by whose turn it is and how long it has waited, and clearing it is the same act as recording a decision. | "Which analysed work still has no decision recorded against it?" | **Evidence** — `/app/employer/evidence` | `getReportRecords` (`needsReview`, `bandLabel`, `completedAt`), `proof_runs.status`, evidence items with OBSERVATION / INFERENCE classification | `PageHeader`, `ReportsList`, `Table`, `StatusTag`, `Tabs`, `EmptyState` | E-1…E-8 (§2.7) |
| Payment / object evidence view | Supporting detail is shown at the level of the individual fact, with its origin, never as an unattributed score. | "What did the work show, fact by fact, and what is inference?" | **Evidence detail** — `/app/employer/evidence/[reportId]` | Report record, evidence items with `OBSERVATION` vs `INFERENCE`, competency outcomes including `INSUFFICIENT_EVIDENCE` | `PageHeader`, `Panel`, `PanelSection`, `StatusTag`, `Table`, `EmployerReviewActions` | ED-1…ED-7 (§2.8) |
| Developers → Events log | An append-only log of externally verifiable facts, addressable by stable ID, readable by someone outside the account. | "What can I show to someone who is not in this workspace?" | **Work Receipts** — `/app/employer/receipts` (index), `/receipts/[publicId]` (public) | `ArtifactWorkReceiptIssuer` records, `publicReceiptProjection`, `canonicalize` hash, issue time, expiry | `PageHeader`, `Table`, `WorkReceiptView`, `StatusTag`, `Button`, `Toast`, `EmptyState` | WR-1…WR-8 (§2.9) |
| Reports (financial reporting) | Reporting reconciles what the system claimed against what actually happened. Absence of a result is shown as absence, not as zero. | "Did the decisions this workspace made hold up?" | **Outcomes** — `/app/employer/outcomes` | `proof_outcomes` (offer_made, offer_accepted, hired, reason), `proof_interview_feedback` (interviewed, advanced, probes_used, evidence_confirmed, notes), `proof_post_hire_outcomes` | `PageHeader`, `Table`, `Panel`, `PanelSection`, `StatusTag`, `Field`, `Dialog`, `EmptyState` | O-1…O-8 (§2.10) |
| Settings | Settings is a form column, not a canvas. Grouped, width-capped, and every field writes one record. | "Configure this workspace and who is in it." | **Settings** — `/app/employer/settings` | Organization record, membership rows and roles, workspace name and logo, environment configuration | `PageHeader`, `Panel`, `PanelSection`, `Field`, `Button`, `WorkspaceNameForm`, `WorkspaceLogoForm`, `Table`, `Toast` | S-1…S-7 (§2.11) |
| Test-mode banner | Environment is a persistent property of the chrome, identical in structure across environments, never a separate application. | "Am I looking at real work or at demo data?" | **Environment bar** — global chrome | Environment resolved server-side; sandbox availability via `readSandboxAvailability` / `checkSandboxHealth` | Environment bar within `EmployerShell` | EB-1…EB-6 (§2.12) |
| Activation checklist | Activation items are states of real records that hand off to the operational surface that owns them, then disappear. | "What has to be true before this workspace works?" | **Activation panel** — on Home, 220–280px column | Record existence only: organization, published evaluation, invitation count, run count, analysed report count | `SetupPath`, `ProgressRing`, `Panel` | A-1…A-6 (§2.13) |
| Global search | One search field with a floor width, one result surface, and results that navigate to objects rather than to filtered lists. | "Find one candidate or one run by name or identifier." | **Search** — toolbar control | `proof_invitations.email`, candidate label, `proof_runs.id` | Search control within the toolbar, `Table` for results | SR-1…SR-5 (§2.14) |

---

## 2. Per-screen acceptance contracts

Every criterion is a mechanical assertion. "Pass" requires all criteria for that
screen.

### 2.1 Home — `/app/employer`

| ID | Criterion |
| --- | --- |
| H-1 | Exactly one element on the page has computed `font-size` >= 24px, and it is the page title (F7). |
| H-2 | If every metric value is 0, the metric band is absent from the DOM. If any is non-zero, all metrics render and each is a link to the destination that owns that record. |
| H-3 | Every metric tile renders the rule that produced its number, sourced from the same loader as the number. |
| H-4 | The attention queue is ordered by whose turn it is, then by elapsed time descending. Every row states the state, the reason, and the elapsed time. |
| H-5 | The activation panel, when present, occupies a 220–280px column (F14) and is absent from the DOM once every item is satisfied (IA-13). |
| H-6 | The secondary right column computes to 240–280px (F15). The current `360px` value fails. |
| H-7 | Activity rows render recorded events only. No unsubmitted candidate work is rendered anywhere on this page. |
| H-8 | Workspace health conditions render only workspace-level conditions. A condition already reported per-candidate in the attention queue does not appear twice. |

### 2.2 Roles — `/app/employer/roles`, `/app/employer/roles/[roleKey]`

| ID | Criterion |
| --- | --- |
| R-1 | The Roles index is reachable from the rail at position 2 (IA-1). |
| R-2 | Role detail renders the role's evaluations, and each evaluation renders the simulation that instruments it. No simulation is reachable except through this path (IA-3). |
| R-3 | The shortlist for a role is rendered on that role's detail surface and is scoped by `roleKey` (IA-5). A shortlist view without a role in scope fails. |
| R-4 | The index has 4–6 columns; every column is an identifier, a state, a count, or a time. Row height is 40–44px (F11). |
| R-5 | Counts on the index are computed from `proof_invitations` and `proof_runs` for that role, not from a stored aggregate. |
| R-6 | An unpublished or unavailable evaluation renders as a state on the role, never as a hidden row. |
| R-7 | With no roles available to the workspace, an `EmptyState` names the absence and offers the one available next action. No sample role is rendered. |

### 2.3 Candidates — `/app/employer/candidates`

| ID | Criterion |
| --- | --- |
| C-1 | Column count is 4–6. Row height is 40–44px (F11). The entire row is the navigation target to candidate detail. |
| C-2 | Candidate state derives from the invitation record and `proof_runs.status`. No state string exists in the UI that has no backing value. |
| C-3 | The search query parameter `q` filters this list server-side and is reflected in the URL. |
| C-4 | In Sandbox, the only candidate identifiers rendered are `Candidate 01` through `Candidate 04` (IA-12). |
| C-5 | The invite action on this page delegates to the single global invite control; it does not render a second invite button (IA-8). |
| C-6 | Elapsed time is rendered with tabular numerals and a full-precision title attribute. |
| C-7 | With zero candidates, an `EmptyState` renders. No ghost rows, no skeleton left in place of data. |

### 2.4 Candidate detail — `/app/employer/candidates/[invitationId]`

| ID | Criterion |
| --- | --- |
| CD-1 | The header renders identifier, state, and time before any panel (§9 of the forensics). |
| CD-2 | The decision brief renders on this surface and only on this surface (IA-4). Fields come from `proof_decision_briefs`: `recommendation`, `why`, `strengths`, `concerns`, `published`. |
| CD-3 | An unpublished brief renders as unpublished with the publish action; it is never silently hidden and never rendered as published. |
| CD-4 | Every run this candidate attempted is listed with state and time, linking to Work detail. |
| CD-5 | Panel nesting depth does not exceed 2. |
| CD-6 | Recording a decision writes through the existing review path; no new write path is introduced by this screen. |
| CD-7 | Where evidence is insufficient, the brief renders `INSUFFICIENT_EVIDENCE` explicitly rather than omitting the competency. |
| CD-8 | No metric appears on this surface that is not read from a named column. |

### 2.5 Work — `/app/employer/work`

| ID | Criterion |
| --- | --- |
| W-1 | The list includes every run regardless of terminal state, including failed and abandoned runs. A run is never hidden because it did not succeed. |
| W-2 | Columns: candidate identifier, evaluation, state, elapsed/updated time, and at most two more. Count is 4–6. |
| W-3 | Row height 40–44px (F11); the row is the target to `/app/employer/work/[runId]`. |
| W-4 | State labels are the literal `proof_runs.status` values mapped through one shared label map. Two labels for one status is a failure. |
| W-5 | This destination is labelled **Work** and sits at rail position 4. The legacy `/app/employer/workbench` index does not remain reachable alongside it (IA-3, UI-4). |
| W-6 | Loading renders `Skeleton` at the true row height; it never renders placeholder text. |
| W-7 | With zero runs, an `EmptyState` names the absence and links to Candidates. |

### 2.6 Work detail — `/app/employer/work/[runId]`

| ID | Criterion |
| --- | --- |
| WD-1 | Header is identifier, state, time, in that order, before any panel. |
| WD-2 | The timeline is append-only and every entry has a timestamp and a named source record. |
| WD-3 | Candidate/telemetry events and scenario/world events are rendered as distinct streams, per `EVENT_STREAMS`. They are never merged into one undifferentiated feed. |
| WD-4 | AI assistant interactions render as `AiToolInteraction`, visually and structurally distinct from `PersonConversation` entries. |
| WD-5 | The simulation that produced this run is named with a link to its parent Role and Evaluation, not to a simulation index (IA-3). |
| WD-6 | Live-run event data is read-only. This screen performs no write against `sim_session_events`. |
| WD-7 | `/sim/[sessionId]` and `WorkbenchRunner` are not modified, imported into, or wrapped by this screen. |
| WD-8 | Panel nesting depth does not exceed 2. |

### 2.7 Evidence — `/app/employer/evidence`

| ID | Criterion |
| --- | --- |
| E-1 | The default view is the review queue: analysed reports with no decision recorded, ordered by elapsed time descending. |
| E-2 | The queue count rendered in the header equals the row count rendered in the body. A disagreement is a failure. |
| E-3 | Row height 40–44px (F11); columns 4–6. |
| E-4 | A band or rating label renders only when present on the record; absence renders as absence, never as a default or a zero. |
| E-5 | Green is used only for a genuinely completed state. It is not used for a favourable rating. |
| E-6 | Filters are reflected in the URL and are server-applied. |
| E-7 | This destination sits at rail position 5 and does not contain a shortlist child. The legacy `/app/employer/proof` and `/app/employer/reports` indexes do not remain reachable alongside it (IA-5, IA-15, UI-4). |
| E-8 | With zero analysed reports, an `EmptyState` renders and links to Work. |

### 2.8 Evidence detail — `/app/employer/evidence/[reportId]`

| ID | Criterion |
| --- | --- |
| ED-1 | Every evidence item is labelled `OBSERVATION` or `INFERENCE`. An unlabelled item fails. |
| ED-2 | Every `OBSERVATION` links to the timeline entry or artefact that produced it. |
| ED-3 | Competency outcomes support and render `INSUFFICIENT_EVIDENCE` as a first-class result. |
| ED-4 | No aggregate score is rendered that cannot be decomposed on this page into the items that produced it. |
| ED-5 | The decision action on this page writes through the existing review path only. |
| ED-6 | Comparison is available as a selection action from Evidence; it is not a rail destination. |
| ED-7 | Panel nesting depth does not exceed 2. |

### 2.9 Work Receipts — `/app/employer/receipts`, `/receipts/[publicId]`

| ID | Criterion |
| --- | --- |
| WR-1 | The in-workspace index lists every issued receipt with its public identifier, the run it attests, issue time, and state. |
| WR-2 | The public view at `/receipts/[publicId]` renders `publicReceiptProjection` only. No field outside that projection reaches the public surface. |
| WR-3 | The public view renders without authentication and without workspace chrome. |
| WR-4 | The canonical hash from `canonicalize` is rendered on both the internal and the public view, and the two values are identical. |
| WR-5 | A not-found or expired public identifier renders a stated not-found surface with no workspace data leaked. |
| WR-6 | Copying a receipt link confirms through `Toast`; it does not navigate. |
| WR-7 | Sandbox receipts resolve only under the sandbox receipt path and return not-found on the live public path (IA-11). |
| WR-8 | With zero issued receipts, an `EmptyState` renders and links to Evidence. |

### 2.10 Outcomes — `/app/employer/outcomes`

| ID | Criterion |
| --- | --- |
| O-1 | Every value rendered comes from `proof_outcomes`, `proof_interview_feedback`, or `proof_post_hire_outcomes`. No derived rate is rendered that is not computed from these rows on the page. |
| O-2 | A candidate with no recorded outcome renders as "no outcome recorded", never as a negative outcome and never as zero. |
| O-3 | `evidence_confirmed` renders its three literal states — confirmed, contradicted, unclear — and never collapses them to a binary. |
| O-4 | Recording an outcome writes through the existing `POST /api/proof/runs/[runId]/outcomes` route. No new write path is introduced. |
| O-5 | Post-hire fields (`days_since_start`, `manager_assessment`, `ramp_status`, `retention_status`, `qualitative_feedback`) render only when a post-hire record exists. |
| O-6 | No forecast, benchmark, industry average, or comparison against data this workspace does not own is rendered. |
| O-7 | Row height 40–44px (F11); columns 4–6. |
| O-8 | With zero outcomes, an `EmptyState` renders and links to Candidates. |

### 2.11 Settings — `/app/employer/settings`

| ID | Criterion |
| --- | --- |
| S-1 | The content column computes to a `max-width` of 760–880px (F5). Inheriting the 1320px page canvas fails. |
| S-2 | Every control height is 32–40px (F10). The 42px `.platform-input` fails (UI-8). |
| S-3 | Settings is the last rail element, grouped with identity (IA-9). |
| S-4 | Every field writes exactly one record and confirms through `Toast`. |
| S-5 | Membership roles render the literal role values from the membership record through one shared label map. |
| S-6 | No setting is rendered that has no effect. No toggle without a write path. |
| S-7 | Destructive settings require explicit confirmation through `Dialog`, naming the object being changed. |

### 2.12 Environment bar — global chrome

| ID | Criterion |
| --- | --- |
| EB-1 | Height computes to 28–32px (F2), `top: 0`, full viewport width. |
| EB-2 | Present on 100% of application routes in both Live and Sandbox (IA-10). |
| EB-3 | Background and text colour resolve from design tokens. Currently conformant — `--surface-deep` with solid token text. Regression test only. |
| EB-4 | No text in the bar carries hierarchy through opacity. Currently conformant. Regression test only. |
| EB-5 | The toolbar's and the rail's sticky offsets equal the bar's own computed height, not a hardcoded literal. |
| EB-6 | In Sandbox the bar states unambiguously that the data is isolated demo data and exposes the reset control. |

### 2.13 Activation panel — on Home

| ID | Criterion |
| --- | --- |
| A-1 | Every item's state is computed from record existence on each request. No dismissal flag, cookie, or local storage participates (IA-14). |
| A-2 | No item can be dismissed. |
| A-3 | When all items are satisfied the panel is absent from the DOM, not collapsed (IA-13). |
| A-4 | The panel occupies a 220–280px column (F14). |
| A-5 | Each completed item's count agrees with the count shown by the operational surface it hands off to. |
| A-6 | The panel's action for each item routes to the destination that owns that record, or invokes the single global invite action. |

### 2.14 Search — toolbar control

| ID | Criterion |
| --- | --- |
| SR-1 | The field computes to 320–360px wide and 32–36px tall at >= 1024px (F6). No search control currently exists, so this criterion is unmet (UI-1). |
| SR-2 | Exactly one search control exists per rendered viewport. |
| SR-3 | Results navigate to objects, and a submitted query is reflected in the URL. |
| SR-4 | Search covers candidates and runs. It does not claim to cover records it cannot reach. |
| SR-5 | An empty result set states that nothing matched the query, quoting the query. |

---

## 3. Screens that are explicitly not built

| Not a screen | Why | Where the capability lives |
| --- | --- | --- |
| Simulations index | Simulation is subordinate to Role/Evaluation (IA-3). | Role detail |
| Decision briefs index | A brief is subordinate to a Candidate (IA-4). | Candidate detail |
| Workspace-wide shortlist | A shortlist is subordinate to a Role (IA-5). | Role detail |
| Cohort | Subordinate to an Evaluation. | Evaluation detail |
| Compare | An action on two Evidence records. | Evidence, as a selection action |
| Analytics / insights dashboard | Would require metrics this product does not own. Forbidden by the anti-slop constraints. | — |
| Integrations directory | No integrations exist. Rendering one would be fabrication. | — |

---

## 4. Untouched production paths

No screen in this map modifies, wraps, or re-routes any of the following:

- `/sim/[sessionId]` and `/sim/[sessionId]/result`
- `WorkbenchRunner`
- v2 scoring
- `sim_session_events` write paths
- live report generation
- Supabase migrations

Work detail (§2.6) reads live run events. It performs no writes against them.
