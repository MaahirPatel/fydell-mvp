# Fydell design system — component inventory and adoption plan

**Status:** foundation (tokens) landed; component migration not started.
**Applies to:** web app (`src/`) and desktop app (`desktop/`).
**Checklist gates:** VIS-02 (shared tokens), VIS-06 (component inventory), VIS-08
(component states), VIS-14 (one product identity).

## 1. What landed in this change

| File | Role |
|---|---|
| `src/styles/fydell-tokens.css` | Canonical shared contract: typefaces, type scale, spacing (4/8/12/16/24/32/48/64), radii, hairline borders, surfaces, text, evidence semantics (teal/violet/amber/green/red), action, focus ring, shadows, motion. Light default + `[data-theme="dark"]` variant. |
| `desktop/src/tokens.css` | Desktop adaptation: same token names and semantic meanings, dark-first, denser type (13px body), editor surfaces (Monaco vs-dark family), desktop control metrics (32px), window layout tokens. |

Neither file is imported anywhere yet — adoption is deliberate, per component
(see §5). `desktop/src/styles.css` (ad-hoc tokens: `--bg`, `--accent: #4f8ff7`,
Inter-first stack) remains the live stylesheet until each component migrates.

## 2. Non-negotiable rules

These come from the release checklist, `APPROVED_VISUAL_CONTRACT.md`, and the
visual audit. They are rules, not suggestions.

1. **Roles, not values.** Use `--type-app-body`, never `13px`; `--space-3`,
   never `12px`; `--ev-attention`, never `#d9a13b`. The audit found simulation
   components forking the type scale with hardcoded `text-[13px]` — that is the
   exact failure this system prevents.
2. **Max containment depth: 2.** No card-in-card-in-card. If a design needs a
   third level, flatten the hierarchy instead of nesting.
3. **Hairlines only.** `--border-subtle` / `--border-default`; `--border-strong`
   reserved for emphasis. No 2px boxes, no glow borders.
4. **One saturated accent per viewport.** `--action` for primary action and
   selection. Evidence colors (teal/violet/amber) mark *evidence type*, never
   decoration.
5. **Color never carries meaning alone.** Every semantic color pairs with a
   text label and, where space allows, an icon. Status is text first, hue second.
6. **Fake states are forbidden.** No "Saved" without persistence, no success
   toast for an unconfirmed write, no progress bar that isn't measuring something
   real. (Checklist: "Fabricated automation is not" acceptable.)
7. **Focus is never optional.** Every interactive element shows the 2px focus
   ring. Removing it to "clean up" a design is a defect.
8. **Motion is state only, 120–220ms.** Nothing decorative moves; reduced-motion
   users get instant state changes.

## 3. Token adoption map (desktop)

`desktop/src/styles.css` → `desktop/src/tokens.css`. Migrate component by
component; do not run both token sets in one component.

| Old (`styles.css`) | New (`tokens.css`) | Notes |
|---|---|---|
| `--bg: #0f1113` | `--surface-canvas: #0e0e14` | Near-identical; new value wins |
| `--bg-raised: #16191c` | `--surface-raised: #16161e` | |
| `--bg-sunken: #0b0d0f` | `--surface-deep: #0a0a10` | Editor host uses `--surface-editor: #1e1e1e` instead |
| `--border: #23282d` | `--border-default` (hairline) | Old border was heavier; hairline is the contract |
| `--text: #e8eaed` | `--text-primary: #f2f2f6` | |
| `--text-dim: #9aa0a6` | `--text-secondary: #b3b3c0` | |
| `--text-faint: #6b7280` | `--text-tertiary: #8b8b99` | |
| `--accent: #4f8ff7` | `--action: #8f9bff` | Hue shifts blue→periwinkle to match web `--action-ink` |
| `--accent-dim: #2b4a7a` | `--action-ink-ring` | Focus ring, not a border color |
| `--green: #34c77b` | `--ev-success` / `--ev-success-ink` | Semantic name, not a color name |
| `--red: #e5534b` | `--ev-error` / `--ev-error-ink` | |
| `--amber: #d9a13b` | `--ev-attention` / `--ev-attention-ink` | |
| `--radius: 8px` | `--radius-control: 6px` / `--radius-panel: 10px` | One radius per role, not one for everything |
| `--font: Inter, ...` | `--font-sans` (Geist first) | Product typeface is Geist per identity doc |
| `--mono: JetBrains Mono, ...` | `--font-mono` (Geist Mono first) | JetBrains Mono stays as fallback |
| (none) | `--ev-observed` (teal), `--ev-generated` (violet) | **New:** evidence provenance colors the desktop never had |
| (none) | `--focus-ring` | Desktop currently has no visible focus style — defect |

