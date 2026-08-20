# Fydell UI System

Status: **acceptance contract**.

This document defines the geometry, type, colour, and component rules for the
Fydell application shell and its record surfaces; it enumerates the fifteen
inconsistencies measured in the current implementation; and it states the
anti-slop constraints that no surface may violate.

- Reference bands `F1`–`F15`: `STRIPE_REFERENCE_FORENSICS.md`
- Navigation rules `IA-1`–`IA-15`: `FYDELL_APP_INFORMATION_ARCHITECTURE.md`
- Screen contracts: `FYDELL_SCREEN_MAP.md`
- Sandbox contracts `SB-*`: `FYDELL_SANDBOX_SPEC.md`

Colour, spacing, radius, and type tokens are declared in `src/app/globals.css`.
That file is the single source of truth for values. This document is the single
source of truth for **which token is allowed where**.

---

## 1. Target geometry

Measured against `src/components/employer/EmployerShell.tsx`,
`src/lib/workspace/navigation.ts`, `src/app/app/employer/**`,
`src/components/sandbox/**`, and `src/app/globals.css` as they currently stand.

| Property | Target | Reference | Current value | Status |
| --- | --- | --- | --- | --- |
| Rail width | 216–224px | F1 | `w-[224px]` | conformant, at the ceiling |
| Environment bar height | 28–32px | F2 | `h-8` = 32px, `--surface-deep`, token text | conformant, at the ceiling |
| Toolbar height | 56–64px | F3 | `h-14` = 56px, `sticky top-8` matching the bar's own 32px | conformant, at the floor |
| Main gutter | 48px | F4 | `px-5 / sm:px-8 / lg:px-12` = 20 / 32 / 48px | **UI-6** |
| Settings measure | 760–880px | F5 | `max-w-[860px]` | conformant |
| Search field | 320–360px x 32–36px | F6 | no search control exists | **UI-1** |
| Page title | 24–26px | F7 | `text-app-page` = 26px, one per page via `PageHeader` | conformant |
| Body text | 13.5–14.5px | F8 | `--type-app-body` = 14px | conformant |
| Nav text | 13–14px | F9 | `13.5px` rail, `11px` mobile | **UI-7** |
| Control height | 32–40px | F10 | `h-8` = 32, `h-9` = 36, `.platform-input` = 42 | **UI-8** |
| Row height | 40–44px | F11 | home list ≈ 36px, roles/work `min-h-[52px]` | **UI-9** |
| Border alpha | 8–14% | F12 | subtle 11%, default 18%, strong 29% | **UI-10** |
| Radius ladder | 4 / 6 / 8px | F13 | tokens 4 / 6 / 10 / 14, plus local `9px`, `8px`, `7px`, `6px` literals | **UI-5** |
| Activation panel | 220–280px | F14 | no activation panel is rendered | **UI-12** |
| Right column | 240–280px | F15 | `360px` | **UI-11** |

### 1.1 Already conformant — do not regress

The following were previously out of band and are now conformant. Each has a
regression test in §7.

| Property | Now |
| --- | --- |
| Environment bar | 32px, `--surface-deep`, solid token text, no hardcoded hex, no opacity-carried hierarchy |
| Sticky offsets | Rail and toolbar both offset by the bar's own 32px |
| Settings measure | `max-w-[860px]`, inside F5 |
| Rail order | Home, Roles, Candidates, Work, Evidence, Work Receipts, Outcomes, then Settings (IA-1, IA-2) |
| Global action | One invite control per rendered viewport — toolbar at >= 768px, mobile header below (IA-8) |
| Workspace identity | One resting element per viewport (IA-6) |
| User identity | One element, `AccountMenu` at the foot of the rail (IA-7) |
| Demo identities | `Candidate 01`–`Candidate 04` in `fixture.ts`; no named synthetic people (AS-9, AS-10) |

---

## 2. Type system

### 2.1 The permitted set

Five sizes. The application chrome and record surfaces use these and nothing
else.

| Token | Value | Role |
| --- | --- | --- |
| `--type-app-page` | 26px | Page title. Exactly one per page. |
| `--type-app-section` | 17px | Panel and section headings. |
| `--type-app-body` | 14px | Records, cells, descriptions. |
| `--type-app-meta` | 12.5px | Timestamps, counts, definitions, helper text. |
| nav | 13.5px | Rail and tab labels. To be promoted to a token. |

