# UI slop audit

Status values: `PASS` | `FAIL` | `UNVERIFIED`. Updated 2026-08-13 after spacious homepage + Simulations feed revision.

## Four Horsemen checklist

| Route | Lazy selection | Oversized eyebrows | Decorative pills | Glow / purple wash |
| --- | --- | --- | --- | --- |
| `/` | PASS (2px evidence rail / compact selected tabs) | PASS (no ALL-CAPS eyebrows) | PASS (no Live/New capsules) | PASS (flat canvas) |
| `/simulations` | PASS (text filter, not ribbon slabs) | PASS (sentence-case filters) | PASS (removed violet "5 simulations" pills) | PASS |
| `/product` | PASS | PASS | PASS | PASS |
| `/pricing` | PASS | PASS | PASS | PASS |
| `/trust` | PASS | PASS | PASS | PASS |
| `/request-pilot` | PASS | PASS | PASS | PASS |
| Employer chrome | PASS (2px rail on active nav) | PASS | PASS | PASS |

## Broader failure modes

| Failure | Result |
| --- | --- |
| Logo cloud | PASS absent |
| Fake analytics | PASS absent |
| Marketplace multi-role hero | PASS Northline ops-yield canvas |
| Violet interactive chrome | PASS removed from simulations catalog |
| Pedestal glow under product | PASS removed |
| Pill CTAs | PASS rectangular ~9px |
| Linear Now clone | PASS pacing borrowed; Fydell sim cards + evidence marks, not blog line-art |

## Derivative-design audit

| Test | Result | Notes |
| --- | --- | --- |
| Fydell-without-the-logo | PASS | Workbench, evidence tray, revision delta, receipt |
| Linear-with-different-copy | PASS | Investigation + evidence motifs ≠ issue board / agent chat |
| Product-truth | PASS | Scenes traced to Northline / marketing compositions |
| Asset-provenance | PASS | Canonical mark; no Linear assets |
| First-viewport identity | PASS | Hero ~58px + Northline workbench / evidence tray dominate |

## Screenshot evidence

| Viewport | File | Gate |
| --- | --- | --- |
| 1440×900 | `docs/screenshots/visual-pass/home-1440x900.png` | originality PASS |
| 1280×800 | `docs/screenshots/visual-pass/home-1280x800.png` | originality PASS |
| 1440×900 | `docs/screenshots/visual-pass/simulations-1440x900.png` | Now-like pacing; Fydell sim feed PASS |

## Product-truth inventory

| Scene | Component | Fixture | Interaction |
| --- | --- | --- | --- |
| Investigation canvas | `HeroSimPreview` | northline-ops-yield | Filter + phase (marketing) |
| Investigate crop | `HomeProductStory` | Same rows | Static |
| Revision delta | `HomeProductStory` | Curveball | Static |
| Inspectable claim | `EvidenceRail` | HOLD_RECLASS | Static |
| Oral defense | `HomeProductStory` | Evidence question | Static |
| Work Receipt | `HomeProductStory` | Share/revoke | Static |
| Simulations grid | `SimulationsFeed` | `ALL_SIMULATIONS` | Role filter |

## Exceptions

None.
