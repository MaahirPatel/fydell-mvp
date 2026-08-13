# UI slop audit

Status values: `PASS` | `FAIL` | `UNVERIFIED`. Updated 2026-08-13 after homepage gate capture.

## Four Horsemen checklist

| Route | Lazy selection | Oversized eyebrows | Decorative pills | Glow / purple wash |
| --- | --- | --- | --- | --- |
| `/` | PASS (2px evidence rail / compact selected tabs) | PASS (no section ALL-CAPS eyebrows) | PASS (no Live/New capsules; Saved is factual autosave label) | PASS (flat canvas; no dual radials / pedestal glow) |
| `/product` | PASS | PASS | PASS | PASS |
| `/pricing` | PASS (existing denser marketing; no Live pills) | PASS | PASS | PASS |
| `/trust` | PASS | PASS | PASS | PASS |
| `/request-pilot` | PASS | PASS | PASS | PASS |
| Employer chrome | PASS (2px rail on active nav) | PASS | PASS | PASS (graphite shell; paper content panels OK) |

## Broader failure modes

| Failure | Result |
| --- | --- |
| Logo cloud | PASS absent |
| Fake analytics | PASS absent |
| Marketplace multi-role hero | PASS replaced with Northline ops-yield canvas |
| Violet interactive chrome | PASS demoted; action uses `--fydell-action` |
| Pedestal glow under product | PASS removed |
| Pill CTAs | PASS rectangular 6–9px controls |

## Derivative-design audit

| Test | Result | Notes |
| --- | --- | --- |
| Fydell-without-the-logo | PASS | Hero + Northline yield table / evidence tray reads as hiring work trial |
| Linear-with-different-copy | PASS | Left-aligned Fydell narrative + investigation canvas is not a Linear board/chat homepage |
| Product-truth | PASS | Scene = `HeroSimPreview` / `investigation-canvas`; fixture = northline-ops-yield rows from `micro-ops-yield.ts` |
| Asset-provenance | PASS | Canonical FydellMark; no Linear assets |
| Similarity (restraint only) | PASS | Shared: calm density, hairline borders. Not shared: geometry, PM language, violet, figure labels |

## Screenshot evidence

| Viewport | File | Gate |
| --- | --- | --- |
| 1440×900 | `docs/screenshots/visual-pass/home-1440x900.png` | originality PASS |
| 1280×800 | `docs/screenshots/visual-pass/home-1280x800.png` | originality PASS |

## Product-truth inventory (homepage scenes)

| Scene | Component | Fixture | Interaction |
| --- | --- | --- | --- |
| Investigation canvas | `HeroSimPreview` | Northline production_runs rows | Filter + phase advance (read-only marketing) |
| Investigate crop | `HomeProductStory` | Same yield rows | Static crop |
| Revision delta | `HomeProductStory` | Curveball adaptation copy | Static |
| Inspectable claim | `EvidenceRail` + claim copy | Reporting note / HOLD_RECLASS | Static |
| Oral defense | `HomeProductStory` | Evidence-grounded question | Static |
| Work Receipt | `HomeProductStory` | Share/revoke states | Static |

## Exceptions

None.
