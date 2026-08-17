"use client";

import { ScenarioAnalysisHost } from "@/components/simulations/hosts/ScenarioAnalysisHost";

/**
 * The lab keeps a bare host for engine work. The workspace at
 * /app/employer/workbench/[id]/analysis is where analysis is read.
 */
export function LabAnalysisHost({
  scenarioId,
  attemptId,
  fixture,
}: {
  scenarioId: string;
  attemptId?: string;
  fixture?: string;
}) {
  return (
    <div className="p-8">
      <ScenarioAnalysisHost scenarioId={scenarioId} attemptId={attemptId} fixture={fixture} />
    </div>
  );
}