**Rule T1.** Every text-bearing element in the application resolves its size
from one of the five above, via a `text-app-*` utility or the nav token. An
inline arbitrary size is a defect.

**Rule T2.** The set of distinct computed `font-size` values on any application
page has cardinality <= 5.

**Rule T3.** Exactly one element per page has computed `font-size` >= 24px, and
it is the page title. A metric numeral that ties the page title is a defect.

**Rule T4.** Hierarchy is carried by solid colour (`--text-primary`,
`--text-secondary`, `--text-tertiary`) and weight. Never by `opacity`, never by
an alpha text colour. This is already stated in `globals.css` and is currently
violated by the environment bar.

**Rule T5.** Numerals in any column that is compared down a page use
`font-variant-numeric: tabular-nums`.

### 2.2 Weight

| Weight | Use |
| --- | --- |
| 400 | Body, meta |
| 500 | Emphasised row identifiers, active nav |
| 540–560 | Headings, page title |

No weight above 560 in the application. No italic.

---

## 3. Colour

### 3.1 Rules

**Rule C1.** Every colour resolves from a token in `globals.css`. A hardcoded
hex or `rgb()` in a component is a defect.

**Rule C2.** Green (`--fydell-good`, `--status-positive-*`) means a real
completed state. It never means a favourable rating, a good score, or a
recommendation.

**Rule C3.** Amber (`--fydell-changed`, `--status-attention-*`) means changed
information or review required.

**Rule C4.** Red (`--fydell-risk`) means unsupported or destructive.

**Rule C5.** Exactly one count on Home may carry the attention colour: the one
that means "act here". Colouring several removes the signal.

**Rule C6.** Evidence colours (`--evidence-observed`, `--evidence-generated`,
`--evidence-support`, `--evidence-uncertain`, `--evidence-counter`) are reserved
for evidence classification. They are not a general palette.

**Rule C7.** Colour is never the only carrier of meaning. Every state that uses
colour also carries a label.

### 3.2 Borders

| Token | Alpha | Permitted use |
| --- | --- | --- |
| `--border-subtle` | 11% | All structural hairlines: rail edge, toolbar edge, panel edge, row separators |
| `--border-default` | 18% | Interactive edges only: control outlines, avatar rings |
| `--border-strong` | 29% | Emphasis on a control, never structure |

**Rule C8.** Structure uses `--border-subtle` only. A structural edge at
`--border-default` or `--border-strong` is a defect (F12).

**Rule C9.** Structure is always 1px. 2px means selection or focus.

### 3.3 Elevation

**Rule C10.** A resting panel has no shadow. Shadows belong to transient layers
only: popover, dialog, toast.

---

## 4. Component contract

Components live in `src/components/ui/` and are the only permitted primitives
for application surfaces.

| Component | Owns | Rule |
| --- | --- | --- |
| `PageHeader` | Page title, description, meta | One per page. Carries the only >= 24px text on the page. |
| `Panel` / `PanelSection` | Grouped content | Nesting depth <= 2. A panel inside a panel inside a panel is a defect. |
| `Table` | Repeating records | Row height 40–44px. Columns 4–6. The row is the target. |
| `Button` | Actions | Height 32–40px. One primary action per surface. |
| `Field` | Form inputs | Height 32–40px. Every field writes one record. |
| `Tabs` | Views over one record set | Tabs never navigate to a different record type. |
| `StatusTag` | State | Renders a literal record state through one shared label map. |
| `MetricStrip` | Counts | Every metric links to the destination that owns it and states its definition. Absent when all values are 0. |
| `ProgressRing` | Completion of a derived set | Never a decorative gauge. |
| `RowMenu` | Row actions | Every item is a real action. No disabled placeholders. |
| `Dialog` | Confirmation and focused input | Destructive confirmations name the object. Replaces every `window.confirm`. |
| `Toast` | Result of an action | Confirms a completed write. Never used for navigation. |
| `Skeleton` | Loading | Rendered at the true final geometry. |
| `EmptyState` | Absence | States the absence and offers the one action that ends it. Never renders sample data. |
| `Surface` | Surface primitive | Resolves `--surface-*` tokens only. |

**Rule CP1.** A record surface uses these primitives. A bespoke list, table, or
panel implementation inside a page file is a defect.

