# Stripe Reference Forensics

Status: locked measurement baseline. Values here are the measured reference band,
not aspiration. Any Fydell surface that falls outside a band below is a defect,
and the defect is named in `FYDELL_UI_SYSTEM.md`.

Scope: the Stripe Dashboard operator shell — environment banner, left rail, top
toolbar, list surfaces, object-detail surfaces, settings, and the activation
checklist. This document records *what was measured* and *what rule it implies*.
It does not record colour values from Stripe; Fydell colour comes from
`src/app/globals.css` only.

---

## 1. How to read this document

- **Band** — a measured minimum and maximum. Any value inside the band is
  conformant. A single number means the band collapsed to one value.
- **Rule** — the invariant a Fydell implementation must satisfy.
- **Test** — the check that decides pass or fail. Every test is mechanical:
  a measured pixel value, a computed style, or a DOM count. No test is
  "looks right".

Measurement conditions for every band: 1440x900 viewport, 100% browser zoom,
default OS text size, desktop breakpoint (>= 1024px), no browser extensions.
Sub-pixel values are rounded to the nearest 0.5px.

---

## 2. Chrome geometry

| Element | Measured band | Rule | Test |
| --- | --- | --- | --- |
| Left navigation rail width | 216–224px | The rail is a fixed column. It never flexes with viewport width and never collapses on desktop. | Computed `width` of the rail element is >= 216 and <= 224 at 1024px, 1280px, 1440px, and 1920px. |
| Environment / mode bar height | 28–32px | A full-bleed strip above every other chrome element. It is the first element in the document flow and spans 100% of viewport width including over the rail. | Computed `height` in [28, 32]; `getBoundingClientRect().top === 0`; `width === window.innerWidth`. |
| Top toolbar height | 56–64px | One toolbar per viewport. It sits directly below the environment bar and does not overlap it. | Computed `height` in [56, 64]; exactly one element with the toolbar role is in the accessibility tree at any breakpoint. |
| Main content gutter | 48px | The horizontal padding between the rail edge and content, and between content and the right viewport edge, is the same value. | Computed `padding-left === padding-right === 48px` on the main content wrapper at >= 1024px. |
| Settings content measure | 760–880px | Settings is a form column, not a canvas. It is width-capped independently of the page canvas cap. | Computed `max-width` of the settings content column in [760, 880]. |
| Onboarding / activation panel | 220–280px | The activation checklist is a narrow secondary column beside primary content, never a full-width band. | Computed `width` in [220, 280] at >= 1280px. |
| Secondary right column | 240–280px | Right-hand context columns (recent activity, related objects, metadata) share one width. | Computed `width` in [240, 280] at >= 1280px. |

### 2.1 Stacking contract

The reference stacks in exactly this order, top to bottom, with no gaps and no
overlapping sticky offsets:

```
environment bar   (28–32px, z above all, top: 0)
top toolbar       (56–64px, sticky top: <environment bar height>)
main content      (gutter 48px)
```

The left rail is sticky at `top: <environment bar height>` and its height is
`100vh - <environment bar height>`.

**Test:** the sticky offset of the toolbar and the sticky offset of the rail are
both exactly equal to the measured environment bar height. A hardcoded offset
that disagrees with the bar's own height is a failure.

---

## 3. Control geometry

| Element | Measured band | Rule | Test |
| --- | --- | --- | --- |
| Global search field | width 320–360px, height 32–36px | Search has a floor as well as a ceiling. It never shrinks below 320px on desktop; it never grows past 360px. | Computed `width` in [320, 360] and `height` in [32, 36] at >= 1024px. |
| Interactive controls (buttons, inputs, selects, chips) | height 32–40px | One control height ladder for the whole product. Two ladders is the failure mode. | Every focusable control's computed `height` is in [32, 40]. No exceptions for forms. |
| Table / list row height | 40–44px | Every scannable row surface uses the same row height, whether rendered as a table or as a list. | Computed row `height` in [40, 44] for every repeating record row. |
| Icon size in navigation and controls | 16px | Icons are 16px at 1.5–1.75 stroke. Icon size is not used to signal hierarchy. | Rendered icon box is 16x16. |

---

## 4. Typography

| Role | Measured band | Rule | Test |
| --- | --- | --- | --- |
| Page title | 24–26px | Exactly one element per page at page-title size. Nothing else on the page may match or exceed it. | Count of elements with computed `font-size` >= 24px is exactly 1 per page. |
| Section title | 16–18px | Panel and section headings. | Computed `font-size` in [16, 18]. |
| Body / record text | 13.5–14.5px | The default reading size for records, table cells, and descriptions. | Computed `font-size` in [13.5, 14.5]. |
| Navigation item | 13–14px | Rail and tab labels. | Computed `font-size` in [13, 14]. |
| Meta / secondary | 12–12.5px | Timestamps, counts, definitions, helper text. | Computed `font-size` in [12, 12.5]. |

### 4.1 The size-count rule

The reference shell uses **five** distinct font sizes in the operator chrome and
record surfaces. Not eight, not twelve.

**Test:** collect `getComputedStyle(el).fontSize` for every text-bearing element
in the shell and main content of one page. The set of distinct values has
cardinality <= 5, and every member falls inside a band in the table above.

### 4.2 Hierarchy carrier

Text hierarchy is carried by **solid colour and weight**, never by `opacity` and
never by an alpha-channel text colour.

**Test:** no text-bearing element has computed `opacity < 1`, and no text
`color` uses an alpha component < 1.

---

## 5. Surface and line

