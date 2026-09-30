# Fydell visual system

Light-first, dual-theme system for the public site and product comps. The live
reference is `/design` (tokens, components, motion spec and prototypes, and the
rationale) and `/design/app` (employer workspace and desktop app screens). Both
are `noindex`.

## Where things live

| What | Where |
| --- | --- |
| Tokens, light and dark (`[data-theme="dark"]`, `.theme-ink`) | `src/styles/fydell-tokens.css` |
| Motion (entrances, reveals, reduced motion) | `src/styles/site-motion.css`, `src/components/site/Reveal.tsx` |
| Mark and lowercase wordmark | `src/components/site/Mark.tsx` |
| Primitives: section head, buttons, frame, caption, pills, chips, trio, FAQ | `src/components/site/primitives.tsx`, `site.module.css` |
| Nav, footer, shell | `src/components/site/SiteNav.tsx`, `SiteFooter.tsx`, `SiteShell.tsx` |
| Line illustrations (8) | `src/components/site/Illustrations.tsx` |
| Product visuals (HTML/CSS, `role="img"` + label) | `src/components/site/visuals/` |
| Public pages | `src/components/site/pages/` |

## Rules that are easy to break

- Colour: blue = interactive, red = requirement changes and failures, teal = passed,
  violet only inside gradients and the mark. Gradient text once per page, never a
  coloured word inside a headline.
- Separation by surface steps first; 1px hairline borders only where needed.
- Text hierarchy by the four solid text tokens, never opacity. All pass AA on
  every surface (values on `/design`).
- Every product visual has a caption starting "Example:".
- No scores, ratings, rankings, gauges, testimonials, customer logos or stats bands.
  `npm run test:homepage` enforces the public-site contract.
- Motion uses `var(--ease)` only; everything must be visible with
  `prefers-reduced-motion: reduce` and without JavaScript.
