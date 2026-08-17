"use client";

import { useMemo } from "react";
import { SimulationEngine } from "@/components/simulations/SimulationEngine";
import { SimulationRuntime } from "@/lib/sim-engine/runtime/simulationRuntime";
import { getScenario } from "@/lib/sim-engine/scenarios/catalog";

/**
 * The running workbench.
 *
 * This is loaded without server rendering on purpose. Starting an attempt
 * stamps identifiers and times, so rendering it on the server produces markup
 * the browser cannot reproduce, and the attempt itself lives in the browser.
 *
 * The runtime is created once per scenario so that moving between panels never
 * discards the attempt, and the host stays free of role knowledge: the renderer
 * registry resolves the surface from the RoleKey.
 */
export default function WorkbenchClient({
  scenarioId,
  debug,
}: {
  scenarioId: string;
  debug?: boolean;
}) {
  const scenario = getScenario(scenarioId);
  const runtime = useMemo(() => (scenario ? new SimulationRuntime(scenario) : null), [scenario]);

  if (!scenario || !runtime) {
    return (
      <div className="p-8 text-[13px] text-[var(--text-secondary)]">
        Unknown scenario: {scenarioId}
      </div>
    );
  }

  return <SimulationEngine scenario={scenario} runtime={runtime} debug={debug} />;
}
