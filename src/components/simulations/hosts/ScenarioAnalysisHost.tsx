"use client";

import { useEffect, useMemo, useState } from "react";
import { AnalysisEngineView } from "@/components/simulations/analysis/AnalysisEngineView";
import { analyzeAttempt } from "@/lib/sim-engine/analysis/analysisEngine";
import { getScenario } from "@/lib/sim-engine/scenarios/catalog";
import { LocalStoragePersistenceAdapter } from "@/lib/sim-engine/adapters/persistence";
import type {
  AnalysisResult,
  SimulationAttempt,
  SimulationScenarioDefinition,
} from "@/lib/sim-engine/types";
import {
  buildStrongFixture,
  buildWeakFixture,
} from "@/lib/sim-engine/scenarios/solutions-engineer/fixtures";
import {
  buildDaStrongFixture,
  buildDaWeakFixture,
} from "@/lib/sim-engine/scenarios/data-analyst/fixtures";
import {
  buildIcStrongFixture,
  buildIcWeakFixture,
} from "@/lib/sim-engine/scenarios/implementation-consultant/fixtures";
import {
  buildTseStrongFixture,
  buildTseWeakFixture,
} from "@/lib/sim-engine/scenarios/technical-support/fixtures";
import {
  buildBsaStrongFixture,
  buildBsaWeakFixture,
} from "@/lib/sim-engine/scenarios/business-systems-analyst/fixtures";

function resolveFixture(
  scenario: SimulationScenarioDefinition,
  fixture: "strong" | "weak"
): SimulationAttempt {
  switch (scenario.metadata.roleKey) {
    case "data_analyst":
    case "bi_analyst":
      return fixture === "strong" ? buildDaStrongFixture(scenario) : buildDaWeakFixture(scenario);
    case "implementation_consultant":
      return fixture === "strong" ? buildIcStrongFixture(scenario) : buildIcWeakFixture(scenario);
    case "technical_support_engineer":
      return fixture === "strong" ? buildTseStrongFixture(scenario) : buildTseWeakFixture(scenario);
    case "business_systems_analyst":
      return fixture === "strong" ? buildBsaStrongFixture(scenario) : buildBsaWeakFixture(scenario);
    default:
      return fixture === "strong" ? buildStrongFixture(scenario) : buildWeakFixture(scenario);
  }
}

/**
 * Runs the analysis engine over one attempt and renders the result.
 *
 * A named fixture is used when the caller asks for a reference attempt. A real
 * attempt is loaded by id, or the most recent local attempt when no id is
 * given. Local attempts are a development store, not durable persistence.
 */
export function ScenarioAnalysisHost({
  scenarioId,
  attemptId,
  fixture,
}: {
  scenarioId: string;
  attemptId?: string;
  fixture?: string;
}) {
  const scenario = useMemo(() => getScenario(scenarioId), [scenarioId]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [source, setSource] = useState<"fixture" | "attempt" | null>(null);

  useEffect(() => {
    if (!scenario) return;

    let cancelled = false;
    void (async () => {
      let attempt: SimulationAttempt | null = null;
      let resolved: "fixture" | "attempt" = "attempt";

      if (fixture === "strong" || fixture === "weak") {
        attempt = resolveFixture(scenario, fixture);
        resolved = "fixture";
      } else if (attemptId) {
        const adapter = new LocalStoragePersistenceAdapter();
        attempt = await adapter.load(attemptId);
      } else {
        const adapter = new LocalStoragePersistenceAdapter();
        const ids = await adapter.list();
        const last = ids[ids.length - 1];
        if (last) attempt = await adapter.load(last);
      }

      if (!attempt) {
        attempt = resolveFixture(scenario, "strong");
        resolved = "fixture";
      }
      if (cancelled) return;
      setSource(resolved);
      setAnalysis(analyzeAttempt(scenario, attempt));
    })();

    return () => {
      cancelled = true;
    };
  }, [scenario, attemptId, fixture]);

  if (!scenario) {
    return <div className="p-8 text-[13px] text-[var(--fydell-risk)]">Unknown scenario</div>;
  }
  if (!analysis) {
    return <div className="p-8 text-[13px] text-[var(--text-tertiary)]">Loading analysis</div>;
  }
  return (
    <div>
      {source === "fixture" ? (
        <p className="mb-4 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-[12.5px] text-[var(--text-secondary)]">
          Reference attempt. This is a built-in example used to show what the
          analysis engine produces, not a candidate submission.
        </p>
      ) : null}
      <AnalysisEngineView analysis={analysis} />
    </div>
  );
}
