# Fydell Application Information Architecture

Status: **locked**. The navigation order, the subordination rules, and the
identity rules in this document are not open for reinterpretation. A change to
any of them is a change to this document first, and code second.

Reference bands (F1–F15) are defined in `STRIPE_REFERENCE_FORENSICS.md`.

---

## 1. The locked navigation order

```
Home
Roles
Candidates
Work
Evidence
Work Receipts
Outcomes
────────────
Settings          (pinned to the foot of the rail)
```

Seven working destinations, then Settings. Nothing else is a destination.

### 1.1 What each destination is

| # | Destination | The one question it answers | Primary record |
| --- | --- | --- | --- |
| 1 | Home | What needs me right now, and is this workspace working? | derived — no record of its own |
| 2 | Roles | What work are we hiring for, and what evaluates it? | role + evaluation |
| 3 | Candidates | Who is being considered, and where are they? | invitation + candidate |
| 4 | Work | What work has actually been attempted, and in what state is each attempt? | run / session |
| 5 | Evidence | What did the work show, and what is claimed on the strength of it? | analysed report + evidence items |
| 6 | Work Receipts | What can be shown to someone outside this workspace? | issued receipt |
| 7 | Outcomes | Did the decision hold up? | outcome + post-hire outcome |
| — | Settings | Who is in this workspace and how does it behave? | workspace + membership |

### 1.2 Ordering rationale (why this order is load-bearing)

The order is the lifecycle of one piece of evidence, left to right in time:

`define the work` → `invite people to it` → `they do it` → `it is analysed` →
`it can be shown externally` → `the decision is checked against reality`.

An operator who reads the rail top to bottom reads the product's causal chain.
This is why the order cannot be reshuffled for convenience: reordering breaks
the claim that the rail *is* the model.

### 1.3 Ordering test

**Test IA-1.** The rendered rail contains exactly the seven labels above, in
exactly that order, followed by Settings as the last navigational element before
the identity block. Assert on the ordered array of accessible names.

**Test IA-2.** No destination exists in the rail that is not in the list above.
No destination in the list above is missing. Cardinality is exactly 8.

---

## 2. Subordination rules

Three things that are commonly mistaken for destinations are **not**
destinations. Each is subordinate to a parent object.

### 2.1 Simulation is subordinate to Role / Evaluation

A simulation is the instrument that a Role's Evaluation uses. It has no
independent existence in the operator's mental model: nobody opens "simulations"
to browse them, they open a Role to see what evaluates it.

- **Lives at:** the Role detail surface, and the Evaluation section within it.
- **Never:** a top-level rail item; a sibling of Roles; a global list.
- **Test IA-3.** No rail item resolves to a simulation index. Every route that
  renders a simulation definition is reachable only through a Role or an
  Evaluation, and its breadcrumb names that parent.
- **Current state:** the rail no longer carries a Simulations item — `WORKSPACE_NAV_GROUPS`
  in `src/lib/workspace/navigation.ts` lists the seven locked destinations. But
  `/app/employer/workbench` still routes and still indexes simulations outside
  any destination. This is defect **UI-4** in `FYDELL_UI_SYSTEM.md`.

### 2.2 Decision Brief is subordinate to Candidate

A decision brief is a claim about a person. It is meaningless detached from the
person it is about.

- **Lives at:** the Candidate detail surface.
- **Never:** a top-level rail item; a global "briefs" list; a peer of Evidence.
- **Test IA-4.** Every route rendering a decision brief has a candidate
  identifier in its path or its resolved parent, and the candidate name is
  rendered above the brief.
- **Current ownership:** `proof_decision_briefs` is read today through
  `/api/proof/shortlist` and `/api/proof/runs/[runId]`. Under this IA the brief
  is presented on the Candidate, sourced from the same records.

### 2.3 Shortlist is subordinate to Role

