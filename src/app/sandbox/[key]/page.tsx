import ScenarioBrief from "@/components/sandbox/demo/ScenarioBrief";
import { scenarioFromParams, scenarioMetadata, type ScenarioParams } from "./scenario-route";

export function generateMetadata(props: ScenarioParams) {
  return scenarioMetadata(props, "demo simulation");
}

export default async function ScenarioBriefPage(props: ScenarioParams) {
  const scenario = await scenarioFromParams(props);
  return <ScenarioBrief scenarioKey={scenario.key} />;
}
