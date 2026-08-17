"use client";

import { useMemo } from "react";
import { SimulationEngine } from "@/components/simulations/SimulationEngine";
import { SimulationRuntime } from "@/lib/sim-engine/runtime/simulationRuntime";
import { getScenario } from "@/lib/sim-engine/scenarios/catalog";

export function LabSimHost({ scenarioId }: { scenarioId: string }) {
  const scenario = getScenario(scenarioId);
  const runtime = useMemo(() => (scenario ? new SimulationRuntime(scenario) : null), [scenario]);

  if (!scenario || !runtime) {
    return (
      <div className="p-8 text-[13px] text-[var(--text-secondary)]">Unknown scenario: {scenarioId}</div>
    );
  }

  return (
    <div className="h-[100dvh]">
      <SimulationEngine scenario={scenario} runtime={runtime} debug />
    </div>
  );
}