A shortlist is an ordered subset of candidates *for a given role*. A workspace-wide
shortlist is a category error: it would mix people being considered for
different work.

- **Lives at:** the Role detail surface, as a view over that Role's candidates.
- **Never:** a top-level rail item; a child of Evidence.
- **Test IA-5.** Every shortlist view is scoped by a role identifier. A
  shortlist rendered without a role in scope fails.
- **Current state:** `Shortlist` is no longer a rail item, but
  `/app/employer/proof` still routes to a workspace-wide shortlist whose page
  header hardcodes a single role string. This is part of defect **UI-4**.

### 2.4 Subordination summary

| Concept | Parent | Surface it lives on | Forbidden placement |
| --- | --- | --- | --- |
| Simulation | Role → Evaluation | Role detail | rail item, global index |
| Decision Brief | Candidate | Candidate detail | rail item, global index, Evidence child |
| Shortlist | Role | Role detail | rail item, Evidence child |
| Cohort | Evaluation | Evaluation detail | rail item |
| Comparison | two Evidence records | Evidence, as a selection action | rail item |

---

## 3. Identity rules

### 3.1 One workspace identity

The workspace is named **once** in the chrome. Not in the rail header and again
in a workspace summary block and again in an account menu.

- **Canonical location:** the workspace selector at the top of the rail.
- **Test IA-6.** The count of elements in the shell whose text content is the
  workspace name is exactly 1.
- **Current state:** conformant. `WorkspaceSelector` at the top of the rail is
  the single resting rendering at >= 768px, and the mobile header is the single
  rendering below it; the two are breakpoint-exclusive. The selector's popover is
  a transient layer and is excluded while closed. Regression test only.

### 3.2 One user identity

The signed-in person is named **once** in the chrome, at the foot of the rail,
adjacent to Settings.

- **Canonical location:** `AccountMenu` at the foot of the rail.
- **Test IA-7.** The count of elements in the shell rendering the user's name,
  email, or avatar is exactly 1 in the resting state. The popover is a transient
  layer and is excluded while closed.

### 3.3 One persistent invite action

Inviting a candidate is the single global action. It is available from every
route, from exactly one control.

- **Canonical location:** the chrome — the toolbar at >= 768px, the mobile
  header below it. The two are breakpoint-exclusive, never simultaneous.
- **Test IA-8.** For any rendered viewport, the count of elements that open the
  invite modal is exactly 1.
- **Current state:** conformant. `SidebarInvite` renders in `WorkspaceToolbar`
  (`md:flex`) and in the mobile header (`md:hidden`), so exactly one is present
  per viewport. Regression test only.

### 3.4 Settings placement

Settings is pinned to the foot of the rail, grouped with identity rather than
with the seven working destinations. It is a property of the workspace, not a
step in the lifecycle.

- **Test IA-9.** Settings is the last element in the navigation list and is
  visually separated from the seven working destinations by the rail's own
  spacer, not by a group label.

---

## 4. Environment separation

Fydell runs one application in two environments: **Live** and **Sandbox**.

### 4.1 The rule

Live and Sandbox share **one chrome**: the same rail, the same seven
destinations, the same toolbar, the same components, the same tokens. They
differ in exactly two ways — the environment bar, and the data graph behind it.

Sandbox is not a marketing page, not a separate app, and not a route tree with
its own layout. A visitor in Sandbox is looking at the real product with
isolated data.

### 4.2 The environment bar

| Property | Contract |
| --- | --- |
| Height | 28–32px (F2) |
| Position | First element in the document; `top: 0`; full viewport width |
| Presence | Present on 100% of application routes in both environments |
| Content in Live | The workspace's environment name and the data-boundary link |
| Content in Sandbox | An unambiguous statement that this is a sandbox on isolated demo data, and the reset control |
| Colour | Environment identity is carried by a token, never a hardcoded hex |