## 4. Component inventory

Anatomy and behavior for every shared component. "Web" = `src/components/ui/`
or `globals.css`; "Desktop" = `desktop/src/styles.css` classes today.

### 4.1 Buttons

**Anatomy:** label (verb-first: "Submit work", "Run tests", "Invite candidate"),
optional leading icon, 32px desktop / 42px web height, 6px radius, medium weight.
**Behavior:** 140ms background transition; disabled removes pointer events and
drops to 45% opacity (never just greys the label); destructive actions require
a confirming dialog, never a single click.

| Variant | Web | Desktop | Notes |
|---|---|---|---|
| Primary (inverted solid) | `Button primary` | `.btn` | Web uses near-black solid on light; desktop uses `--control-solid` (near-white on dark) |
| Secondary (hairline border) | `Button secondary` | `.btn.ghost` | Same anatomy both surfaces |
| Quiet (text only) | `Button quiet` | — | **Gap:** desktop has no quiet variant; tab-close "×" uses ad-hoc styling |
| Destructive | `Button destructive` | `.btn.danger` | Desktop danger is solid red — must move to `--ev-error` token |
| Accent (periwinkle) | `Button accent` | `.btn` (default) | Desktop default button IS the accent; web default is the solid. Deliberate per-surface difference, documented here |

**States required:** default, hover, active/pressed, focus-visible, disabled,
loading (spinner replaces icon, label stays, button is inert — not just dimmed).

### 4.2 Inputs

**Anatomy:** label above (12px meta, `--text-secondary`), 32px/42px control,
hairline border, 6px radius, 10–12px horizontal padding. Error state: border
goes `--ev-error`, message below in `--ev-error-ink` naming the fix
("Enter a valid email address" — never "Invalid input").
**Behavior:** focus shows ring + border color change; disabled uses
`--surface-deep` fill and `--text-disabled`; `aria-invalid` + `aria-describedby`
wired to the error message.

| Element | Web | Desktop | Notes |
|---|---|---|---|
| Text input | `.platform-input` / `Field` | `.input` | Desktop input forces mono font — body inputs must use `--font-sans`; mono is for code/paths only |
| Textarea | `.platform-input` (multiline) | `.textarea` | |
| Select | `.platform-select` | — | **Gap:** desktop has no select; scenario switching will need one |
| Checkbox / radio / switch | `Field` | — | **Gap:** desktop consent screen uses a static list; interactive consent needs real controls |

**States required:** default, focus, filled, error, disabled, readonly.

### 4.3 Tabs

**Anatomy:** text labels, 12–13px semibold; active tab shows 2px accent
underline (panel tabs) or matches the editor surface (editor tabs). No pill
backgrounds on tabs — pills are for status, not navigation.
**Behavior:** keyboard: arrow keys move between tabs, activation on Enter/Space
(manual activation for editor tabs with unsaved state); `role=tablist/tab/tabpanel`.

| Element | Web | Desktop | Notes |
|---|---|---|---|
| Generic tabs | `Tabs` component | `.panel-tabs` / `.panel-tab` | Same anatomy; desktop must adopt token values |
| Editor tabs | — | `.tabs` / `.tab` | Desktop-only; active tab bg = `--surface-tab-active` = editor bg so the tab reads as attached |
| Overflow | — | — | **Gap:** both surfaces lack an overflow story; >N tabs must collapse into a menu |

**States required:** default, hover, active, focus-visible, disabled, dirty
(unsaved dot — amber, with text label "Unsaved" on hover for screen readers).

### 4.4 Dialogs

**Anatomy:** overlay scrim (60% black), centered panel max 480px, 10px radius,
`--shadow-3`, title (page role, 20px desktop), body, footer with actions
right-aligned (primary last). Dismiss: × button, Esc, scrim click — except
destructive confirmations, which require explicit button choice.
**Behavior:** focus trap while open, return focus to trigger on close,
`role=dialog` + `aria-modal`, background inert.

| Element | Web | Desktop | Notes |
|---|---|---|---|
| Dialog | `Dialog` component (exists; 4 usages incl. `SimulationSubmitDialog`) | — | **Gap:** desktop has NO dialog. Submit confirmation, error details, and sign-out-with-unsynced-work all need it |