**Rule CP2.** Every interactive element has a visible `:focus-visible` ring
following its own radius, per the base rule in `globals.css`.

**Rule CP3.** Every icon is 16px at 1.5–1.75 stroke. Icon size does not signal
hierarchy. Two destinations never share one glyph.

---

## 5. The fifteen current inconsistencies

Measured against the current implementation. Each has an owner file, the
measured evidence, the band it fails, and the required resolution.

### UI-1 — No global search control exists

- **Owner:** `WorkspaceToolbar` in `src/components/employer/EmployerShell.tsx`
- **Evidence:** the toolbar renders a section label and three trailing controls.
  There is no search input anywhere in the chrome, so a candidate or a run
  cannot be reached by identifier from any destination.
- **Fails:** F6, SR-1, SR-2.
- **Resolution:** one search control in the toolbar, `min-width: 320px`,
  `max-width: 360px`, height 32–36px at >= 1024px, resolving to candidates and
  runs.

### UI-2 — Navigation group labels add a hierarchy level the IA does not have

- **Owner:** `WORKSPACE_NAV_GROUPS` in `src/lib/workspace/navigation.ts`
- **Evidence:** the seven destinations render in four groups, two of them
  labelled "Hiring" and "Proof" and two unlabelled, so Outcomes sits alone below
  a labelled group. The locked IA is one flat list of seven.
- **Fails:** IA-1, IA-9.
- **Resolution:** one flat list of seven, Settings pinned at the foot, separated
  by spacing rather than by a group label.

### UI-3 — `workspaceSection` mislabels every unmapped route as Home

- **Owner:** `workspaceSection` in `src/lib/workspace/navigation.ts`,
  consumed by `WorkspaceToolbar`
- **Evidence:** the lookup falls back to `WORKSPACE_NAV_ITEMS[0]`, so any route
  outside the seven — including `/app/employer/assessments`,
  `/app/employer/workbench`, `/app/employer/proof`, `/app/employer/reports`,
  `/app/employer/compare`, `/app/employer/cohort` — renders the toolbar label
  "Home" while the rail shows no active destination.
- **Fails:** forensics §2.1, IA-15.
- **Resolution:** every route resolves to the destination that owns it. A route
  with no owning destination is a routing defect, not a label fallback.

### UI-4 — Legacy destinations remain routable and unowned

- **Owner:** `src/app/app/employer/assessments`, `/workbench`, `/proof`,
  `/reports`, `/compare`, `/cohort`
- **Evidence:** these routes still render and still index records — evaluations,
  simulations, shortlist, reports — that the seven locked destinations now own.
  None appears in `WORKSPACE_NAV_ITEMS`, so each is a reachable surface with no
  place in the model, and several index a record type twice.
- **Fails:** IA-3, IA-5, IA-15.
- **Resolution:** each legacy route either redirects to the destination that owns
  its records or is folded into that destination's detail surface. Simulations
  resolve under Role → Evaluation; shortlist resolves under Role.

### UI-5 — The radius ladder has seven values, four of them local literals

- **Owner:** `globals.css`, `EmployerShell.tsx`
- **Evidence:** tokens declare `--radius-tag: 4px`, `--radius-control: 6px`,
  `--radius-panel: 10px`, `--radius-frame: 14px`; the shell root locally
  overrides `[--radius-frame:9px] [--radius-panel:8px]`; the workspace mark uses
  `rounded-[7px]` and the product mark link uses `rounded-[6px]`.
- **Fails:** F13.
- **Resolution:** collapse to 4 / 6 / 8. Remove the local override and both
  literals.

### UI-6 — The main gutter reaches 48px only at the large breakpoint

- **Owner:** `MainSurface` in `EmployerShell.tsx`
- **Evidence:** `px-5 py-7 sm:px-8 lg:px-12` → 20px, 32px, 48px.
- **Fails:** F4.
- **Resolution:** 48px from the breakpoint at which the rail appears.

### UI-7 — Mobile navigation is four columns holding eight destinations at 11px

- **Owner:** `MobileNav` in `EmployerShell.tsx`
- **Evidence:** `grid-cols-4` with `WORKSPACE_NAV_ITEMS` of length 8 produces two
  rows, and labels are `text-[11px]` — below the 13–14px navigation band, and
  outside the five permitted sizes.
