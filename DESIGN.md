# Fydell design system

Concept: **work connected to evidence**. Every claim on every surface can be opened to the code, commit, or test behind it. One system serves the marketing site, the public demo, sign-up, the developer Engineering Passport, and the employer workspace; they differ in density, not vocabulary. Canonical values live in `src/app/globals.css`.

## Themes
The whole product is light (paper). `MarketingShell` defaults to `tone="light"`, matching the signed-in app. `.theme-ink` still exists and re-points every shared token for a dark page, but no public page uses it.

## Visual language: evidence sheets
Product visuals are drawn as **sheets on a drafting table**, not dark app windows with glows:
- **Sheet:** white (`--sheet`), 1px ink hairline (`--line`), 8px radius, and a hard offset "stacked paper" edge (`--stack`) instead of a blurred shadow.
- **Table:** the hero sits on a full-bleed graph-paper band (`--graph`, 24px), with crop marks (`.crop`) at the sheet corners.
- **Title block:** a mono, uppercase footer strip (`.titleBlock`) names the sheet, revision, and `Example data`, and holds the sheet's controls.
- **Colour:** flat pale fields with an inked 3px leading rule (timeline segments, card top rules). Colour marks provenance: teal is project evidence, violet is simulation, warm is employer judgment, coral is counterevidence.
- **Code:** light code blocks (`CodeBlock`) with ink syntax colours and pale cited or failed line fields.
- **Controls:** small mono `.control` buttons (Replay, Play/Pause, presets).

Every visual is playable: the hero replays and its citations open the code; the intake board's cards are clickable; the simulation timeline scrubs; review findings and decisions are selectable; share switches and revoke update a live preview; the pricing estimator recalculates.

## Typography
| Role | Face | Use |
|---|---|---|
| Marketing display | Geist Sans 540, tracking −0.036em, line-height 1.02 | Hero up to 66px, chapter titles up to 52px, closing up to 64px |
| Display (app, passports) | Instrument Sans (`--font-display-sans`; `.display`, `.display-sm`) | Passport names and app headlines |
| Interface | Geist Sans 400–600 | Body, controls, tables, app headings |
| Code | Geist Mono | Paths, commits, citations, excerpts, chapter indices |

Marketing body copy is 15–17px in `--text-secondary`; grey continuation text inside a headline uses the module's `--dim`.

## Colour
Every shade is derived in OKLCH from four hue tokens: `--hue-brand` 285 (violet), `--hue-evidence` 178 (teal), `--hue-signal` 258, `--hue-warm` 52.

| Token | Light value | Meaning |
|---|---|---|
| `--surface-canvas` / `--surface-raised` | `oklch(99.3% 0.002 258)` / `#fff` | Page ground / sheets |
| `--text-primary` / `--text-secondary` | `oklch(17% …)` / `oklch(42% …)` | Ink |
| `--border-default` | ink at 13% | Hairlines |
| `--brand-teal` | `oklch(64% 0.12 178)` | Project evidence |
| `--brand-violet` | `oklch(54% 0.24 285)` | Simulation evidence |
| `--brand-warm` | warm hue 52 | Employer interpretation |
| `--brand-coral` / `--evidence-counter` | coral | Counterevidence, failed tests, errors |

Colour marks provenance, never competence. It is always paired with a text label.

## Layout
The marketing container is 1232px with 20–32px gutters (`fydell-home.module.css`). Pages follow one rhythm: a left-aligned hero with the lede and actions on one row, then numbered chapters. Each chapter is a two-column head (title left; copy and an index link right), one full-width product visual, and a dotted feature row. Chapters are separated by 120–200px of space, not rules. Secondary pages reuse the same primitives: `.steps` (numbered rail with a hover underline) and `.ledger` (records vs. never-does). App grids declare `grid-cols-1` at the base so long code never widens a mobile column.

## Components
`FydellLogo` (official lockup, 21px in the nav, never retyped). Pricing numbers live only in `src/lib/marketing/pricing.ts`. The homepage visuals are exported from `FydellHome.tsx` and reused on Developers, Employers and How it works: `IntakeVisual` (repository board plus import panel), `SimulationVisual` (timeline with playhead), `ReviewVisual` (interactive findings and decision), and `ShareVisual` (scoped link switches and live preview). `PassportView` renders all real passports; `EvidenceWorkspace` backs `/demo`. All example content carries `DEMO_LABEL`.

## Motion
CSS-only and driven by state. The hero window enters with blur, translation, and scale; activity items land on fixed beats; the analysis panel shows a working shimmer, then a typed answer with citations. Chapter visuals start when 25% of them is in view (`useInView`) and loop on a ticker: cards move across the board, segments reveal along the timeline, and a playhead sweeps. Hover and selection transitions take 120–200ms. Everything stops under `prefers-reduced-motion` and shows its final state.

## Voice
Confident and specific. State what the product does; place limits beside the claim they qualify. No placeholder, preview, or roadmap language in shipped surfaces.
