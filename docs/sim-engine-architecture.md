# Simulation Architecture Engine — Phases One–Four

## Status

All six `RoleKey` values have experimental lab scenarios on the strangler-fig engine. Live `WorkbenchRunner`, v2 scoring, `sim_session_events`, reports, and migrations were **not** modified.

## How to run

| Role | Lab URL |
|------|---------|
| SE | `/lab/sim/northstar-integration` |
| DA | `/lab/sim/q3-churn-investigation` |
| BI | `/lab/sim/q3-churn-investigation-bi` |
| IC | `/lab/sim/brightpath-launch-import` |
| TSE | `/lab/sim/green-status-page-incident` |
| BSA | `/lab/sim/ridgeline-executive-queue` |

Employer analysis: `/lab/sim/<scenarioId>/analysis` (`?fixture=strong|weak` or `?attempt=<id>`).

Tests: `npm run test:sim-engine`

## Phase Four — config-only polymorphism

BSA proves the engine can add a role primarily via **scenario configuration**, not a new RoleKey layout switch:

1. `workflow_rules` capability + `rulesWorkbench` config
2. `centerTabsForScenario` / `rightTabsForScenario` compose panels from capabilities + workbench configs
3. `ConfigDrivenSandbox` renders those tabs with shared workbench parts
4. BSA registers that config-driven sandbox (no `if (roleKey === "business_systems_analyst")` layout)

Layout helpers live in `src/lib/sim-engine/registry/workbenchLayout.ts`.

## Role coverage

| Role | Scenario | Sandbox |
|------|----------|---------|
| SE | northstar-integration | SolutionsEngineerSandbox |
| DA/BI | q3-churn-investigation (+bi) | DataAnalystSandbox |
| IC | brightpath-launch-import | ImplementationConsultantSandbox |
| TSE | green-status-page-incident | TechnicalSupportSandbox |
| BSA | ridgeline-executive-queue | **ConfigDrivenSandbox** |

## Validation

- `npm run test:sim-engine` — SE/DA/IC/TSE/BSA runtime + strong/weak divergence + layout polymorphism checks
- `npx tsc --noEmit`
- ESLint on touched files
- `npm run build`

## Limitations

- Deterministic personas (no LLM)
- localStorage persistence is **dev-only**
- Not wired into production `/sim/[sessionId]`
- Role-specific sandboxes (SE/DA/IC/TSE) remain; BSA shows the migration path toward config composition

## Next (post Phase Four)

1. Keep engine behind `SIM_ENGINE_ENABLED` / renderer selection
2. **Low-risk self-serve opt-in (shipped):** when `SIM_ENGINE_SELF_SERVE=1` and the slug maps via `legacy-slug-map`, `/simulations/start/[slug]` redirects to `/lab/sim/<id>` instead of creating a WorkbenchRunner session. Default remains WorkbenchRunner.
3. Lab index: `/lab/sim`
4. Later: migrate a production session path deliberately; compare telemetry; add Supabase persistence with migrations