**States required:** default, loading (blocking spinner with reason), error
(dialog stays open, error block inside — never closes on failure silently).

### 4.5 Badges and status tags

**Anatomy:** 11–12px medium, 4px radius (tags) — NOT pills. Pills are reserved
for a small set of load-bearing workflow states. Tag = category (evidence type);
pill = state (In progress, Submitted).
**Behavior:** never the sole carrier of meaning; always adjacent to a label.

| Element | Web | Desktop | Notes |
|---|---|---|---|
| Category tag | `.badge` + `.badge-teal/.badge-violet/.badge-attention/.badge-neutral` | — | **Gap:** desktop has no tag; evidence provenance (teal/violet) has no visual language on desktop yet |
| Status pill | `StatusTag` (neutral/active/changed/risk/good) | `.pill`, `.sim-badge` | Desktop `.pill` uses pill shape correctly for state; `.sim-badge` marks simulated teammates — keep, move to tokens |
| Evidence row | `.evidence-row` (inset accent bar on active) | — | Web-only pattern; desktop test-run rows should adopt it |

**States required:** n/a (static), but every status pill must have a text label —
no color-only dots.

### 4.6 Tables

**Anatomy:** header row 12px uppercase meta (`--text-tertiary`), 1px hairline
row dividers, 8–12px cell padding, tabular numerals for numbers, left-aligned
text / right-aligned numbers, row hover `--surface-hover`, selected row
`--surface-selected` + 2px inset accent bar (the `.evidence-row` pattern).
**Behavior:** sortable headers announce sort state; empty table shows the empty
state (not a blank box); pagination or "show more", never infinite scroll
without a count.

| Element | Web | Desktop | Notes |
|---|---|---|---|
| Data table | `Table` component | — | **Gap:** desktop candidate list / file manifests will need tables; none exist |

**States required:** loading (skeleton rows), empty, error, populated, sorted.

### 4.7 Empty states

**Anatomy:** centered, 48px max illustration-or-icon (line icon, never a stock
illustration), section-role title ("No submissions yet"), one sentence of
explanation, one primary action ("Invite your first candidate").
**Behavior:** the action must work; an empty state with a dead button is worse
than none.

| Element | Web | Desktop | Notes |
|---|---|---|---|
| Empty state | `EmptyState` component | — | **Gap:** desktop file tree, test output, and team panel all render blank when empty |

**States required:** first-run (with action), no-results (with "clear filters"),
error-retry (with retry action).

### 4.8 Error blocks

**Anatomy:** `--ev-error-field` fill, hairline `--ev-error` border, 6–10px
radius, error title + what-happened + what-to-do-next + reference code for
support. Never a stack trace, never a secret.
**Behavior:** errors preserve user input; retry is offered where retry can
succeed; destructive errors (lost work risk) escalate to a dialog.

| Element | Web | Desktop | Notes |
|---|---|---|---|
| Inline error | (ad-hoc) | `.error` | Both ad-hoc; converge on this anatomy |
| Toast (transient) | `Toast` (neutral/good/risk) | — | Web Toast exists but audit the "good" tone: success toasts must only fire on confirmed persistence |

**States required:** inline error, blocking error (dialog), transient notice
(toast, auto-dismiss, action allowed), field error.

### 4.9 Source viewers (evidence citations)

**Anatomy:** dark code surface (`--surface-code`), mono 12.5–13px, line numbers,
cited line range highlighted with `--ev-observed-field` wash + 2px accent bar;
header names the file and line range ("`reconcile.py:42–58`"); "open in context"
affordance where applicable.
**Behavior:** citations are clickable to the exact source; an invalid reference
fails validation visibly (checklist AI-04) rather than rendering a dead link.

| Element | Web | Desktop | Notes |
|---|---|---|---|
| Citation viewer | (in ReportInspector, ad-hoc) | — | **Gap:** no shared component on either surface; every report surface hand-rolls it |

### 4.10 Menus

**Anatomy:** 6px radius panel, `--shadow-2`, 32px items, hairline dividers
between groups, checkmark or dot for selected item, danger items in
`--ev-error-ink` at the bottom group.
**Behavior:** Esc closes and returns focus; arrow-key navigation; type-ahead;
`role=menu/menuitem`.

