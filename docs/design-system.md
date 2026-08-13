# Fydell design system

## Fydell visual thesis

Fydell is a work-trial and evidence product. Surfaces should make investigation, revision under changed facts, and citation-backed claims feel precise and trustworthy.

## Canonical logo and mark

- Use repository `FydellMark` / `FydellBrand` only. Do not redraw or Linearize the symbol.
- Wordmark is white on graphite.
- Blue→red lives in the mark; do not wash pages with that gradient.

## Color palette and semantic tokens

| Token | Role |
| --- | --- |
| `--surface-canvas` | Page / shell background |
| `--surface-raised` | Panels, product frames |
| `--surface-paper` | Optional light reading surface inside dark shell |
| `--border-subtle` / `--border-strong` | Hairline hierarchy |
| `--fydell-brand-blue` / `--fydell-brand-red` | Brand mark + rare local accents |
| `--fydell-action` | Primary actions, focusable emphasis |
| `--fydell-evidence` | Evidence affordances |
| `--fydell-evidence-selected` | Selected claim / citation |
| `--fydell-risk` | Risk / integrity warning |
| `--fydell-integrity` | Integrity / disclosure signals |

Neutrals dominate. Accents appear only when they encode action, evidence, selection, change, risk, or integrity. Linear violet is not a default accent.

## Type

- Stack: Geist Sans / Inter (existing). Kept because operational density and tabular data already use it; not changed to imitate Linear.
- Sentence case by default.
- Natural tracking for body, nav, buttons, labels.
- Display headings: restrained negative tracking only (`≈ -0.02em` to `-0.035em`).
- Uppercase: rare compact metadata, ≤ ~`0.06em` tracking, never section eyebrows.
- Tabular numerals for timers, counts, yields, scores.

### Scale (Fydell-derived)

| Role | Size | Weight |
| --- | --- | --- |
| Display | 36–48px | 600 |
| Page title | 28–34px | 600 |
| Section title | 22–26px | 600 |
| Body | 15–16px | 400–450 |
| Label | 13–14px | 500 |
| Metadata | 11–12px | 500 |
| Data / table | 12–13px tabular | 450 |

## Spacing and radius

- 4px base, 8px primary rhythm.
- Radius: 6 / 10 / 14px. Capsules only for compact controls that require them.
- Marketing spacing is generous; app chrome is denser.

## Original motifs

### Evidence rail

2–3px accent rail on the leading edge of a claim, citation, or receipt evidence row. Communicates **traceability**, not decoration. Never an oversized ribbon or silhouette-changing slab.

### Investigation canvas

Workbench anatomy: brief → resource tabs → readable table → filter/compare → evidence tray → working conclusion → autosave status (factual only).

### Revision delta

Original finding / new fact / retained or revised conclusion / evidence reason. Accessible without color alone (labels + structure). No theatrical red/green diff chrome.

### Inspectable claim

`claim → support → limitation/counterexample → source`. Opening a citation is a signature interaction.

### Work Receipt composition

Private professional record: identity, trial completed, demonstrated evidence, scope/limitations, share state, expiry, revoke. Not a certificate, NFT, or social badge.

## Marketing vs application density

| | Marketing | Application |
| --- | --- | --- |
| Spacing | Larger section rhythm | Compact tables/forms |
| Surfaces | Graphite raised frames | Graphite + optional paper for long reports |
| Motion | Rare, explanatory | Autosave, curveball, citation open |

## Focus

Visible focus rings on dark and light surfaces (`outline` / ring with brand-blue at low opacity). Hover ≠ selected ≠ focus.