- **Fails:** F9, T1, T2.
- **Resolution:** navigation labels resolve from the nav token at every
  breakpoint. Where eight labels do not fit, the layout changes, not the type
  size.

### UI-8 — Three control heights

- **Owner:** `globals.css`, `EmployerShell.tsx`, employer routes
- **Evidence:** the shell uses `h-8` (32px); Home and Settings actions use `h-9`
  (36px); `.platform-input` and `.platform-select` are `height: 42px`, above the
  40px ceiling.
- **Fails:** F10.
- **Resolution:** one ladder inside 32–40px, shared by shell controls, page
  actions, and form fields.

### UI-9 — Two out-of-band record row heights

- **Owner:** `src/app/app/employer/page.tsx`, `/roles/page.tsx`,
  `/work/page.tsx`, `src/components/ui/Table.tsx`
- **Evidence:** the Home "Ready for review" list uses `px-5 py-2.5` with body
  line-height, computing to roughly 36px; the Roles and Work grids use
  `min-h-[52px]`. Neither is inside 40–44px, and they disagree with each other.
- **Fails:** F11.
- **Resolution:** one row height of 40–44px for every repeating record row,
  whether rendered as a table, a grid, or a list.

### UI-10 — Structural and interactive border alphas are not separated

- **Owner:** `globals.css` and every application surface
- **Evidence:** `--border-subtle` is 11% (in band), `--border-default` 18%, and
  `--border-strong` 29%. `.platform-input` uses `--border-default` for a resting
  edge, and avatar and workspace marks use it for structure.
- **Fails:** F12, C8.
- **Resolution:** structure is `--border-subtle` only. `--border-default` and
  `--border-strong` are reserved for interactive and emphasised edges, and a
  resting form field is structure.

### UI-11 — The Home right column is 360px

- **Owner:** `src/app/app/employer/page.tsx`
- **Evidence:** `xl:grid-cols-[minmax(0,1fr)_360px]`.
- **Fails:** F15, H-6.
- **Resolution:** 240–280px, shared by every secondary context column in the
  product.

### UI-12 — The activation ladder is no longer rendered

- **Owner:** `src/app/app/employer/page.tsx`
- **Evidence:** `SetupPath` and `ProgressRing` are no longer imported by Home.
  The seven-item activation ladder has collapsed to one binary branch on
  `hasInvited`, which renders either a two-button "Start with an open role" panel
  or "Active roles". There is no 220–280px activation column, and states for
  evaluation readiness, work attempted, evidence analysed, decision recorded,
  and outcome recorded are not surfaced at all.
- **Fails:** F14, A-1…A-6, IA §5.
- **Resolution:** restore the full derived ladder in a 220–280px column. Each
  item derives from record existence on every request, is undismissable, hands
  off to the destination that owns it, and the panel leaves the DOM when every
  item is satisfied.

### UI-13 — Home has no counts surface

- **Owner:** `src/app/app/employer/page.tsx`
- **Evidence:** `getOverviewMetrics` is no longer read by Home and `MetricStrip`
  is no longer rendered. Removing the band also removed the per-metric
  definitions and the routes from a count to the destination that owns it, so
  the non-zero case is now unimplemented rather than deferred.
- **Fails:** H-2, H-3, AS-8.
- **Resolution:** restore the band under the honest-absence rule — absent when
  every value is 0, and when present every tile links to its owning destination
  and states the rule that produced its number.

### UI-14 — The shell uses nine distinct type sizes

- **Owner:** `EmployerShell.tsx`
- **Evidence:** inline sizes `11px`, `11.5px`, `12px`, `12.5px`, `13px`,
  `13.5px`, `14px` appear in the rail, toolbar, workspace selector, account
  menu, and mobile header, alongside the `text-app-body` and `text-app-meta`
  utilities used by pages. None of the seven inline values resolves from a token.
- **Fails:** T1, T2, AS-30.
- **Resolution:** five sizes, all from tokens. Promote the 13.5px navigation size
  to a declared token and delete the remaining inline literals.

### UI-15 — The Sandbox reimplements the chrome instead of sharing it