- **Test IA-10.** The environment bar exists on every authenticated route and on
  every sandbox route. Its computed height is in [28, 32]. Its background
  resolves from a design token.
- **Current state:** conformant in Live. `WorkspaceModeBar` is 32px on
  `--surface-deep` with solid token text, and both the rail and the toolbar are
  offset by that same 32px. It is **not** rendered on Sandbox routes, which is
  part of defect **UI-15** and **SB-D3**.

### 4.3 Isolation

| Property | Contract |
| --- | --- |
| Data | Sandbox reads and writes the isolated proof graph only. See `FYDELL_SANDBOX_SPEC.md`. |
| Crossover | No sandbox record may appear in any live list, and no live record in any sandbox list. |
| Identities | Sandbox uses generic demo identities **Candidate 01, Candidate 02, Candidate 03, Candidate 04** only. No named synthetic people, ever. |
| Production paths | `/sim/[sessionId]`, `WorkbenchRunner`, v2 scoring, and `sim_session_events` write paths are untouched by anything in this IA. |

- **Test IA-11.** Requesting a sandbox record ID through a live API returns 403
  or 404. Requesting a live record ID through a sandbox API returns 403 or 404.
- **Test IA-12.** Grep of all sandbox fixtures and sandbox-rendered copy yields
  zero personal names. The only permitted candidate identifiers are
  `Candidate 01` through `Candidate 04`.

---

## 5. Activation states become operational states

Fydell has no onboarding checklist that is separate from the product. Each
activation item is a **state of a real record**, and when the state is reached
the item is replaced by the operational surface that owns it.

| Activation item | Derived from | Operational surface it becomes |
| --- | --- | --- |
| Workspace exists | organization record | Settings → workspace |
| A role has an evaluation | published evaluation for a role | Roles |
| A candidate has been invited | invitation record count > 0 | Candidates |
| Work has been attempted | run/session record count > 0 | Work |
| Evidence has been analysed | analysed report count > 0 | Evidence |
| A decision has been recorded | decision brief with a recorded decision | Candidate detail |
| An outcome has been recorded | outcome record | Outcomes |

### 5.1 Rules

1. No activation item may be dismissed. It is satisfied or it is not.
2. No activation state is stored in local storage, a cookie, or a `dismissed`
   column. It is computed from record existence on every request.
3. When every item is satisfied, the activation panel is removed from the DOM
   entirely — not collapsed, not greyed.
4. The activation panel occupies the 220–280px column (F14). It is never a
   full-width band.

- **Test IA-13.** With all underlying records present, the activation panel does
  not exist in the DOM.
- **Test IA-14.** Deleting an underlying record returns the corresponding item
  to its incomplete state on the next request, with no cache or flag involved.
- **Current state:** the ladder is not rendered. `SetupPath` and `ProgressRing`
  are no longer imported by `src/app/app/employer/page.tsx`; the seven items have
  collapsed to one binary branch on `hasInvited`. The `SetupPath` component still
  exists and its derivation logic already satisfied IA-13 and IA-14, so the
  resolution is to restore it in the 220–280px column rather than to rebuild it.
  Defect **UI-12**.

---

## 6. Route ownership

Current ownership, read from `src/components/employer/EmployerShell.tsx`,
`src/app/app/employer/**`, `src/app/sandbox/**`, and
`src/lib/sim-engine/proof/sandbox/**`.

