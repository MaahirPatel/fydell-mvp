# Fydell design system

## Fydell visual thesis

Fydell is a work-trial and evidence product. Visual grammar comes from investigation, revision under changed facts, and citation-backed claims - not issue tracking or agent chat.

## Typography (Geist)

Keep Geist. Distinct from Linear/Inter.

| Role | Desktop size | Weight | Notes |
| --- | --- | --- | --- |
| Display / hero | 56-60px | 600 | LH 1.02-1.08; tracking ~-0.03em |
| Major section | 36-44px | 600 | tracking ~-0.025em |
| Product UI title | 18-24px | 600 | |
| Body | 15-17px | 400-450 | natural tracking |
| Metadata | 12-13px | 500 | sentence case only |
| Data / timers | 12-13px | 450 | tabular-nums |

No wide-tracked uppercase eyebrows.

## Grid and spacing

- Content width: ~1160-1220px (`--page-max-width: 1180px`)
- 4px base / 8px rhythm
- Major narrative sections: ~700-900px desktop when content justifies
- One idea per viewport; do not stack two major moments

## Radii

- Control: 6px
- Panel: 10px
- Frame: 14px
- CTAs: rectangular ~9px - never Linear pills

## Color semantics

| Token | Use |
| --- | --- |
| `--surface-canvas` | Page chrome |
| `--surface-raised` | Panels / product frames |
| `--surface-paper` | Long report reading |
| `--fydell-brand-blue` | Evidence, selection, citations |
| `--fydell-brand-red` | Changed info, residual risk, integrity |
| `--fydell-action` | Primary CTA fill (near-white) |
| `--fydell-evidence` / `--fydell-evidence-selected` | Trace + open citation |
| `--fydell-risk` | Residual risk / contradiction |
| `--fydell-integrity` | Integrity / disclosure |

No purple fog, violet default accents, gradient text, or glowing frames.

## Motifs

1. **Evidence trace** - 2px blue rail/connector: source -> bookmark -> claim -> opened citation  
2. **Changed-information delta** - original / new fact / revised / uncertainty (layout + labels, not git diff)  
3. **Inspectable claim** - claim, support, limitation, source, open action  
4. **Work Receipt** - private record: identity, trial, evidence, scope, share, expiry, revoke  
5. **Investigation canvas** - Northline workbench as primary brand image  

## CTA rules

- Primary: rectangular, high contrast, `Request a pilot`
- Secondary: rectangular outline / ghost
- No capsules except true toggles/avatars if required

## Motion

Only for product state: filter, phase, citation open, autosave. Respect `prefers-reduced-motion`.
