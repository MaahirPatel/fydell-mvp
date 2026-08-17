"use client";

import { useEffect } from "react";
import type { SimulationScenarioDefinition } from "@/lib/sim-engine/types";
import { SimulationRuntime } from "@/lib/sim-engine/runtime/simulationRuntime";
import { getRenderer, registerRenderer } from "@/lib/sim-engine/registry/rendererRegistry";
import { SolutionsEngineerSandbox } from "./sandboxes/SolutionsEngineerSandbox";
import { DataAnalystSandbox } from "./sandboxes/DataAnalystSandbox";
import { ImplementationConsultantSandbox } from "./sandboxes/ImplementationConsultantSandbox";
import { TechnicalSupportSandbox } from "./sandboxes/TechnicalSupportSandbox";
import { ConfigDrivenSandbox } from "./sandboxes/ConfigDrivenSandbox";
import { validateScenario } from "@/lib/sim-engine/validation/validateScenario";

let registered = false;
function ensureRegistry() {
  if (registered) return;
  registerRenderer({
    roleKey: "solutions_engineer",
    label: "Solutions Engineer Workbench",
    status: "EXPERIMENTAL",
    component: SolutionsEngineerSandbox,
  });
  registerRenderer({
    roleKey: "data_analyst",
    label: "Data Analyst Workbench",
    status: "EXPERIMENTAL",
    component: DataAnalystSandbox,
  });
  registerRenderer({
    roleKey: "bi_analyst",
    label: "BI Analyst Workbench",
    status: "EXPERIMENTAL",
    component: DataAnalystSandbox,
  });
  registerRenderer({
    roleKey: "implementation_consultant",
    label: "Implementation Consultant Workbench",
    status: "EXPERIMENTAL",
    component: ImplementationConsultantSandbox,
  });
  registerRenderer({
    roleKey: "technical_support_engineer",
    label: "Technical Support Workbench",
    status: "EXPERIMENTAL",
    component: TechnicalSupportSandbox,
  });
  registerRenderer({
    roleKey: "business_systems_analyst",
    label: "Business Systems Analyst Workbench (config-driven)",
    status: "EXPERIMENTAL",
    component: ConfigDrivenSandbox,
  });
  registered = true;
}

export function SimulationEngine({
  scenario,
  runtime,
  debug,
}: {
  scenario: SimulationScenarioDefinition;
  runtime: SimulationRuntime;
  debug?: boolean;
}) {
  useEffect(() => {
    ensureRegistry();
  }, []);

  ensureRegistry();

  const validation = validateScenario(scenario);
  if (!validation.ok) {
    return (
      <div className="p-6 text-[13px] text-[var(--fydell-risk)]">
        Scenario validation failed:
        <ul className="mt-2 list-disc pl-5">
          {validation.issues
            .filter((i) => i.level === "error")
            .map((i) => (
              <li key={i.code + i.message}>{i.message}</li>
            ))}
        </ul>
      </div>
    );
  }

  const result = getRenderer(scenario.metadata.roleKey, { allowExperimental: true });
  if (result.ok === false) {
    const reason = result.reason;
    return (
      <div className="p-6 text-[13px] text-[var(--text-secondary)]">
        No renderer registered for role <code>{scenario.metadata.roleKey}</code> ({reason}).
        All six RoleKeys have experimental renderers registered when allowExperimental is enabled.      </div>
    );
  }

  const Renderer = result.definition.component;
  return <Renderer runtime={runtime} debug={debug} />;
}
