# Marketing visual audit

Scout pass over the Fydell public site against the Linear, Cursor and Drift
reference captures. Findings come from a live render at 1440x1000 plus computed
style measurement, not from reading source.

Severity is 1 (cosmetic) to 5 (the thing a visitor notices first and reads as
machine-made).

## Direction change recorded mid-audit

The site was near-black. It is now a **warm bright theme**: ivory canvas
`#fbf9f5`, warm near-black ink `#2a2521`, sage and apricot atmospheric washes
running the length of the document. Drift is the palette reference; Linear and
Cursor remain the reference for typographic discipline, product-window craft and
section pacing.

This inverts several findings below, so each row records the problem as it
stands after the theme flip rather than as it stood on the dark build.

## The four horsemen

The four patterns the user identified as the tells of generated design. Any one
of them appearing is an automatic fail, independent of the score.

| # | Pattern | Why it reads as generated |
|---|---|---|
| 1 | Blurred saturated gradient orb floating in open space | Decoration with no informational job. Distinct from a document-length atmospheric wash, which is fine and is what we now use. |
| 2 | Wide-tracked uppercase micro-labels | Tracking used as decoration. Sentence case at normal tracking is what real product UI does. |
| 3 | Coloured left accent bar on a card | The default notification-card template. Signals a component library, not a design. |
| 4 | Bright green success pills and dots | Consumer-app celebration applied to information. A hiring recommendation is not a congratulation. |

## Findings

| # | Area | Reference characteristic | Current Fydell | Problem | Sev | Correction | Pass criterion |
|---|---|---|---|---|---|---|---|
| 1 | Scene cast | Reference product shots use plausible, specific, consistent data | `Sarah Chen`, `Jonah Miller`, `Amina Patel`, `Diego Ruiz` | The single loudest AI tell on the page. These are the default LLM name set. | 5 | Replace with `Candidate 1..4`, initials `C1..C4`, held identical across every scene | No personal names anywhere in marketing scenes |
| 2 | Hero evidence lines | Emphasis by ink weight and rule, never by fill | Paragraph-width saturated purple fill behind two evidence lines | Reads as selected text or a debugging highlight, not product UI | 5 | Thin low-opacity evidence rule plus stronger ink on the lead-in phrase | No fill wider than a short token behind running text |
| 3 | Hero product window | One continuous application divided by panes | Bordered shortlist card with a separate rounded decision-brief card floating on top | Card inside card. The composition announces itself as a marketing mockup | 4 | One outer frame, 1px dividers, three panes: role nav / shortlist / brief | Single frame, zero floating rounded cards |
| 4 | Status treatment | Muted, informational | Bright green `Strong Interview` pill and green ready-dot | Horseman 4 | 4 | `--status-positive-*`, desaturated | No saturated green anywhere |
| 5 | Disclosure | Reference sites carry none | `synthetic illustration` repeated in every scene bar | Makes a finished site look like a prototype, and competes with product information | 4 | Remove; at most one quiet `Illustrative product view` in one location | Disclosure appears at most once |
| 6 | Chapter composition | Reference varies: full-bleed, contained, open, overlapping | Nearly every chapter is heading then one large rounded bordered rectangle | Repetition is the strongest structural signal of generated layout | 4 | Vary per scene: edge-to-edge, divider-led open layout, one full-width timeline, one contained | At most two chapters use a bordered frame |
| 7 | Adapt chapter | The signature idea deserves the strongest composition | Three equal-size cards: Before / New information / After | The concept is right, the execution is the generic three-card grid | 4 | Continuous vertical timeline with timestamps, then an observation list | No three-equal-card row |
| 8 | Hero typography | Linear hero is large but held to a measure | Was `clamp(48px, 6vw, 84px)` at `max-width: 1280px`, filling the viewport | Reads as "look how large the headline is" rather than confident | 4 | `clamp(54px, 5.2vw, 72px)`, `max-width: 850px`, weight 560, tracking -0.045em | Headline wraps to 3 controlled lines at 1440, never touches the container edge |
| 9 | Three principles | Linear's FIG 0.2-0.4 are crafted isometric line drawings | Generic wireframe icons in large empty boxes | Reads as "AI generated three SVGs". Not derived from the product | 4 | Three product-derived micro-scenes with vertical dividers, 440-520px block | Each figure depicts an actual Fydell mechanic |
| 10 | Hero supporting copy | One secondary element | Lede plus an orphaned right-aligned `Starting with Solutions Engineers` | Two competing secondaries; the right line exists only to fill horizontal space | 3 | Removed from the hero | No isolated helper text in the hero |
| 11 | Background | Reference backgrounds have depth and colour | Flat near-black, then flat ivory | Flat ground makes a 10,000px page feel cheap | 3 | Document-length sage and apricot washes, off-canvas ellipse centres | Visible tint that shifts down the page, no legible circle |
| 12 | Typeface | Linear and Cursor both run Inter | Archivo plus Spline Sans Mono, with a `wdth` axis | Archivo's wide default and the width-axis trick read as a substitute for real optical sizing | 3 | Inter throughout; JetBrains Mono for data only | Inter resolved on every text node |
| 13 | Monospace | Reserved for code and identifiers | Applied to labels and supporting UI across scenes | Makes a hiring product feel like a terminal | 3 | Mono only for timestamps, event IDs, technical artifacts | Mono count in scenes falls to data-bearing nodes only |
| 14 | Container | 1180-1220px with real side margin | 1440px with `clamp(24px, 4vw, 56px)` | At 1680 the content hugs the edges and loses editorial framing | 2 | `--marketing-container: 1200px`, `--marketing-page-x: 40px` | Substantial symmetric margin at 1680 |
| 15 | Footer | Restrained but complete multi-column | Sparse, reads unfinished | Undermines the enterprise-credibility the rest of the page is arguing for | 2 | Multi-column using only routes that exist, plus a legal bottom row | No dead links; every column has real destinations |

## Fix dependency graph

Type and token work has to land before scene work, or every scene gets tuned
against values that are about to move.

```
G1 typography ─┐
G2 spacing ────┼─→ G3 visual grammar ─→ G4 shell (nav, footer)
theme flip ────┘                              │
                                              ↓
                        ┌─────────────────────┴─────────┐
                        ↓                               ↓
                  G5 hero scene                  G6 principles
                        └───────────────┬───────────────┘
                                        ↓
                              G7 chapter scenes
                                        ↓
                              G10 adversarial critic
                                        ↓
                              G11 repair (severity >= 3)
                                        ↓
                              G12 verification
```

## Status

Landed: theme flip, Inter, container and hero type, nav theming, atmospheric
washes, hero orphan copy removed.

Outstanding: findings 1-7, 9, 13 and 15. These are scene-level and are the
substance of the remaining work.