- **Owner:** `src/components/sandbox/SandboxApp.tsx`, `src/app/sandbox/**`
- **Evidence:** `SandboxApp` builds a second copy of the shell — its own 32px
  environment bar, its own 224px rail, its own `h-14` toolbar, its own nav array,
  its own `max-w-[1320px]` main. Consequences measured in that copy:
  - the environment bar hardcodes `bg-[#263a5b]` and carries text at
    `text-white/80`, so the hex and the opacity-carried hierarchy that were
    removed from the Live shell now live here;
  - the rail has seven items and no Settings, against Live's eight (IA-1, IA-2);
  - there is no mobile navigation at all — the rail is `md:flex` with no
    `MobileNav` counterpart, so below 768px the Sandbox has no way to navigate;
  - the `Surface` union still carries the legacy members `overview` and
    `simulation`, and `/sandbox/overview` and `/sandbox/simulation` still route,
    aliased onto Roles and Work;
  - reset confirms through `window.confirm`;
  - the unavailable state is a bare `<main>` containing one sentence, with no
    shell and no recovery action.
- **Fails:** SB-A1, SB-A2, SB-A3, IA-1, IA-2, C1, T4, AS-17, AS-19, AS-20.
- **Resolution:** mount the Sandbox on the same shell as Live, differing only in
  the environment bar's content and the data behind it; delete the duplicated
  chrome, the hardcoded hex, and the legacy surface members; replace
  `window.confirm` with `Dialog` and the bare unavailable page with
  `EmptyState` inside the shared shell.

### 5.1 Defect summary

| ID | Defect | Primary band | Owner |
| --- | --- | --- | --- |
| UI-1 | No global search control | F6 | `EmployerShell.tsx` |
| UI-2 | Nav group labels add a hierarchy level | IA-1, IA-9 | `navigation.ts` |
| UI-3 | Unmapped routes labelled "Home" | IA-15 | `navigation.ts` |
| UI-4 | Legacy destinations routable and unowned | IA-3, IA-5, IA-15 | employer routes |
| UI-5 | Seven radii, four local literals | F13 | `globals.css`, `EmployerShell.tsx` |
| UI-6 | Gutter 20/32/48 | F4 | `EmployerShell.tsx` |
| UI-7 | Mobile nav 4 columns, 8 items, 11px | F9, T2 | `EmployerShell.tsx` |
| UI-8 | Three control heights: 32 / 36 / 42 | F10 | `globals.css`, employer routes |
| UI-9 | Row heights 36px and 52px | F11 | home, roles, work |
| UI-10 | Structural vs interactive border alpha not separated | F12 | `globals.css` |
| UI-11 | Right column 360px | F15 | employer home |
| UI-12 | Activation ladder not rendered | F14, A-1…A-6 | employer home |
| UI-13 | No counts surface on Home | H-2, H-3 | employer home |
| UI-14 | Nine distinct type sizes in the shell | T2 | `EmployerShell.tsx` |
| UI-15 | Sandbox does not share the chrome | SB-A1…SB-A3 | `SandboxApp.tsx` |

### 5.2 One-line rail overflow to watch

`AccountMenu` renders its popover at `w-[228px]` inside a 224px rail whose inner
width after `px-2.5` is 204px, so the open menu overhangs the rail by 24px.
This is a transient layer and therefore not one of the fifteen, but it is a
geometry error against F1 and is fixed with the same change as UI-5.

---

## 6. Anti-slop constraints

Absolute. A surface violating any of these does not ship, regardless of how it
looks.

### 6.1 Data honesty

| ID | Constraint |
| --- | --- |
| AS-1 | Every rendered number traces to a named record field or to a computation over named record fields on the same page. No number without a source. |
| AS-2 | No invented metric. No time-to-hire, quality-of-hire, accuracy, precision, correlation, or predictive claim. |
| AS-3 | No benchmark, industry average, percentile, or comparison against data this workspace does not own. |
| AS-4 | No fake integration. No ATS, HRIS, calendar, or vendor surface exists, so none is rendered. |
| AS-5 | No customer logos, testimonials, customer counts, or social proof in the application. |
| AS-6 | Absence renders as absence. A zero-value metric band is removed; it is never rendered as a wall of zeros. |
| AS-7 | No sample, ghost, or placeholder record in a live surface. |
| AS-8 | Every metric renders the rule that produced it, from the same loader that produced the number. |

### 6.2 Identity honesty

