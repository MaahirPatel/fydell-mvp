import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { demoScenario } from "@/lib/sandbox-demo/catalog";
import type { DemoScenario } from "@/lib/sandbox-demo/catalog-types";

export type ScenarioParams = { params: Promise<{ key: string }> };

/** The playable scenario for a route, or a 404 for unknown and desktop-only keys. */
export async function scenarioFromParams({ params }: ScenarioParams): Promise<DemoScenario> {
  const { key } = await params;
  const scenario = demoScenario(key);
  if (!scenario) notFound();
  return scenario;
}

export async function scenarioMetadata(props: ScenarioParams, suffix: string): Promise<Metadata> {
  const { key } = await props.params;
  const scenario = demoScenario(key);
  if (!scenario) return { title: "Simulation not found" };
  return { title: `${scenario.title}: ${suffix}`, description: scenario.summary };
}