| Element | Web | Desktop | Notes |
|---|---|---|---|
| Dropdown menu | `RowMenu` | — | **Gap:** desktop tab overflow and file actions need menus; none exist |

### 4.11 Feedback: loading, progress, toasts

| Element | Web | Desktop | Notes |
|---|---|---|---|
| Skeleton | `Skeleton` | — | Desktop test runs need skeleton rows, not blank panels |
| Spinner | (ad-hoc) | — | Converge on one spinner: 16px, `--action-ink`, 700ms rotation |
| Toast | `Toast` | — | **Gap:** desktop has no transient feedback; sync states ("Saved remotely") need it |
| Progress (determinate) | `ProgressRing` | — | Only for measurable progress (uploads); never decorative |

## 5. Adoption order (desktop)

1. **Tokens first:** new screens import `tokens.css`; migrate `styles.css`
   component-by-component per the §3 map. Delete the old token block only when
   no component references it.
2. **Focus rings:** add `:focus-visible` everywhere (currently missing — an
   accessibility defect, checklist VIS-10).
3. **Evidence colors:** introduce teal/violet/amber into the workspace (test
   runs, timeline, submission review) so provenance has a visual language.
4. **Type roles:** replace hardcoded `13px`/`12px` with `--type-app-*` roles.
5. **New components as needed:** Dialog (submit flow), EmptyState (panels),
   Select (scenario/assignment switching), Menu (tab overflow).

## 6. Component states matrix (VIS-08)

Every component below must handle every marked state. "—" means the state does
not apply.

| Component | Loading | Empty | Error | Disabled | Offline |
|---|---|---|---|---|---|
| Button | ● spinner, inert | — | — | ● 45% opacity | ● queued or disabled w/ reason |
| Input | — (skeleton for prefill) | — | ● message + fix | ● | — |
| Tabs | — | — | — | ● | — |
| Dialog | ● blocking w/ reason | — | ● stays open | — | — |
| Table | ● skeleton rows | ● empty state | ● retry | — | ● stale banner |
| File tree | ● skeleton | ● empty state | ● retry | — | ● read-only badge |
| Editor | — | ● empty file | ● (file unreadable) | ● readonly mode | ● local-only banner |
| Test output | ● running state | ● "no runs yet" | ● run failed | ● (no tests) | ● cannot run |
| Team thread | ● skeleton | ● empty state | ● retry | — | ● paused notice |
| Submission | ● submitting | — | ● stays, retry | ● (unsynced work) | ● blocked w/ reason |
| Toast | — | — | — | — | — (transient only) |

**Offline rule (desktop):** editing stays available; test runs, teammate
responses, and submission require connectivity. Every panel that depends on the
network says so plainly — no silent spinners, no fake "Saved".

## 7. Top 5 component gaps

1. **Dialog (desktop).** No modal component at all. The submit flow, destructive
   confirmations, and sign-out-with-unsynced-work cannot be built correctly
   without it. Web has `Dialog` — port the anatomy, not the code.
2. **Evidence provenance visuals (desktop).** Teal/violet/amber semantics exist
   on web (`--evidence-*`) but the desktop has no teal or violet anywhere.
   Without them, the workspace cannot visually distinguish observed candidate
   work from generated simulation content — the core of the product's honesty.
3. **Empty states (desktop).** File tree, test output, team panel, and timeline
   all render blank when empty. Web has `EmptyState`; desktop needs it before
   first-run candidates meet a void.
4. **Shared source/citation viewer.** ReportInspector hand-rolls citation
   rendering; nothing shared exists. Every employer report and every desktop
   evidence reference needs the same component (file + line range + highlight +
   invalid-reference handling per checklist AI-04).
5. **Truthful async feedback (both).** Web `Toast` has a "good" tone with no
   proven persistence contract behind it; desktop has no transient feedback at
   all. Sync states ("Saved on device" → "Syncing" → "Saved remotely" /
   "Sync failed") need one honest system, not two optimistic ones.

## 8. What this change deliberately does NOT do

- Restyle any existing screen. Tokens are additive; migration is per-component.
- Unify the web's three theme layers (light default, ink theme, marketing
  washes) — that sprawl is documented in globals.css and needs its own
  consolidation pass.
- Supply the rings logo asset (checklist VIS-01 remains blocked on the real
  asset; wordmark only until it arrives).
- Copy Figma/Stripe/Linear/Cursor layouts or assets. Principles only:
  Linear's density and type discipline, Stripe's work-object organization,
  Cursor's editor focus.
