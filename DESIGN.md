# Design System — Fydell

One token layer serves four surfaces: the public site, the employer console, the candidate workbench, and the evidence report. They differ in density and pacing, not in vocabulary. The canonical source is the `:root` and `@theme` blocks in `src/app/globals.css`; this document explains the intent behind those values.

## Visual theme

Neutral graphite instrument. Near-black canvas, hairline structure, one action colour, colour reserved for meaning. The interface should read as something that records and reports rather than something that persuades.

Confidence comes from precision: exact alignment, tight tracking, restrained weight, honest empty states. Not from size, glow, or gradient.

## Colour

Surfaces step in small increments so depth reads as structure rather than as stripes.

| Token | Value | Use |
|---|---|---|
| `--surface-deep` | `#050607` | Behind the canvas; sidebar and rail wells |
| `--surface-canvas` | `#08090a` | Page background |
| `--surface-band` | `#0b0c10` | One step off canvas, to separate chapters on a long page |
| `--surface-raised` | `#0e1013` | Panels sitting on the canvas |
| `--surface-panel` | `#13161b` | Panel interiors, inputs, controls |
| `--surface-hover` | `#181c22` | Hover on a row or control |
| `--surface-selected` | `#202631` | The selected row |
| `--surface-paper` | `#f5f7f8` | The one inverted surface; primary buttons |

Text hierarchy is carried by solid colours, never by opacity, so it survives on every surface. All four clear WCAG 2.2 AA against the canvas.

| Token | Value |
|---|---|
| `--text-primary` | `#f5f7f8` |
| `--text-secondary` | `#b6bbc4` |
| `--text-tertiary` | `#858b96` |
| `--text-disabled` | `#5f656f` |

Borders are white at low alpha so they hold on any surface step: `--border-subtle` 7.5%, `--border-default` 13%, `--border-strong` 18%.

### Colour carries meaning, not decoration

Each accent has exactly one job. If a colour appears without that meaning, it is a bug.

| Token | Value | Means |
|---|---|---|
| `--fydell-brand-blue` | `#5662ff` | Brand and primary action |
| `--action-ink` | `#8f9bff` | Focus rings, links, action text on dark |
| `--fydell-evidence` | `#6b8cff` | Active investigation, in-flight work |
| `--fydell-changed` | `#e9b949` | Information changed, or review required |
| `--fydell-risk` | `#f26b82` | Unsupported claim, destructive action, failure |
| `--fydell-good` | `#67d9a0` | A genuinely completed state, never optimism |
| `--fydell-verified` | `#b07fd0` | A claim checked against its evidence. Local accent only |

Visualisation reuses those meanings rather than inventing a palette. `--viz-track` is the empty channel, `--viz-idle` neutral for not-started, and the fills map to evidence, good, and changed. There is no categorical colour ramp, because a pipeline of stages is ordered, not categorical.

## Typography

Geist Sans and Geist Mono, bundled through the `geist` npm package and loaded in `src/app/layout.tsx`. No webfont requests. Geist Mono is for identifiers, timestamps, and anything the user might copy.

Two scales, because the two contexts have opposite needs.

**Marketing is fluid.** A landing page is read once at whatever width the reader arrives with, so headings scale with the viewport.

| Token | Range |
|---|---|
| `--type-display` | 56–84px |
| `--type-page` | 48–68px |
| `--type-section` | 38–56px |

**Product is fixed.** A console is read every day and gets learned. Fluid clamps make the same screen a different size on every machine, which is the enemy of earned familiarity, so the app scale is in fixed rem.

| Token | Size | Use |
|---|---|---|
| `--type-app-page` | 26px | Page title, once per screen |
| `--type-app-section` | 17px | Panel and section headings |
| `--type-app-body` | 14px | Rows, values, body copy |
| `--type-app-meta` | 12.5px | Labels, timestamps, secondary detail |

Weights stay between 430 and 560. Tracking tightens as size grows, from `0` at meta to `-0.04em` at display. Every count, score, percentage, duration, and date uses `tabular-nums` so columns of numbers align and do not jitter as they update.

## Layout

- Max width `--page-max-width` 1320px. Gutters 24px, 40px at 768px, 48px at 1024px.
- Space scale is 4px base on an 8px rhythm, from `--space-1` 4px to `--space-12` 144px.
- Marketing sections breathe at 96–120px vertical; chapters in a continuous narrative sit one step tighter at 80–96px.
- The employer console is desktop-first and fills its rail. It does not re-centre inside a narrower column, because unused desktop canvas reads as an unfinished product.
- Radius: `--radius-tag` 4px, `--radius-control` 6px, `--radius-panel` 10px, `--radius-frame` 14px.

## Structure

The **Panel** is the primary structural device: one bordered container holding several hairline-separated sections. Related modules live inside one frame rather than floating as separate cards, so the eye reads a sequence instead of hunting a grid. A section header is a label on the left with its control on the right.

Density over decoration. A number does not need a card. A card holding one metric is a card too many.

## Motion

`--motion-fast` 140ms for hover and focus, `--motion-panel` 190ms for expansion and disclosure, on `--ease` `cubic-bezier(0.16, 1, 0.3, 1)`. Motion confirms a state change; it never announces arrival. Nothing animates on page load in the product. `prefers-reduced-motion` collapses everything to near-zero.

## Iconography

Lucide, 16px in the product and 18px in navigation, at 1.5px stroke, always paired with a label except in a control whose meaning is unambiguous. Icons inherit text colour.

## Anti-patterns

Banned outright: purple wash, glass and heavy blur, gradient text, glowing borders, neon, marquees, scroll-jacking, entrance animation on every element, pills around every label, cards nested inside cards inside cards, decorative stock or AI imagery, fake logos and testimonials, emoji as iconography, and any chart without a real underlying series.

Also banned, more quietly: centre-aligning everything, `text-align: center` on a paragraph longer than two lines, five type sizes in one panel, and colour used because a section looked empty.
