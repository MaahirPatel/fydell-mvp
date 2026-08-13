# Fydell design system

One system for the public site, the employer application, the candidate workbench
and the evidence report. Tokens live in [`src/app/globals.css`](../src/app/globals.css);
primitives live in [`src/components/ui/`](../src/components/ui).

The governing rule: **hierarchy is carried by solid colour, tone, alignment and
density, never by opacity.** If a piece of text is required, it is readable.

## Colour

Tailwind v4 is CSS-first. Colours are registered in the `@theme` block, which makes
them available as utilities (`text-ink-2`, `bg-panel`, `border-line`), and mirrored
as semantic `:root` variables for `var()` use in arbitrary values.

### Surfaces

| Token | Value | Use |
| --- | --- | --- |
| `--surface-canvas` | `#08090a` | Page background, both marketing and app |
| `--surface-raised` | `#0e1014` | Default panel. Sidebar. One tone off canvas |
| `--surface-panel` | `#121419` | Inputs, nested panels, hover targets |
| `--surface-hover` | `#171a20` | Row and control hover |
| `--surface-paper` | `#f4f5f7` | Long-form reading only: printable report previews |

`paper` is deliberately rare. Metrics, forms, lists, settings and empty states are
graphite. A pure-white rectangle means "this is a document you read", nothing else.

### Text

Every value is solid and was measured against `#08090a`.

| Token | Value | Contrast | Use |
| --- | --- | --- | --- |
| `--text-primary` | `#f4f5f7` | 17.8:1 | Headings, primary values, active nav |
| `--text-secondary` | `#a8adb8` | 8.9:1 | Body copy, descriptions, table cells |
| `--text-tertiary` | `#848a96` | 5.7:1 | Column headers, timestamps, hints |

There is no fourth tier. `--text-disabled` (`#5f656f`) exists only for genuinely
disabled controls, and never carries information.

Banned: `text-white/28`, `/35`, `/40`, `/45`, `/50` and friends as a hierarchy
mechanism. WCAG 2.2 AA requires 4.5:1 for normal text and 3:1 for large text; the
old alpha ladder failed both at its lower end.

### State

| Token | Value | Meaning |
| --- | --- | --- |
| `--fydell-brand-blue` | `#5662ff` | Brand. Fills only |
| `--action-ink` | `#8f9bff` | Blue as text or focus ring. 7.9:1 |
| `--fydell-evidence` | `#6b8cff` | Active investigation, selected evidence |
| `--fydell-changed` | `#e9b949` | Changed information, review required |
| `--fydell-risk` | `#f26b82` | Unsupported, revoked, expired, destructive |
| `--fydell-good` | `#67d9a0` | A real completed or healthy state |

Green is never decorative. There are no "Live" indicators.

### Borders

`--border-subtle` 8%, `--border-default` 12%, `--border-strong` 18%. Always 1px.
Structure should be felt before it is noticed.

## Type

Geist Variable, loaded via the bundled `geist` package in
[`src/app/layout.tsx`](../src/app/layout.tsx). Inter was removed: it was fetched
from Google Fonts and never applied.

| Role | Size | Line height | Weight |
| --- | --- | --- | --- |
| Display (`.hero-display`) | `clamp(40px, 4.4vw, 62px)` | 1.02 | 550 |
| Page (`.page-display`, `h1`) | `clamp(34px, 3.4vw, 46px)` | 1.05 | 550 |
| Section (`.section-heading`, `h2`) | `clamp(28px, 2.6vw, 36px)` | 1.1 | 550 |
| App page title | 22px | 1.2 | 600 |
| Product title (`h3`) | 17px | 1.35 | 550 |
| Body large | 17px | 1.6 | 430 |
| Body | 14 to 15px | 1.55 | 400 |
| Label | 13px | 1.4 | 500 |
| Metadata | 12 to 12.5px | 1.5 | 400 |

Rules:

- Sentence case by default.
- No large wide-tracked all-caps eyebrow. Uppercase is limited to table column
  headers at 12px with 0.04em tracking.
