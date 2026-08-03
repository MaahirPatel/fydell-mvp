# Phase 0 baseline (2026-08-02)

## Prompt verification

- Path: `docs/FYDELL_POLISH_PROMPT.md`
- Words: 29144
- Bytes: 200906
- SHA256: `D45819F271778C049C3BC5A36A9F5AB01B780FF557057F5768F307D9F74DB7BB`

## Commands

| Command | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run test:sims` | pass |
| `npm run test:copy` | pass |
| `npm run build` | pass |

## Known gaps (pre-existing)

- MicroRunner is quiz-shaped (Inspect/Decide/Explain).
- AuthForm still redirects to `/dashboard` and `/onboarding/employer` (broken).
- Employer layout redirects FDE accounts to `/app/fde` (redirect-only / missing).
- PRODUCT.md / DESIGN.md still describe finance Meridian / dark cinematic purple.
- No SimulationDefinitionV2, workbench modules, or scoring v2 yet.

## Sequencing correction applied

Vertical slice (one DA flagship through invite → workbench → events → score → report → receipt) is prioritized before full employer chrome and before migrating all 30 templates.
