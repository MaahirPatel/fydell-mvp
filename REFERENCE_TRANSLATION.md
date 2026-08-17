# Reference translation

Maps the master prompt’s reference IDs to files available in this repository and chat packet. UUID filenames from the Downloads brief are **not** present under those names; authoritative local + chat references are used instead.

## Authority matrix (from brief)

| Group | Typography | App density | Marketing pacing | Product framing | Diagrams | Color | Content | Interaction |
|---|---|---|---|---|---|---|---|---|
| Current Fydell | Supporting | Supporting | Negative | Negative | Supporting | Supporting | Primary | Primary |
| Linear | Primary | Primary | Primary | Primary | Supporting | None | None | Supporting |
| Stripe | Supporting | None | Primary | Supporting | Primary | None | None | Supporting |
| Power Platform | Negative | Negative | Negative | Negative | None | Negative | None | Supporting |

## Local Linear pack

| Prompt-ish ID | Local file | Extraction |
|---|---|---|
| `LINEAR-PRODUCT-SHELL` | [`assets/linear_refs/Linear_Reference_Pack/assets/linear-intake-product-scene-01.png`](assets/linear_refs/Linear_Reference_Pack/assets/linear-intake-product-scene-01.png) | Continuous three-region shell; hairlines; density without nested cards |
| `LINEAR-OPERATIONS` | `.../linear-keypair-product-scene-02.png` | Product as proof; large canvas |
| `LINEAR-BUILD` | `.../linear-keypair-product-scene-03.png` | Layered foreground without glow |

**Principle borrowed:** stable spatial structure, type hierarchy, subtraction.  
**Prohibited copy:** Linear logo, issue tracker, agent drawer, yellow status system, cubes, section numbering as scaffolding.

## Current Fydell baselines (product truth + shortcomings)

| ID | Source | Notes |
|---|---|---|
| `CURRENT-SIMULATION` | Marketing `HeroSimPreview` + [`docs/screenshots/visual-productization/baseline-marketing-home.png`](docs/screenshots/visual-productization/baseline-marketing-home.png) | Northline table + stages; uniform type; card frame |
| `CURRENT-ENGINE-WORKBENCH` | [`docs/screenshots/visual-productization/baseline-workbench-q3-churn.png`](docs/screenshots/visual-productization/baseline-workbench-q3-churn.png) | Engine DA (Q3 churn), not yet Northline ops-yield |
| `CURRENT-EMPLOYER` | `docs/screenshots/dashboard/*`, `docs/screenshots/employer/*` | Console density OK; still MVP card grammar |
| `CURRENT-EVIDENCE-REPORT` | Home evidence section + `ReportInspector` | Claim→source exists; hierarchy thin |
| Chat packet (Linear / Stripe / Power / Fydell marketing frames) | Attached in Cursor conversation | Used as visual evidence; store paths when re-exported into `docs/screenshots/visual-productization/refs/` |

## Stripe (supporting)

Use for: explanatory diagrams, path comparison, metrics with restraint.  
Do not copy: purple, waves, integration logos, payments language.

## Power Platform (negative)

Use for: “prompt → structured blueprint” interaction idea only.  
Reject: giant glowing textarea, lavender glow, generic form cards, decorative cursor.

## Fydell translation rules

| Observation | Principle | Fydell translation | Forbidden |
|---|---|---|---|
| Linear three-region shell | Stable structure reduces navigation cost | Mission rail · work canvas · evidence inspector | Linear issue UI / agent pane |
| Linear marketing product scale | Capability is the visual | Full-bleed workbench in marketing, ≥58% width | Tiny framed mockups |
| Stripe relationship diagrams | Relationships visible | Evidence threads: source → claim → revision → decision | Neural nets, purple constellations |
| Power natural-language entry | Intent → structured artifact | “What should this candidate prove?” → editable blueprint | Empty glowing prompt stage |

## Test method

For every rebuilt surface: pairwise current vs rebuilt; rebuilt vs Linear principle (not clone); rebuilt vs Power/AI-slop negatives; screenshot vs approved contract.
