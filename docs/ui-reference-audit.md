# UI reference audit

Date: 2026-08-13  
Scope: October pilot public + app chrome visual system  
References: Linear (discipline only), supplied anti-slop crops, shipped Fydell product

## Reference boundary

| Extract from Linear | Must remain Fydell-original |
| --- | --- |
| Grid discipline | Actual grid values and composition |
| Calm vertical rhythm | Section order and visual narrative |
| Product-led imagery | Workbench, evidence, curveball, report, receipt |
| Restrained typography | Type scale, font decisions, and copy |
| Opaque layered surfaces | Color, border, elevation, and component silhouettes |
| Progressive workflow story | Hiring-work-trial evidence loop |

Linear is not a visual identity kit. Do not copy its homepage geometry, type scale, violet accents, issue-board language, figure labels, or product-window treatment.

## Fydell visual thesis

> A candidate performs realistic work, the facts change, and every consequential conclusion can be traced back to evidence.

Primary metaphor: Northline ops-yield investigation canvas, not project management, kanban, or AI chat.

## Four Horsemen mapping (anti-references)

| Anti-crop | Horseman | Current Fydell risk |
| --- | --- | --- |
| Thick gold/colored selected ribbon | Lazy selected states | RoleExplorer / card selection must use 2–3px rail + contrast only |
| Wide-tracked ALL-CAPS "LETTER SPACING" | Oversized eyebrows | HeroSimPreview stage labels, product page eyebrows |
| Glowing green "Live" pill | Random status pills | LiveIndicator (unused), Saved/event capsules in hero preview |
| Purple glow inside rounded panel | Glow lights / purple gradients | AmbientBackground dual radials, body background washes |

## What to preserve

- Canonical Fydell mark (blue→red) and white wordmark on graphite
- Graphite canvas `#050507`
- Product-led hero with workbench under copy
- Rectangular marketing `ButtonLink` pattern
- Dark `MicroResultView` for evidence samples
- October CTAs: Request a pilot / Sign in

## What to remove or replace

- Multi-role marketplace hero stories (Missing Delays rotation) → single ops-yield Northline fixture
- Pedestal / box glows under product frames
- Decorative uppercase tracking labels
- Violet as default interactive accent on RoleExplorer / EvidenceFlow
- Unused slop landmines: TrustedBy, Glow*, LiveIndicator, GlassPanel, FydellAurora
- Pill CTAs on homepage / nav primary action

## Route design intent (primary action)

| Route | Primary action | Imagery |
| --- | --- | --- |
| `/` | Request a pilot | Ops-yield investigation → revision → claim → defense → receipt |
| `/product` | Understand the evaluation loop | Same motifs, one crop per section |
| `/pricing` | Choose pilot path | Dense operational copy, no fake charts |
| `/trust` | Read security/privacy truth | Opaque surfaces, no glow cards |
| `/request-pilot` | Submit request | Form-first, quiet chrome |
| `/app/employer/*` | Operate cohort | Graphite chrome alignment |
| `/sim/[id]` | Complete work trial | Investigation canvas (app density) |

## Linear principles used (not copied)

- Product scene dominates first viewport
- Short copy, strong hierarchy
- One workflow step per section
- Opaque surfaces, hairline borders
- Restrained motion only for state change
