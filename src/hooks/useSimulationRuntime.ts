"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { SimulationRuntime } from "@/lib/sim-engine/runtime/simulationRuntime";
import type { SimulationAttempt, SimulationScenarioDefinition } from "@/lib/sim-engine/types";
import { LocalStoragePersistenceAdapter } from "@/lib/sim-engine/adapters/persistence";
import { useSimulationTelemetry } from "./useSimulationTelemetry";

/**
 * Bind SimulationRuntime to React without per-keystroke store libraries.
 * Runtime instance is held in useState (not useRef) to satisfy React Compiler lint rules.
 */
export function useSimulationRuntime(
  scenario: SimulationScenarioDefinition,
  opts?: { persist?: boolean }
) {
  const [runtime] = useState(() => new SimulationRuntime(scenario));

  const subscribe = useCallback((onStoreChange: () => void) => runtime.subscribe(onStoreChange), [runtime]);
  const getSnapshot = useCallback(() => runtime.getAttempt(), [runtime]);
  const attempt = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const persistence = useMemo(() => new LocalStoragePersistenceAdapter(), []);

  const telemetry = useSimulationTelemetry({
    enabled: attempt.status === "IN_PROGRESS",
    onBlur: (reason) => runtime.recordBlur(reason),
    onPaste: (length) => runtime.recordPaste(length),
  });

  useEffect(() => {
    return () => runtime.dispose();
  }, [runtime]);

  // Dev persistence only, not production durability
  useEffect(() => {
    if (!opts?.persist) return;
    if (attempt.status === "NOT_STARTED") return;
    void persistence.save(attempt);
  }, [attempt, opts?.persist, persistence]);

  return {
    runtime,
    attempt,
    telemetry,
    start: () => runtime.start(),
    submit: () => runtime.submit(),
  };
}

export type { SimulationAttempt };
