# Design System — Fydell

One token layer serves four surfaces: the public site, the employer console, the candidate workbench, and the evidence report. They differ in density and pacing, not in vocabulary. The canonical source is the `:root` and `@theme` blocks in `src/app/globals.css`; this document explains the intent behind those values.

## Visual theme

Bright evidence instrument. A warm green-to-ivory atmosphere holds compact stone product surfaces, with pure white reserved for the active or focal plane. The interface should read as a system that records work, preserves provenance, and supports a decision—not as a generic HR dashboard.

Confidence comes from precise alignment, believable working density, restrained weight, and causal product scenes. Marketing visuals use a contextual plane, an active plane, and one elevated focal object. They do not copy Linear's dark palette; they apply its compositional discipline to Fydell's own bright world.

## Colour

Surfaces step in small increments so depth reads as structure rather than as stripes.

| Token | Value | Use |
|---|---|---|
| `--surface-canvas` | `#f7f4ed` | Warm page atmosphere |
| `--surface-deep` | `#f2eee6` | Context plane; rails and scene base |
| `--surface-band` | `#f7f4ed` | Chapter and frame chrome |
| `--surface-panel` | `#faf8f3` | Active product plane |
| `--surface-raised` | `#ffffff` | Focal overlays and primary documents only |
| `--surface-hover` | `#f6f3ec` | Hover on a row or control |
| `--surface-selected` | `#f0ece3` | Selected row without a colored stripe |
| `--surface-paper` | `#ffffff` | Exported evidence and printable surfaces |

Text hierarchy is carried by solid colours, never by opacity, so it survives on every surface. All four clear WCAG 2.2 AA against the canvas.

| Token | Value |
|---|---|
| `--text-primary` | `#211d19` |
| `--text-secondary` | `#625a52` |
| `--text-tertiary` | `#716860` |
| `--text-disabled` | `#716961` |

Borders use warm ink at low alpha: `--border-subtle` 11%, `--border-default` 18%, `--border-strong` 29%. Luminance separates planes first; hairlines confirm the edge; shadow is reserved for the focal object.

### Colour carries meaning, not decoration

Each accent has exactly one job. If a colour appears without that meaning, it is a bug.

| Token | Value | Means |
|---|---|---|
| `--evidence-generated` | `#6f55c9` | Fydell-generated claim or prompt |
| `--evidence-observed` | `#156f82` | Directly observed candidate or world event |
| `--evidence-support` | `#357252` | Supporting evidence |
| `--evidence-uncertain` | `#94651d` | Changed information or unresolved uncertainty |
| `--evidence-counter` | `#b64053` | Counterevidence or contradiction |
| `--action-ink` | `#695344` | Focus rings, links, and restrained actions |

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

`--motion-fast` 140ms for hover and focus, `--motion-panel` 190ms for expansion and disclosure, on `--ease` `cubic-bezier(0.16, 1, 0.3, 1)`. Product motion confirms a state change. Marketing product theater may use one entrance and scrubbed plane transitions to explain causality. `prefers-reduced-motion` leaves every layer visible and removes the transitions.

## Iconography

Lucide, 16px in the product and 18px in navigation, at 1.5px stroke, always paired with a label except in a control whose meaning is unambiguous. Icons inherit text colour.

## Anti-patterns

Banned outright: purple wash, glass and heavy blur, gradient text, glowing borders, neon, marquees, scroll-jacking, entrance animation on every element, pills around every label, cards nested inside cards inside cards, decorative stock or AI imagery, fake logos and testimonials, emoji as iconography, and any chart without a real underlying series.

Also banned, more quietly: centre-aligning everything, `text-align: center` on a paragraph longer than two lines, five type sizes in one panel, and colour used because a section looked empty.