| Property | Measured band | Rule | Test |
| --- | --- | --- | --- |
| Structural border alpha | 8–14% of a neutral | One hairline value for structure. Borders are lines, not shadows and not fills. | Every `border-color` used for structure resolves to alpha in [0.08, 0.14]. |
| Border width | 1px | Structure is always 1px. A 2px border means selection or focus, never structure. | Computed `border-width` is 1px for all structural edges. |
| Radius ladder | 4 / 6 / 8px | Three radii only: 4 for tags and inline chips, 6 for controls, 8 for panels and popovers. | The set of distinct computed `border-radius` values (excluding 50%/9999px pills and avatars) is a subset of {4px, 6px, 8px}. |
| Elevation | Panels are flat on the canvas; only transient layers (popover, dialog, toast) carry a shadow. | A resting panel has no shadow. | Computed `box-shadow` is `none` for every non-transient panel. |

---

## 6. Environment separation

The reference proves environment state by **persistent chrome**, not by a
different application.

| Property | Measured behaviour | Rule | Test |
| --- | --- | --- | --- |
| Chrome parity | Test mode and live mode render the identical shell: same rail, same toolbar, same routes, same components. | The environment is a state of one application, not a second application. | The DOM structure of the shell is identical between environments; only the environment bar content and the data differ. |
| Persistence | The environment indicator is visible on every route, including object detail and settings. | The indicator is never scrolled away and never route-conditional. | The environment bar is present in the DOM on 100% of authenticated routes. |
| Data isolation | No object created in test mode appears in a live list, and no live object appears in a test list. | Isolation is enforced at the data layer, not by a UI filter. | A record created in one environment returns 404 when requested by ID in the other. |
| Switch cost | Switching environments is one control and preserves the current route. | Switching does not return the operator to the home page. | After switching, `location.pathname` is unchanged. |

---

## 7. Activation states become operational states

The reference activation checklist is not a tutorial that is dismissed. Each
checklist item is a real state of a real object, and once satisfied the item
stops rendering and the corresponding operational surface takes its place.

| Property | Measured behaviour | Rule | Test |
| --- | --- | --- | --- |
| Derivation | Each item's state is computed from record existence, never from a "dismissed" flag or local storage. | No checklist item can be completed without the underlying record existing. | Deleting the underlying record returns the item to incomplete. |
| Disappearance | When all items are satisfied, the whole panel is removed from the DOM. | Completed onboarding leaves no residue. | With all items satisfied, the panel element does not exist. |
| Continuity | The completed checklist item and the operational surface that replaces it read the same records. | There is one source of truth per item. | The count shown in a completed item equals the count shown by the operational surface it hands off to. |

---

## 8. Identity model

| Property | Measured behaviour | Rule | Test |
| --- | --- | --- | --- |
| Workspace identity | Rendered exactly once in the shell. | One workspace identity element. | Count of elements naming the workspace in the shell is exactly 1. |
| User identity | Rendered exactly once in the shell, at the foot of the rail. | One user identity element. | Count of elements naming the user in the shell is exactly 1. |
| Global action | Exactly one persistent primary action lives in the chrome. | One global action, one location, all breakpoints. | Count of elements invoking the global action is exactly 1 per rendered viewport. |

---

## 9. List and detail contract

| Property | Measured behaviour | Rule | Test |
| --- | --- | --- | --- |
| List columns | 4–6 columns. Every column is either an identifier, a state, an amount, or a time. | No column exists that the operator cannot act on or sort by. | Column count in [4, 6]; every header maps to one of the four kinds. |
| Row target | The whole row is the navigation target to the object. | Rows do not require hitting a link inside a cell. | The row element carries the navigation affordance. |
| Detail head | Object detail opens with identifier, state, and time before any panel. | The first paint answers "what is this, what state, when". | The first three text nodes in the detail header are identifier, state, time. |
| Timeline | Object detail carries an append-only event timeline of what happened to that object. | The timeline is the object's history, not a summary. | Every timeline entry has a timestamp and a source record. |
| Nesting depth | Panels do not nest more than one level. | No card inside a card inside a card. | Maximum panel nesting depth is 2. |

---

## 10. Empty and failure states

| Property | Measured behaviour | Rule | Test |
| --- | --- | --- | --- |
| Zero data | A zero-data surface states the absence and offers the one action that ends it. | Never render a metric band of zeros. | If every metric is 0, the metric band is absent from the DOM. |
| No synthetic filler | Empty surfaces never render sample rows, ghost records, or invented numbers. | Absence is shown as absence. | No record in a live surface lacks a backing row. |
| Failure | A failed operation names the object, the failure, and the recovery. | No bare "Something went wrong". | Every error surface contains an object identifier and a next action. |

---

## 11. Summary table — the forensic bands

Every band in one place, for direct use as an acceptance checklist.

| # | Property | Band |
| --- | --- | --- |
| F1 | Sidebar width | 216–224px |
| F2 | Environment bar height | 28–32px |
| F3 | Toolbar height | 56–64px |
| F4 | Main gutter | 48px |
| F5 | Settings measure | 760–880px |
| F6 | Search field | 320–360px x 32–36px |
| F7 | Page title | 24–26px |
| F8 | Body text | 13.5–14.5px |
| F9 | Navigation text | 13–14px |
| F10 | Control height | 32–40px |
| F11 | Table row height | 40–44px |
| F12 | Structural border alpha | 8–14% neutral |
| F13 | Radius ladder | 4 / 6 / 8px |
| F14 | Onboarding panel width | 220–280px |
| F15 | Right column width | 240–280px |

These identifiers (F1–F15) are referenced by acceptance criteria throughout
`FYDELL_SCREEN_MAP.md`, `FYDELL_SANDBOX_SPEC.md`, and `FYDELL_UI_SYSTEM.md`.
