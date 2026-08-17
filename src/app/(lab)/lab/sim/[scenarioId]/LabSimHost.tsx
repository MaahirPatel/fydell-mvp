"use client";

import { ScenarioWorkbenchHost } from "@/components/simulations/hosts/ScenarioWorkbenchHost";

/**
 * The lab keeps a bare host for engine work. The workspace at
 * /app/employer/workbench is where simulations are actually run.
 */
export function LabSimHost({ scenarioId }: { scenarioId: string }) {
  return (
    <div className="h-[100dvh]">
      <ScenarioWorkbenchHost scenarioId={scenarioId} debug />
    </div>
  );
}
