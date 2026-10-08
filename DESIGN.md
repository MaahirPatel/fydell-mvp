# Fydell design system

Concept: **work connected to evidence**. Every claim on every surface can be opened to the code, commit, test or message behind it. One system serves the marketing site, the public demo, sign-up, the developer Engineering Passport and the employer workspace; they differ in density, not vocabulary. Canonical token values live in `src/styles/fydell-tokens.css` and `src/app/globals.css`.

## Themes
The whole product is light. `MarketingShell` renders every public page on the light canvas, matching the signed-in app. `.theme-ink` still re-points the shared tokens for a dark page, but no public page uses it.

## Public site direction: light Linear, laid out like x.ai
- **Layout (x.ai):** very large left-aligned statements, generous negative space, few words per chapter, a monochrome palette (near-white ground, near-black ink, greys), hairline rules between chapters, and one large product view per chapter.
- **Type (Linear):** Geist Sans with tight negative tracking and medium-to-semibold display weights, one grey supporting line beside each statement, small precise labels, 15 to 16px body.
- **Visuals (Linear, in light mode):** product views are built in HTML and CSS from real product data, never screenshots or illustrations. They sit in light windows with a hairline border, 14px radius and a soft layered shadow.

## Page grammar (`src/components/marketing/site/`)
- `SiteHero`: an optional announcement pill, the statement (84px desktop, 60px tablet, 44px phone; weight 560; tracking -0.04em), then a row with the grey lead on the left and the actions on the right (filled black primary, quiet outlined secondary, optional text link with an arrow). An optional facts line (`meta`) sits under a hairline below the actions; product pages use it for the product name and availability. Then the product view.
- `Feature`: each chapter opens with a hairline. The title (52px) sits left and the copy plus a "next step" link sits right, aligned to the title's baseline; then the full-width view; then an optional three-column facts row divided by vertical hairlines. `split` puts copy and view side by side.
- `SiteFaq`, `SiteClosing`: the closing chapter is a large statement (68px) with the page's primary and secondary actions. Every chapter ends in a real next step; nothing is a dead end.
- No eyebrow labels above headings, no gradient text, no coloured side borders, no decorative floating cards, no emoji.

## Product views
| View | File | Shows |
|---|---|---|
| Simulation window | `SimulationHero.tsx` | The candidate's desktop simulation in an issue tracker's structure: workspace sidebar (Harbor Pay; Brief, Team thread, Tasks, Files, Tests, Submission; the INC-2291 incident and the requirement update), the incident with its activity (brief posted, public test run, the partner's request), and the team thread docked on the right with a teammate's reply, the changed files and a composer. Scenario facts come from the shipped `backend-webhook-retry` definition. Home hero, Simulations and Desktop pages. |
| Passport | `ProfileWorkspace.tsx` | Projects, the open project's contribution, one finding with cited lines and its limits. Interactive. |
| Builder Report | `home/BuilderReportDemo.tsx` | Findings with the lines they cite and what they cannot show. Interactive. |
| Hiring Workspace | `ApplicantReview.tsx` | One applicant read requirement by requirement, the evidence for the selected requirement, and the team decision. Interactive. |
| Simulation, browser | `SimulationWorkspace.tsx` | Brief, requirements, files, public tests and team thread. Tagged "Preview". |

`ProductFrame` wraps every view. With `chrome="window"` it draws a light title bar with the view's name and its tag ("Example data" or "Preview"); with `chrome="none"` the view draws its own window bar and its own visible "Example" label. All example content is fictional and labelled.

Selection inside views is neutral (`--surface-deep`), not tinted. Colour is reserved for state: positive, attention and failure inks, always paired with a word.

## Navigation
`SiteNav` is fixed, transparent at the top and a blurred light scrim with a hairline once the page scrolls. Labels are 14.5px at weight 580: Product (menu), For Engineers, For Employers, Pricing; on the right Download, Log in and a filled black Sign up. Hover and the current page both show a grey pill. `SiteFooter` is a multi-column footer (Product, Solutions, Resources, Company) with a short line under the logo and a legal row under a hairline.

## Colour
| Token | Light value | Meaning |
|---|---|---|
| `--surface-canvas` / `--surface-raised` | `#f7f8fa` / `#fff` | Page ground / windows |
| `--surface-panel` / `--surface-deep` | `#f5f6f8` / `#eceef2` | Sidebars / selection |
| `--text-primary` / `--text-secondary` / `--text-tertiary` | `#14161b` / `#4f5562` / `#646b78` | Ink, supporting line, meta |
| `--border-subtle` / `--border-default` / `--border-strong` | greys | Hairlines |
| `--control-solid` | `#111214` | Primary buttons |
| `--status-*-ink` | green, amber | Passed, supported, in progress, preview |
| `--fy-red-ink` | red | Failed tests, removed lines |

## Motion
One authored moment per hero: the simulation window settles in (opacity, 14px rise, a short blur), the activity and thread fill in on fixed beats, and the requirement update lands last with a brief tint. Exponential ease-out. Interface transitions take 100 to 160ms. Everything is static under `prefers-reduced-motion`.

## Voice
Confident and specific. State what the product does; place limits beside the claim they qualify. Example data is labelled. No placeholder or roadmap language in shipped surfaces.
