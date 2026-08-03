# Role flagships (Phase 4B)

Six simulations deepened through the shared WorkbenchRunner + v2 adapter so each role feels like a distinct workbench—not one quiz skin.

Runtime: `src/components/sim/WorkbenchRunner.tsx`  
Adapter: `src/lib/simulations/v2/from-micro.ts` → candidate-safe view via `toV2CandidateView`

## Flagships

| Role | Slug | Workbench module |
|---|---|---|
| Data Analyst | `missing-delays` | `data_workbench` (interactive tables) |
| BI Analyst | `one-renewal-rate` | `data_workbench` + metric definition docs first |
| Solutions Engineer | `promise-or-product-fit` | `requirements_board` (requirements vs capabilities) |
| Implementation Consultant | `launch-day-import` | `cutover_plan` (ordered checklist) |
| Technical Support Engineer | `green-status-page` | `ticket_queue` (severity + detail) |
| Business Systems Analyst | `executive-queue` | `rules_panel` (expandable workflow rules) |

## Acceptance

For each flagship above:

1. Candidate session loads a `workbench` payload from GET `/api/sim/sessions/{id}` (no answer keys).
2. The role-specific module renders in WorkbenchRunner (not only generic docs + questions).
3. Role interactions emit allowed semantic events (`resource_opened`, `row_flagged`, `ticket_selected`, `step_toggled`, `rule_reviewed` as applicable).
4. Candidate can complete questions + stakeholder + submit.
5. Analyze path scores via v2 (`runV2Scoring` / `engine_version: "v2"`) with micro fallback only if needed.

Employer SimulationLibrary marks all six slugs with a **Flagship** badge.

## Out of scope

Deepening the remaining ~24 micro sims. Content stays as authored; only the shared runtime and adapter emit role-shaped modules for these six.