| Locked destination | Current route | Current owner | Gap |
| --- | --- | --- | --- |
| Home | `/app/employer` | `src/app/app/employer/page.tsx` | Right column 360px, not 240–280 (F15, UI-11). Activation ladder not rendered (F14, UI-12). No counts surface (UI-13). |
| Roles | `/app/employer/roles`, `/app/employer/roles/[roleKey]` | roles routes | Exists. Legacy `/app/employer/assessments` still indexes evaluations alongside it (UI-4). Role-scoped shortlist not yet the only shortlist. |
| Candidates | `/app/employer/candidates`, `/app/employer/candidates/[sessionId]` | candidates routes, `CandidatesTable.tsx` | Exists. Decision brief presentation must be confirmed on the detail surface (IA-4). |
| Work | `/app/employer/work` | work route | Exists. Legacy `/app/employer/workbench` still routes and still indexes simulations (UI-4). Rows are `min-h-[52px]`, outside F11 (UI-9). |
| Evidence | `/app/employer/evidence`, `/app/employer/evidence/[runId]` | evidence routes | Exists. Legacy `/app/employer/reports` and `/app/employer/proof` still route to competing indexes (UI-4). |
| Work Receipts | `/app/employer/receipts`, `/receipts/[publicId]`, `/sandbox/receipts/[publicId]` | `WorkReceiptView.tsx`, `ArtifactWorkReceiptIssuer` | Exists. Public and sandbox projections must be confirmed isolated (IA-11, WR-7). |
| Outcomes | `/app/employer/outcomes`, `POST /api/proof/runs/[runId]/outcomes` | `proof_outcomes`, `proof_interview_feedback`, `proof_post_hire_outcomes` | Exists. Read surface must render "no outcome recorded" rather than a zero (O-2). |
| Settings | `/app/employer/settings` | `src/app/app/employer/settings/page.tsx` | `max-w-[860px]` is conformant (F5). Control heights mix 36px and 42px (F10, UI-8). |

### 6.1a Routes with no owning destination

These still render and still index records the seven destinations now own. Each
is defect **UI-4**.

`/app/employer/assessments`, `/app/employer/assessments/report/[sessionId]`,
`/app/employer/workbench`, `/app/employer/workbench/[scenarioId]`,
`/app/employer/proof`, `/app/employer/proof/[runId]`,
`/app/employer/proof/calibration`, `/app/employer/reports`,
`/app/employer/compare`, `/app/employer/cohort`.

`workspaceSection()` falls back to `WORKSPACE_NAV_ITEMS[0]` for each of them, so
the toolbar labels every one of these routes "Home" while the rail shows no
active destination. That is defect **UI-3**.

### 6.1 Ownership rules going forward

1. One destination owns one record type's index. A record type indexed in two
   destinations is a defect.
2. A detail route is always nested under the destination that owns its index.
3. `/app/employer/compare` and `/app/employer/cohort` remain contextual actions,
   not destinations, per section 2.4.
4. Nothing in this IA authorises a change to `/sim/[sessionId]`,
   `WorkbenchRunner`, v2 scoring, `sim_session_events` write paths, or any
   Supabase migration.

---

## 7. Navigation acceptance checklist

| ID | Assertion |
| --- | --- |
| IA-1 | Rail renders exactly Home, Roles, Candidates, Work, Evidence, Work Receipts, Outcomes, in that order. |
| IA-2 | Settings is the eighth and last navigational element, at the foot of the rail. |
| IA-3 | No rail item resolves to a simulation index; simulations are reachable only through Role → Evaluation. |
| IA-4 | Every decision brief route is candidate-scoped. |
| IA-5 | Every shortlist view is role-scoped. |
| IA-6 | Workspace name appears exactly once in the shell. |
| IA-7 | User identity appears exactly once in the shell. |
| IA-8 | The invite action appears exactly once per rendered viewport. |
| IA-9 | Settings is separated from the seven working destinations by spacing, not by a group label. |
| IA-10 | The environment bar is present on every application route, 28–32px, token-coloured. |
| IA-11 | Cross-environment record access returns 403 or 404. |
| IA-12 | Sandbox contains no named synthetic people; identities are Candidate 01–04 only. |
| IA-13 | The activation panel is absent from the DOM when all items are satisfied. |
| IA-14 | Activation state is derived from records on every request, with no dismissal flag. |
| IA-15 | Each of the seven destinations owns exactly one record index; no record type is indexed twice. |