| ID | Constraint |
| --- | --- |
| AS-9 | No named synthetic people anywhere in the product, in documentation, in fixtures, or in screenshots. |
| AS-10 | Demo identities are `Candidate 01` through `Candidate 04` only. Exactly four. |
| AS-11 | No synthetic portraits or generated avatars. Initials or a neutral glyph only. |
| AS-12 | No synthetic biography, résumé, tenure, location, or personal detail attached to a demo identity. |

### 6.3 Interface honesty

| ID | Constraint |
| --- | --- |
| AS-13 | No fake buttons. Every control performs a real action against a real path. |
| AS-14 | No disabled placeholder, no "coming soon", no TODO in a shipped path. |
| AS-15 | Loading renders `Skeleton` at the true final geometry, never lorem text and never a spinner in place of a known layout. |
| AS-16 | Every error surface names the object, the failure, and the recovery. No bare "Something went wrong". |
| AS-17 | `window.confirm`, `window.alert`, and `window.prompt` do not appear in shipped paths. Confirmation uses `Dialog`. |
| AS-18 | No toast used to report navigation. Toasts confirm completed writes. |

### 6.4 Visual honesty

| ID | Constraint |
| --- | --- |
| AS-19 | No hardcoded colour. Every colour resolves from a token. |
| AS-20 | No text hierarchy carried by opacity or alpha text colour. |
| AS-21 | No gradient-filled text. No text shadow. |
| AS-22 | No decorative orb, blob, glow, grain overlay, or ambient gradient in the application. Atmospheric depth is a marketing-only device. |
| AS-23 | No card inside a card inside a card. Panel nesting depth <= 2. |
| AS-24 | No emoji in product copy, labels, states, or empty states. |
| AS-25 | No icon-only control without an accessible name. No two destinations sharing one glyph. |
| AS-26 | Green only for a real completed state. Never for a favourable rating. |
| AS-27 | Colour is never the only carrier of meaning. |
| AS-28 | No resting shadows on panels. Shadow belongs to transient layers. |
| AS-29 | No decorative motion. Motion communicates state change, honours `prefers-reduced-motion`, and uses the declared duration and easing tokens. |
| AS-30 | No arbitrary inline type size. Five sizes, from tokens. |

### 6.5 Copy

| ID | Constraint |
| --- | --- |
| AS-31 | Labels name the record, not the feature. A destination is called what the operator would call it. |
| AS-32 | No marketing voice inside the application. No superlatives, no exclamation marks, no congratulation. |
| AS-33 | State labels come from one shared label map per record type. Two labels for one status is a defect. |
| AS-34 | Sandbox persistence is described as a demo session, never as durable or archived storage. |
| AS-35 | No claim about what the product will do. Copy describes what the record shows. |

---

## 7. Verification

A surface passes when all of the following hold.

| Check | Method |
| --- | --- |
| Geometry | Assert every band in §1 against computed styles at 1024, 1280, 1440, 1920px. |
| Type cardinality | Collect distinct computed `font-size` values on the page; assert <= 5 and all in band (T2). |
| Single page title | Assert exactly one element with computed `font-size` >= 24px (T3). |
| Opacity | Assert no text-bearing element has `opacity < 1` and no text colour has alpha < 1 (T4). |
| Token colour | Static scan for hex, `rgb(`, and `rgba(` literals in `src/components/` and `src/app/**/page.tsx`; expected count zero (AS-19). |
| Radius ladder | Collect distinct computed `border-radius` values excluding pills and avatars; assert subset of {4, 6, 8} (F13). |
| Row height | Assert every repeating record row computes to 40–44px (F11). |
| Nesting | Assert maximum panel nesting depth <= 2 (AS-23). |
| Identity counts | Assert workspace name count = 1, user identity count = 1, invite control count = 1 per viewport (IA-6, IA-7, IA-8). |
| Nav order | Assert the ordered accessible-name array equals the locked eight (IA-1, IA-2). |
| Demo identities | Grep fixtures and rendered strings for personal-name patterns; expected count zero. Assert exactly four demo identities (AS-9, AS-10). |
| Dialogs | Static scan for `window.confirm`, `window.alert`, `window.prompt`; expected count zero (AS-17). |
| Emoji | Static scan of product copy for emoji code points; expected count zero (AS-24). |
| Untouched paths | Assert the diff touches no file implementing `WorkbenchRunner`, v2 scoring, `sim_session_events` writes, `/sim/*`, or any migration. |
