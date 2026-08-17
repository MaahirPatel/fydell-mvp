"use client";

import { useEffect, useMemo, useState } from "react";
import { AnalysisEngineView } from "@/components/simulations/analysis/AnalysisEngineView";
import { analyzeAttempt } from "@/lib/sim-engine/analysis/analysisEngine";
import { getScenario } from "@/lib/sim-engine/scenarios/catalog";
import { LocalStoragePersistenceAdapter } from "@/lib/sim-engine/adapters/persistence";
import type { AnalysisResult, SimulationAttempt, SimulationScenarioDefinition } from "@/lib/sim-engine/types";
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

export function LabAnalysisHost({
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

  useEffect(() => {
    if (!scenario) return;

    let cancelled = false;
    void (async () => {
      let attempt: SimulationAttempt | null = null;
      if (fixture === "strong" || fixture === "weak") {
        attempt = resolveFixture(scenario, fixture);
      } else if (attemptId) {
        const adapter = new LocalStoragePersistenceAdapter();
        attempt = await adapter.load(attemptId);
      } else {
        const adapter = new LocalStoragePersistenceAdapter();
        const ids = await adapter.list();
        const last = ids[ids.length - 1];
        if (last) attempt = await adapter.load(last);
      }

      if (!attempt) attempt = resolveFixture(scenario, "strong");
      if (!cancelled) setAnalysis(analyzeAttempt(scenario, attempt));
    })();

    return () => {
      cancelled = true;
    };
  }, [scenario, attemptId, fixture]);

  if (!scenario) {
    return <div className="p-8 text-[13px] text-[var(--fydell-risk)]">Unknown scenario</div>;
  }
  if (!analysis) {
    return <div className="p-8 text-[13px] text-[var(--text-tertiary)]">Loading analysis…</div>;
  }
  return <AnalysisEngineView analysis={analysis} />;
}