- Negative tracking scales with size: roughly `-0.042em` at display down to `0` at
  body.
- Measure is capped in `ch`, not pixels, so headings wrap in 2 to 3 lines.
- Numbers in data positions use `tabular-nums`.

## Space

4px base, 8px primary rhythm, exposed as `--space-1` (4px) through `--space-12`
(144px).

- Marketing content max width `1200px`, gutters 20 / 32 / 40px across breakpoints.
- Marketing section rhythm `--space-10` to `--space-11`.
- Application density is tighter than marketing density.
- The candidate workbench must fit its primary action at 1366x768.

## Radius

| Value | Use |
| --- | --- |
| 4px | Status tags, compact table items |
| 6px | Icon buttons, nav items, small controls |
| 8px | Buttons |
| 10px | Inputs, toasts, small panels |
| 14px | Major frames, dialogs, drawers |
| full | Avatars only |

No repeated 20 to 40px floating cards.

## Elevation

`--shadow-panel` for major product frames, `--shadow-pop` for dialogs and menus.
Depth otherwise comes from background tone, alignment and cropping. No glow around
frames, no purple wash, no glass panels over gradients.

## Focus

2px `--action-ink` outline at 2px offset, applied globally through `:focus-visible`.
7.9:1 against the canvas, comfortably above the 3:1 minimum in WCAG 2.2. Inputs add
a 3px blue ring on focus in addition to a border change, so focus never relies on
colour alone.

## Primitives

| Component | File | Notes |
| --- | --- | --- |
| `Button`, `ButtonLink` | `ui/Button.tsx` | `primary`, `secondary`, `quiet`, `destructive`, `accent`; `sm`/`md`/`lg`; `loading`, `icon` |
| `Surface`, `SurfaceHeader` | `ui/Surface.tsx` | `panel`, `raised`, `outline`, `paper` |
| `Field`, `Input`, `Textarea`, `Select`, `PasswordInput`, `FormError`, `FormSuccess` | `ui/Field.tsx` | Label, help and error wired by id |
| `Table`, `THead`, `TH`, `TBody`, `TR`, `TD`, `TDPrimary` | `ui/Table.tsx` | Hairline rows, no per-row boxes |
| `StatusTag` | `ui/StatusTag.tsx` | 4px radius, semantic tone, never decorative |
| `EmptyState` | `ui/EmptyState.tsx` | Compact, left-aligned, dashed border |
| `PageHeader` | `ui/PageHeader.tsx` | Title, context, at most one primary action |
| `MetricStrip` | `ui/MetricStrip.tsx` | Replaces rows of zero cards |
| `Dialog`, `Drawer` | `ui/Dialog.tsx` | Focus trap, escape, scroll lock, focus restore |
| `Skeleton`, `SkeletonText`, `SkeletonTable` | `ui/Skeleton.tsx` | Preserve structure while loading |
| `ToastProvider`, `useToast` | `ui/Toast.tsx` | `aria-live` polite region |

### Button hierarchy

One `primary` per screen region. `secondary` sits beside it. `quiet` is for row
actions and tertiary links. `destructive` always pairs with a confirmation.
`accent` (brand blue fill) is reserved for the candidate workbench primary action.

Minimum target 24x24px; primary actions are 36 to 44px tall.

### Selected states

A selected item gets a 2px accent rail, a quiet surface change, and stronger text.
Never a thick colour slab, a curled end cap, or a silhouette change. Hover, focus,
selected, pressed and disabled all remain distinguishable.

## What this system does not do

- No page-wide radial fog, mesh gradients, or glowing pedestals.
- No gradient text.
- No bento grids or interchangeable feature-card rows.
- No pill for every piece of metadata.
- No fake charts, logos, avatars, notifications, or activity.
- No decorative `Live`, `New`, `AI-powered`, `Verified` or `Beta` capsules.
- No scroll reveal on every section, parallax, or cursor animation.
- No control that is visible but does nothing.
