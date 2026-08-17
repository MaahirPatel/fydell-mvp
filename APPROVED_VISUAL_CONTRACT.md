# Approved visual contract

**Direction:** A — Dense Linear-discipline shell  
**Status:** Working contract (recommended). Explicit `B`/`C` reply overrides.  
**Reference comps:**  
- [`docs/screenshots/visual-productization/directions/direction-a-dense-shell-1440.png`](docs/screenshots/visual-productization/directions/direction-a-dense-shell-1440.png)  
- [`docs/screenshots/visual-productization/directions/direction-a-dense-shell-1280.png`](docs/screenshots/visual-productization/directions/direction-a-dense-shell-1280.png)

## Shell measurements (1440)

| Region | Width | Notes |
|---|---|---|
| Mission rail | 200–220px | Hairline right border; list density; no pills |
| Work canvas | flex min 0 | ≥55% of remaining width; table owns the space |
| Evidence inspector | 260–300px | Always visible on desktop; collapsible only &lt;1280 |
| Command bar height | 48px | Mark/wordmark or back · title · stage · timer · save · submit |

## Type scale (application)

| Role | Size | Token |
|---|---|---|
| Focal (page / mission title in canvas) | 24–26px | `text-app-page` (~1.625rem) — use for active claim / stage title |
| Section | 16–17px | `text-app-section` |
| Body / controls | 13.5–14.5px | `text-app-body` (0.875rem) |
| Metadata | 12–12.5px | `text-app-meta` |

**Rule:** No hardcoded `text-[Npx]` in simulation components when a semantic role exists. Focal must be ≥1.7× body.

## Surfaces / borders / radii

- Canvas: `--surface-canvas` / `--color-canvas`
- Panels: `--surface-panel` / `--color-panel`
- Borders: hairline `--border-subtle` / `--border-default` only
- Max containment depth in one region: **2**
- Radii: control 6px, panel 8–10px, frame ≤14px
- One saturated accent per viewport: `--color-action` for primary action + selection

## Color semantics

| Token | Meaning |
|---|---|
| `--color-action` | Primary action, selected row/claim |
| `--color-changed` | Changed information / needs review |
| `--color-risk` | Unsupported claim, destructive |
| `--color-good` | Real completed / verified save success |

Logo cyan/magenta only on the chain mark.

## Deletion checklist (must remain true)

- No nested card-in-card-in-card
- No status pills except load-bearing state
- No purple atmospheric washes / glow / glass
- Fake “Saved” without persistence forbidden

## Borrow from other directions (without changing shell)

- **From C:** Dataset density and query/results in the center canvas
- **From B:** Selected-claim focus that highlights cited rows (thread language for selection, not as shell)

## Implementation target files

- `src/components/simulations/**`
- `src/app/globals.css` (token contrast only if measured)
- Workbench hosts under `src/app/app/employer/workbench` and lab hosts
