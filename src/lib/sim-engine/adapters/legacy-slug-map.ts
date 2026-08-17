/**
 * Maps legacy micro-sim slugs → sim-engine catalog scenario ids.
 * Used only when SIM_ENGINE_SELF_SERVE opt-in is enabled, never the default
 * production path to WorkbenchRunner.
 */
export const LEGACY_SLUG_TO_ENGINE_SCENARIO: Record<string, string> = {
  "launch-day-import": "brightpath-launch-import",
  "green-status-page": "green-status-page-incident",
  "executive-queue": "ridgeline-executive-queue",
  // Engine-native ids also accepted for direct starts
  "northstar-integration": "northstar-integration",
  "q3-churn-investigation": "q3-churn-investigation",
  "q3-churn-investigation-bi": "q3-churn-investigation-bi",
  "brightpath-launch-import": "brightpath-launch-import",
  "green-status-page-incident": "green-status-page-incident",
  "ridgeline-executive-queue": "ridgeline-executive-queue",
};

export function resolveEngineScenarioId(legacyOrEngineSlug: string): string | null {
  return LEGACY_SLUG_TO_ENGINE_SCENARIO[legacyOrEngineSlug] ?? null;
}
